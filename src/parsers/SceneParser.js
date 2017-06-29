const {Vector3} = require('three');

const {Entity, Scene, Traits} = require('@snakesilk/engine');

const {children, find, ensure} = require('../util/traverse');
const Parser = require('./Parser');
const CameraParser = require('./CameraParser');
const EventParser = require('./EventParser');
const ObjectParser = require('./ObjectParser');
const SequenceParser = require('./SequenceParser');
const TraitParser = require('./TraitParser');


function createClimbable()
{
    const object = new Entity();
    object.applyTrait(new Traits.Climbable());
    return object;
}

function createDeathZone()
{
    const object = new Entity();
    object.applyTrait(new Traits.DeathZone());
    return object;
}

function createSolid() {
    const object = new Entity();
    const solid = new Traits.Solid();
    solid.fixed = true;
    solid.obstructs = true;
    object.applyTrait(solid);
    return object;
}

const DEFAULT_POS = new Vector3(0, 0, 0);

const BEHAVIOR_MAP = {
    'climbables': createClimbable,
    'deathzones': createDeathZone,
    'solids': createSolid,
};

class SceneParser extends Parser
{
    constructor(loader, node)
    {
        ensure(node, 'scene');

        super(loader);

        this._node = node;
        this._scene = null;
        this._objects = {};
        this._bevahiorObjects = [];
        this._layoutObjects = [];
    }
    getBehavior(node)
    {
        const type = node.parentNode.tagName.toLowerCase();
        if (!BEHAVIOR_MAP[type]) {
            throw new Error('Behavior ' + type + ' not in behavior map');
        }
        const factory = BEHAVIOR_MAP[type];
        const rect = this.getRect(node);
        const instance = factory();
        instance.addCollisionRect(rect.w, rect.h);
        instance.position.x = rect.x;
        instance.position.y = rect.y;
        instance.position.z = 0;

        return {
            constructor: constructor,
            instance: instance,
            node: node,
        };
    }
    getScene()
    {
        if (!this._promise) {
            this._promise = this._parse()
            .then(scene => {
                scene.name = this._node.getAttribute('name');
                /*
                Perform update to "settle" world.
                This is done to prevent audio and other side effects from leaking out on scene start.

                For example, if an entity emits audio when landing after a jump, and placed on the ground in the world from start, the jump land event would be fired on the first frame.
                */
                scene.world.simulateTime(0);
                return scene;
            });
        }
        return this._promise;
    }
    _createObject(id)
    {
        return new (this._getObject(id)).constructor;
    }
    _getObject(id)
    {
        const resource = this.loader.resourceManager;
        if (this._objects[id]) {
            return this._objects[id];
        } else if (resource.has('object', id)) {
            return {constructor: resource.get('object', id)};
        }
        throw new Error(`Object "${id}" not defined.`);
    }
    _parse()
    {
        this._scene = new Scene();

        return Promise.all([
            this._parseAudio(),
            this._parseCamera(),
            this._parseEvents(),
            this._parseObjects(),
            this._parseBehaviors(),
            this._parseGravity(),
            this._parseSequences(),
        ]).then(() => {
            return this._parseLayout();
        }).then(() => {
            return this.loader.resourceLoader.complete();
        }).then(() => {
            return this._scene;
        });
    }
    _parseAudio()
    {
        const scene = this._scene;
        const nodes = find(this._node, 'audio > *');
        const tasks = [];
        for (let node, i = 0; node = nodes[i++];) {
            const id = this.getAttr(node, 'id');
            const task = this.getAudio(node).then(audio => {
                scene.audio.add(id, audio);
            });
            tasks.push(task);
        }
        return Promise.all(tasks);
    }
    _parseBehaviors()
    {
        const nodes = find(this._node, 'layout > behaviors > * > rect');
        const world = this._scene.world;
        for (let node, i = 0; node = nodes[i]; ++i) {
            const object = this.getBehavior(node);
            this._bevahiorObjects.push(object);
            world.addObject(object.instance);
        }
        return Promise.resolve();
    }
    _parseCamera()
    {
        const cameraNode = children(this._node, 'camera')[0];
        if (!cameraNode) {
            return;
        }

        const cameraParser = new CameraParser();
        return cameraParser.getCamera(cameraNode)
        .then(camera => {
            this._scene.camera = camera;
        });
    }
    _parseEvents()
    {
        this._parseGlobalEvents();

        const node = children(this._node, 'events')[0];
        if (!node) {
            return Promise.resolve();
        }

        const parser = new EventParser(this.loader, node);
        return parser.getEvents().then(events => {
            const scene = this._scene;
            events.forEach(event => {
                scene.events.bind(event.name, event.callback);
            });
        });
    }
    _parseGlobalEvents()
    {
        const eventsNode = children(this._node, 'events')[0];
        if (!eventsNode) {
            return;
        }
        const nodes = eventsNode.querySelectorAll('after > action, before > action');
        const scene = this._scene;
        for (let node, i = 0; node = nodes[i]; ++i) {
            const when = node.parentNode.tagName;
            const type = node.getAttribute('type');
            if (when === 'after' && type === 'goto-scene') {
                const id = node.getAttribute('id');
                scene.events.bind(scene.EVENT_END, () => {
                    this.loader.loadSceneByName(id).then(scene => {
                        this.loader.game.setScene(scene);
                    });
                })
            } else {
                throw new TypeError(`No mathing event for ${when} > ${type}`);
            }
        }
    }
    _parseGravity()
    {
        const node = children(this._node, 'gravity')[0];
        if (node) {
            const gravity = this.getVector2(node);
            this._scene.world.gravityForce.copy(gravity);
        }
        return Promise.resolve();
    }
    _parseLayout()
    {
        const objectNodes = find(this._node, 'layout > objects > object');
        const world = this._scene.world;
        for (let objectNode, i = 0; objectNode = objectNodes[i]; ++i) {
            const layoutObject = this._parseLayoutObject(objectNode);
            world.addObject(layoutObject.instance);
            this._layoutObjects.push(layoutObject);
        }
        return Promise.resolve();
    }
    _parseLayoutObject(node)
    {
        const objectId = node.getAttribute('id');
        const instanceId = node.getAttribute('instance-id');
        const object = this._getObject(objectId);
        const instance = new object.constructor;
        instance.id = instanceId;

        const direction = this.getInt(node, 'dir') || 1;
        const position = this.getPosition(node) || DEFAULT_POS;

        instance.direction.set(direction, 0);
        instance.position.copy(position);

        if (instance.model) {
            const scale = this.getFloat(node, 'scale') || 1;
            instance.model.scale.multiplyScalar(scale);
        }

        const traitNodes = node.getElementsByTagName('trait');
        if (traitNodes) {
            const traitParser = new TraitParser();
            const traits = [];
            for (let traitNode, i = 0; traitNode = traitNodes[i++];) {
                const Trait = traitParser.parseTrait(traitNode);
                const trait = new Trait;
                instance.applyTrait(trait);
            }
        }

        return {
            sourceNode: object.node,
            node: node,
            constructor: object.constructor,
            instance: instance,
        };
    }
    _parseObjects()
    {
        const nodes = children(this._node, 'objects');
        if (!nodes.length) {
            return Promise.resolve();
        }

        const tasks = [];
        for (let node, i = 0; node = nodes[i++];) {
            const parser = new ObjectParser(this.loader, node);
            const task = parser.getObjects().then(objects => {
                Object.assign(this._objects, objects);
            });
            tasks.push(task);
        }

        return Promise.all(tasks);
    }
    _parseSequences()
    {
        const parser = new SequenceParser();
        const node = children(this._node, 'sequences')[0];
        if (node) {
            const seq = this._scene.sequencer;
            parser.getSequences(node).forEach(item => {
                seq.addSequence(item.id, item.sequence);
            });
        }
    }
}

module.exports = SceneParser;