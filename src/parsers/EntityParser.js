const {Vector2, DoubleSide, MeshPhongMaterial} = require('three');
const {Animation, UVAnimator, Entity, UVCoords} = require('@snakesilk/engine');

const {children, ensure, find} = require('../util/traverse');
const Parser = require('./Parser');
const AnimationParser = require('./AnimationParser');
const EventParser = require('./EventParser');
const FaceParser = require('./FaceParser');
const SequenceParser = require('./SequenceParser');
const TraitParser = require('./TraitParser');

const DEFAULT = '__default';

class Context {
    constructor() {
        this.animations = new Map();
        this.textures = new Map();
    }

    getTexture(id) {
        if (id) {
            if (this.textures.has(id)) {
                return this.textures.get(id);
            } else {
                console.error(this.textures);
                throw new Error(`Texture "${id}" not defined.`);
            }
        } else if (this.textures.has(DEFAULT)) {
            return this.textures.get(DEFAULT);
        } else {
            throw new Error('Default texture not defined');
        }
    }
}

class EntityParser extends Parser
{
    constructor(loader) {
        super(loader);

        this.animationParser = new AnimationParser(loader);
        this.eventParser = new EventParser(loader);
        this.faceParser = new FaceParser(loader);
        this.traitParser = new TraitParser(loader);
    }

    getObjects(node) {
        ensure(node, 'entities');

        const context = new Context();

        return this.parseTextures(node, context)
        .then(() => this.parseAnimations(node, context))
        .then(() => this.parseEntities(node, context));
    }

