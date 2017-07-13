const {Vector2, DoubleSide, MeshPhongMaterial} = require('three');
const {Animation, UVAnimator, Entity, Objects, UVCoords} = require('@snakesilk/engine');

const {children, find} = require('../util/traverse');
const Parser = require('./Parser');
const AnimationParser = require('./AnimationParser');
const EventParser = require('./EventParser');
const FaceParser = require('./FaceParser');
const SequenceParser = require('./SequenceParser');
const TraitParser = require('./TraitParser');

class ObjectParser extends Parser
{
    constructor(loader, node)
    {
        if (!node || node.tagName !== 'objects') {
            throw new TypeError('Node not <objects>');
        }

        super(loader);

        this.faceParser = new FaceParser(this.loader);

        this._node = node;

        this._animations = null;
        this._textures = null;
    }
    getObjects()
    {
        if (!this._promise) {
            this._promise =  this._parse();
        }
        return this._promise;
    }
    _createConstructor(blueprint)
    {
        if (!blueprint.textures['__default']) {
            console.warn('No default texture on blueprint', blueprint.id);
        }

        const constructor = this.createObject(blueprint.id, blueprint.constructor, function objectConstructor() {
            if (blueprint.geometries.length) {
                this.geometry = blueprint.geometries[0].clone();
                this.material = new MeshPhongMaterial({
                    depthWrite: false,
                    map: this.textures['__default'] && this.textures['__default'].texture,
                    side: DoubleSide,
                    transparent: true,
                });
            }

            blueprint.constructor.call(this);

            this.name = blueprint.id;

            blueprint.traits.forEach(Trait => {
                this.applyTrait(new Trait());
            });

            /* Run initial update of all UV maps. */
            blueprint.animators.forEach(anim => {
                const animator = anim.clone();
                animator.addGeometry(this.geometry);
                animator.update();
                this.animators.push(animator);
            });

            blueprint.collision.forEach(coll => {
                if (coll.r) {
                    this.addCollisionZone(coll.r, coll.x, coll.y);
                } else {
                    this.addCollisionRect(coll.w, coll.h, coll.x, coll.y);
                }
            });

            blueprint.events.forEach(event => {
                this.events.bind(event.name, event.callback);
            });

            blueprint.sequences.forEach(seq => {
                this.sequencer.addSequence(seq.id, seq.sequence);
            });
        });

        constructor.prototype.animations = blueprint.animations;
        constructor.prototype.audio = blueprint.audio;
        constructor.prototype.textures = blueprint.textures;

        if (blueprint.animationRouter !== undefined) {
            constructor.prototype.routeAnimation = blueprint.animationRouter;
        }

        return constructor;
    }
    _getConstructor(type, source)
    {
        if (type === 'character') {
            const Character = this.loader.entities.resolve(source);
            return Character;
        }
        return Entity;
    }
    _getTexture(id)
    {
        if (id) {
            if (this._textures[id]) {
                return this._textures[id];
            } else {
                console.error(this._textures);
                throw new Error('Texture "' + id + '" not defined');
            }
        } else if (this._textures['__default']) {
            return this._textures['__default'];
        } else {
            throw new Error('Default texture not defined');
        }
    }
    _parse()
    {
        return this._parseTextures().then(textures => {
            this._textures = textures;
            return this._parseAnimations();
        }).then(animations => {
            this._animations = animations;
            return this._parseObjects();
        });
    }
    _parseAnimations()
    {
        const nodes = find(this._node, 'animations > animation');
        const animationParser = new AnimationParser();

        const animations = {
            __default: undefined,
        };

        for (let i = 0, node; node = nodes[i++];) {
            const textureId = node.parentNode.getAttribute('texture');
            const texture = this._getTexture(textureId);
            const animation = animationParser.parseAnimation(node, texture.size);
            animations[animation.id || '__default'] = animation;
            if (animations['__default'] === undefined) {
                animations['__default'] = animation;
            }
        }

        return Promise.resolve(animations);
    }
    _parseObjects()
    {
        const objectNodes = children(this._node, 'object');

        const tasks = [];
        const objects = {};
        for (let i = 0, node; node = objectNodes[i++];) {
            const id = node.getAttribute('id');
            if (objects[id]) {
                console.error(node.outerHTML);
                throw new Error(`Object id "${id}" already defined`);
            }

            objects[id] = {
                node,
                constructor: null,
            };

            const task = this._parseObject(node).then(blueprint => {
                return this._createConstructor(blueprint);
            }).then(constructor => {
                objects[id].constructor = constructor;
            });

            tasks.push(task);
        }
        return Promise.all(tasks).then(() => {
            return objects;
        });
    }
    _parseObject(objectNode)
    {
        const type = objectNode.getAttribute('type');
        const source = objectNode.getAttribute('source');

        const constructor = this._getConstructor(type, source);
        const objectId = objectNode.getAttribute('id');

        const animations = this._animations;
        const textures = this._textures;

        const blueprint = {
            id: objectId,
            constructor: constructor,
            audio: null,
            animations: animations,
            animators: [],
            events: null,
            geometries: [],
            sequences: null,
            textures: textures,
            traits: null,
        };

        const geometryNodes = objectNode.getElementsByTagName('geometry');
        const textNodes = objectNode.getElementsByTagName('text');
        if (geometryNodes.length) {
            for (let i = 0, geometryNode; geometryNode = geometryNodes[i]; ++i) {
                const geometry = this.getGeometry(geometryNode);
                blueprint.geometries.push(geometry);

                const faceNodes = geometryNode.getElementsByTagName('face');
                const animators = this.faceParser.parseAnimators(faceNodes, animations);

                if (animators.length) {
                    blueprint.animators.push(...animators);
                } else if(animations['__default']) {
                    const animator = new UVAnimator();
                    animator.setAnimation(animations['__default']);
                    animator.update();
                    blueprint.animators.push(animator);
                }
            }
        } else if (textNodes.length) {
            const node = textNodes[0];
            const font = node.getAttribute('font');
            const string = node.textContent;
            const text = this.loader.resourceManager.get('font', font)(string);
            blueprint.geometries.push(text.getGeometry());
            blueprint.textures = {__default: {texture: text.getTexture()}};
        }

        return Promise.all([
            this._parseObjectAnimationRouter(objectNode).then(router => {
                if (router) {
                    blueprint.animationRouter = router;
                }
            }),
            this._parseObjectCollision(objectNode).then(collision => {
                blueprint.collision = collision;
            }),
            this._parseObjectAudio(objectNode).then(audio => {
                blueprint.audio = audio;
            }),
            this._parseObjectEvents(objectNode).then(events => {
                blueprint.events = events;
            }),
            this._parseObjectTraits(objectNode).then(traits => {
                blueprint.traits = traits;
            }),
            this._parseObjectSequences(objectNode).then(sequences => {
                blueprint.sequences = sequences;
            }),
        ]).then(() => {
            return blueprint;
        });
    }
    _parseObjectAnimationRouter(objectNode)
    {
        const node = objectNode.getElementsByTagName('animation-router')[0];
        if (node) {
            let animationRouter;
            eval(node.textContent);
            if (typeof animationRouter === "function") {
                return Promise.resolve(animationRouter);
            }
        }
        return Promise.resolve(null);
    }
    _parseObjectAudio(objectNode)
    {
        const tasks = [];
        const audioDef = {};
        const audioNodes = objectNode.querySelectorAll('audio > *');
        for (let audioNode, i = 0; audioNode = audioNodes[i++];) {
            const task = this.getAudio(audioNode)
                .then(audio => {
                    const id = this.getAttr(audioNode, 'id');
                    audioDef[id] = audio;
                });
            tasks.push(task);
        }
        return Promise.all(tasks).then(() => {
            return audioDef;
        });
    }
    _parseObjectCollision(objectNode)
    {
        const collisionZones = [];
        const collisionNode = objectNode.getElementsByTagName('collision')[0];
        if (collisionNode) {
            const collNodes = collisionNode.getElementsByTagName('*');
            for (let collNode, i = 0; collNode = collNodes[i++];) {
                const type = collNode.tagName;
                if (type === 'rect') {
                    collisionZones.push(this.getRect(collNode));
                } else if (type === 'circ') {
                    collisionZones.push({
                        x: this.getFloat(collNode, 'x') || 0,
                        y: this.getFloat(collNode, 'y') || 0,
                        r: this.getFloat(collNode, 'r'),
                    });
                } else {
                    throw new TypeError('No collision type "' + type + '"');
                }
            }
        }
        return Promise.resolve(collisionZones);
    }
    _parseObjectEvents(objectNode)
    {
        const eventsNode = objectNode.querySelector('events');
        if (eventsNode) {
            const parser = new EventParser(this.loader, eventsNode);
            return parser.getEvents();
        }
        else {
            return Promise.resolve([]);
        }
    }
    _parseObjectTraits(objectNode)
    {
        const traits = [];
        const traitParser = new TraitParser(this.loader);
        const traitsNode = objectNode.getElementsByTagName('traits')[0];
        if (traitsNode) {
            const traitNodes = traitsNode.getElementsByTagName('trait');
            for (let traitNode, i = 0; traitNode = traitNodes[i++];) {
                traits.push(traitParser.parseTrait(traitNode));
            }
        }
        return Promise.resolve(traits);
    }
    _parseObjectSequences(objectNode)
    {
        const parser = new SequenceParser();
        const node = objectNode.querySelector('sequences');
        if (node) {
            const sequences = parser.getSequences(node);
            return Promise.resolve(sequences);
        } else {
            return Promise.resolve([]);
        }
    }
    _parseTextures()
    {
        const nodes = this._node.querySelectorAll('textures > texture');
        const textures = {
            __default: undefined,
        };
        for (let node, i = 0; node = nodes[i++];) {
            const textureId = node.getAttribute('id') || '__default';
            textures[textureId] = {
                id: textureId,
                texture: this.getTexture(node),
                size: this.getVector2(node, 'w', 'h'),
            };
            if (textures['__default'] === undefined) {
                textures['__default'] = textures[textureId];
            }
        }
        return Promise.resolve(textures);
    }
}

module.exports = ObjectParser;