    createConstructor(blueprint) {
        if (!blueprint.textures.has(DEFAULT)) {
            console.warn('No default texture on blueprint', blueprint.id);
        }

        const constructor = this.createObject(blueprint.id, blueprint.constructor, function objectConstructor() {
            if (blueprint.geometries.length) {
                this.geometry = blueprint.geometries[0].clone();
                this.material = new MeshPhongMaterial({
                    depthWrite: false,
                    map: this.textures.has(DEFAULT) && this.textures.get(DEFAULT).texture,
                    side: DoubleSide,
                    transparent: true,
                });
            }

            blueprint.constructor.call(this);

            this.name = blueprint.id;

            blueprint.traits.forEach(Trait => {
                this.applyTrait(new Trait());
            });

            blueprint.animators.forEach(anim => {
                const animator = anim.clone();
                animator.addGeometry(this.geometry);
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

            /* Run initial update of all UV maps. */
            this.updateAnimators(0);
        });

        constructor.prototype.animations = blueprint.animations;
        constructor.prototype.audio = blueprint.audio;
        constructor.prototype.textures = blueprint.textures;

        if (blueprint.animationRouter !== undefined) {
            constructor.prototype.routeAnimation = blueprint.animationRouter;
        }

        return constructor;
    }

    getConstructor(type, source) {
        if (type === 'character') {
            const Character = this.loader.entities.resolve(source);
            return Character;
        }
        return Entity;
    }

    parseAnimations(node, context) {
        const {animations} = context;
        const nodes = find(node, 'animations > animation');
        for (let i = 0, node; node = nodes[i++];) {
            const textureId = node.parentNode.getAttribute('texture');
            const texture = context.getTexture(textureId);
            const animation = this.animationParser.parseAnimation(node, texture.size);
            animations.set(animation.id || DEFAULT, animation);

            if (!animations.has(DEFAULT)) {
                animations.set(DEFAULT, animation);
            }
        }

        return Promise.resolve();
    }

    parseEntities(node, context) {
        ensure(node, 'entities');

        const entityNodes = children(node, 'entity');
        const tasks = [];
        const entities = {};
        for (let i = 0, node; node = entityNodes[i++];) {
            const id = node.getAttribute('id');
            if (entities[id]) {
                console.error(node.outerHTML);
                throw new Error(`Object id "${id}" already defined`);
            }

            entities[id] = {
                node,
                constructor: null,
            };

            const task = this.parseEntity(node, context).then(blueprint => {
                return this.createConstructor(blueprint);
            }).then(constructor => {
                entities[id].constructor = constructor;
            });

            tasks.push(task);
        }
        return Promise.all(tasks).then(() => {
            return entities;
        });
    }

    parseEntity(entityNode, {animations, textures})
    {
        const type = entityNode.getAttribute('type');
        const source = entityNode.getAttribute('source');

        const constructor = this.getConstructor(type, source);
        const entityId = entityNode.getAttribute('id');

        const blueprint = {
            constructor,
            animations,
            textures,
            id: entityId,
            audio: null,
            animators: [],
            events: null,
            geometries: [],
            sequences: null,
            traits: [],
        };

        const geometryNodes = entityNode.getElementsByTagName('geometry');
        const textNodes = entityNode.getElementsByTagName('text');
        if (geometryNodes.length) {
            for (let i = 0, geometryNode; geometryNode = geometryNodes[i]; ++i) {
                const geometry = this.getGeometry(geometryNode);
                blueprint.geometries.push(geometry);

                const faceNodes = geometryNode.getElementsByTagName('face');
                const animators = this.faceParser.parseAnimators(faceNodes, animations);

                if (animators.length) {
                    blueprint.animators.push(...animators);
                } else if(animations.has(DEFAULT)) {
                    const animator = new UVAnimator();
                    animator.setAnimation(animations.get(DEFAULT));
                    blueprint.animators.push(animator);
                }
            }
        } else if (textNodes.length) {
            const node = textNodes[0];
            const font = node.getAttribute('font');
            const string = node.textContent;
            const text = this.loader.resourceManager.get('font', font)(string);

            blueprint.geometries.push(text.getGeometry());
            blueprint.textures = new Map().set(DEFAULT, {
                id: entityId,
                texture: text.getTexture(),
            });
        }

        return Promise.all([
            this.parseEntityAnimationRouter(entityNode).then(router => {
                if (router) {
                    blueprint.animationRouter = router;
                }
            }),
            this.parseEntityCollision(entityNode).then(collision => {
                blueprint.collision = collision;
            }),
            this.parseEntityAudio(entityNode).then(audio => {
                blueprint.audio = audio;
            }),
            this.parseEntityEvents(entityNode).then(events => {
                blueprint.events = events;
            }),
            this.parseEntityTraits(entityNode, blueprint),
            this.parseEntitySequences(entityNode).then(sequences => {
                blueprint.sequences = sequences;
            }),
        ]).then(() => {
            return blueprint;
        });
    }

    parseEntityAnimationRouter(entityNode)
    {
        const node = entityNode.getElementsByTagName('animation-router')[0];
        if (node) {
            let animationRouter;
            eval(node.textContent);
            if (typeof animationRouter === "function") {
                return Promise.resolve(animationRouter);
            }
        }
        return Promise.resolve(null);
    }

    parseEntityAudio(entityNode) {
        const tasks = [];
        const audioDef = {};
        const audioNodes = entityNode.querySelectorAll('audio > *');
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

    parseEntityCollision(entityNode) {
        const collisionZones = [];
        const collisionNode = entityNode.getElementsByTagName('collision')[0];
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

    parseEntityEvents(entityNode) {
        ensure(entityNode, 'entity');

        const eventsNode = entityNode.querySelector('events');
        if (eventsNode) {
            return this.eventParser.getEvents(eventsNode)
            .then(({events}) => events);
        }
        else {
            return Promise.resolve([]);
        }
    }

    parseEntityTraits(node, blueprint) {
        const traitsNodes = children(node, 'traits');
        [...traitsNodes].forEach(node => {
            const traits = this.traitParser.parseTraits(node);
            blueprint.traits.push(...traits);
        });
    }

    parseEntitySequences(entityNode) {
        const parser = new SequenceParser();
        const node = entityNode.querySelector('sequences');
        if (node) {
            const sequences = parser.getSequences(node);
            return Promise.resolve(sequences);
        } else {
            return Promise.resolve([]);
        }
    }

    parseTextures(node, {textures}) {
        const nodes = node.querySelectorAll('textures > texture');
        for (let node, i = 0; node = nodes[i++];) {
            const textureId = node.getAttribute('id') || DEFAULT;

            textures.set(textureId, {
                id: textureId,
                texture: this.getTexture(node),
                size: this.getVector2(node, 'w', 'h'),
            });

            if (!textures.has(DEFAULT)) {
                textures.set(DEFAULT, textures.get(textureId));
            }
        }

        return Promise.resolve();
    }
}

module.exports = EntityParser;
