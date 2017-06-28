const expect = require('expect.js');
const sinon = require('sinon');
const {createNode} = require('@snakesilk/testing/xml');

const {Loader, Objects} = require('@snakesilk/engine');
const ObjectParser = require('../ObjectParser');

describe('ObjectParser', function() {
    let parser, Entity;

    [
        'Airman',
        'Crashman',
        'Flashman',
        'Heatman',
        'Megaman',
        'Metalman',

        'ChangkeyMaker',
        'Shotman',
        'SniperArmor',
        'SniperJoe',
        'Telly',
    ].forEach(name => {
        const id = name + '-id';
        const xmlString = `<objects>
             <object type="character" source="${name}" id="${id}">
        </objects>`;

        describe(`when parsing ${xmlString}`, () => {
            beforeEach(() => {
                const node = createNode(xmlString);
                parser = new ObjectParser(new Loader(), node);
                return parser.getObjects()
                    .then(objects => {
                        Entity = objects[id].constructor;
                    });
            });

            it(`produces a ${name} entity`, () => {
              expect(Entity).to.be.a(Function);
            });

            it.skip(`produces a ${name} entity`, () => {
              expect(new Entity()).to.be.a(Objects[name]);
            });
        });
    });
});

describe.skip('ObjectParser', function() {
  let loaderMock;

  beforeEach(function() {
    loaderMock = {
      resource: new ResourceManager(),
    };

    global.Image = sinon.spy(function() {
      this.src = '';
      this.onload = undefined;
    });
  });

  afterEach(function() {
    delete global.Image;
  });

  describe('#parse', function() {
    let objects, character;

    it('should return an object indexed by object names', function() {
      const objectsNode = getNode('character');
      const parser = new ObjectParser(loaderMock);
      objects = parser.parse(objectsNode);
      expect(objects).to.be.an(Object);
      expect(objects).to.have.property('Megaman');
    });

    it('should provide a constructor for object', function() {
      character = new objects['Megaman'];
      expect(character).to.be.a(Engine.objects.Character);
    });

    context('Animations', function() {
      it('should have correct UV maps', function() {
        expect(character.animations['idle']).to.be.an(Engine.Animator.Animation);
        const uvs = character.animations['idle'].getValue(0);
        expect(uvs).to.be.an(Engine.UVCoords);
        expect(uvs[0][0].x).to.equal(0);
        expect(uvs[0][0].y).to.equal(1);
        expect(uvs[0][1].x).to.equal(0);
        expect(uvs[0][1].y).to.equal(0.8125);
        expect(uvs[0][2].x).to.equal(0.1875);
        expect(uvs[0][2].y).to.equal(1);

        expect(uvs[1][0].x).to.equal(0);
        expect(uvs[1][0].y).to.equal(0.8125);
        expect(uvs[1][1].x).to.equal(0.1875);
        expect(uvs[1][1].y).to.equal(0.8125);
        expect(uvs[1][2].x).to.equal(0.1875);
        expect(uvs[1][2].y).to.equal(1);
      });

      it('should have group set to undefined if not specified', function() {
        expect(character.animations['idle'].group).to.be(undefined);
      });

      it('should have group set to string if specified', function() {
        expect(character.animations['run'].group).to.be('run');
        expect(character.animations['run-fire'].group).to.be('run');
      });
    });

    it('should have default animation on construction', function() {
      const uvs = character.animations['__default'].getValue(0);
      expect(character.model.geometry.faceVertexUvs[0][0]).to.eql(uvs[0]);
      expect(character.model.geometry.faceVertexUvs[0][1]).to.eql(uvs[1]);
    });

    it('should parse animation router', function() {
      expect(character.routeAnimation()).to.be('test-value-is-fubar');
    });
  });
  describe('#parseAnimations', function() {
    const textureMock = {size: {x: 128, y: 128}};

    context('when animation group node has size specified', function() {
      it('should use size from animation group node', function() {
        const node = createNode('<animations w="48" h="44">' +
          '<animation id="moot">' +
            '<frame x="32" y="16"/>' +
          '</animation>' +
        '</animations>');
        const parser = new ObjectParser();
        const frameNode = node.childNodes[0];
        const animation = parser.parseAnimation(frameNode, textureMock);
        expect(animation.getValue()).to.eql(new Engine.UVCoords(
          {x: 32, y: 16},
          {x: 48, y: 44},
          {x: 128, y: 128}));
      });
    });

    context('when animation node has size specified', function() {
      it('should use size from animation node', function() {
        const node = createNode('<animations w="48" h="48">' +
          '<animation id="moot" w="24" h="22">' +
            '<frame x="32" y="16"/>' +
          '</animation>' +
        '</animations>');
        const parser = new ObjectParser();
        const frameNode = node.childNodes[0];
        const animation = parser.parseAnimation(frameNode, textureMock);
        expect(animation.getValue()).to.eql(new Engine.UVCoords(
          {x: 32, y: 16},
          {x: 24, y: 22},
          {x: 128, y: 128}));
      });
    });

    context('when frame has size specified', function() {
      it('should use size from frame', function() {
        const node = createNode('<animations w="48" h="48">' +
          '<animation id="moot" w="24" h="22">' +
            '<frame x="32" y="16" w="12" h="11"/>' +
          '</animation>' +
        '</animations>');
        const parser = new ObjectParser();
        const frameNode = node.childNodes[0];
        const animation = parser.parseAnimation(frameNode, textureMock);
        expect(animation.getValue()).to.eql(new Engine.UVCoords(
          {x: 32, y: 16},
          {x: 12, y: 11},
          {x: 128, y: 128}));
      });
    });

    context('when wrapped in <loop>', function() {
      it('should duplicate a single frame', function() {
        const node = createNode('<animations w="48" h="48">' +
          '<animation id="moot" w="24" h="22">' +
            '<loop count="13">' +
              '<frame x="32" y="16" duration="1"/>' +
            '</loop>' +
          '</animation>' +
        '</animations>');
        const parser = new ObjectParser();
        const animation = parser.parseAnimation(node.childNodes[0], textureMock);
        expect(animation.length).to.be(13);
      });

      it('should duplicate mixed frames', function() {
        const node = createNode('<animations w="48" h="48">' +
          '<animation id="moot" w="20" h="10">' +
            '<frame x="1" y="1" duration="13"/>' +
            '<frame x="1" y="1" duration="19"/>' +
            '<loop count="2">' +
              '<frame x="1" y="1" duration="1"/>' +
              '<frame x="2" y="2" duration="2"/>' +
            '</loop>' +
            '<frame x="3" y="3" duration="16"/>' +
            '<frame x="4" y="4" duration="8"/>' +
            '<loop count="3">' +
              '<frame x="5" y="5" duration="4"/>' +
            '</loop>' +
            '<frame x="6" y="6" duration="8"/>' +
          '</animation>' +
        '</animations>');
        const parser = new ObjectParser();
        const animation = parser.parseAnimation(node.childNodes[0], textureMock);
        const frames = animation.timeline.frames;
        expect(animation.length).to.be(12);
        let f = 0;
        expect(frames[f++].duration).to.be(13);
        expect(frames[f++].duration).to.be(19);
        expect(frames[f++].duration).to.be(1);
        expect(frames[f++].duration).to.be(2);
        expect(frames[f++].duration).to.be(1);
        expect(frames[f++].duration).to.be(2);
        expect(frames[f++].duration).to.be(16);
        expect(frames[f++].duration).to.be(8);
        expect(frames[f++].duration).to.be(4);
        expect(frames[f++].duration).to.be(4);
        expect(frames[f++].duration).to.be(4);
        expect(frames[f++].duration).to.be(8);
      });
    });

    it('should parse an animation node', function() {
      const node = getNode('animations');
      const parser = new ObjectParser();
      const animations = parser.parseAnimations(node,
                                              {foo: {size: {x: 256, y: 256}}});
      const animation = animations['__default'];
      expect(animation).to.be.a(Engine.Animator.Animation);
      expect(animation.id).to.equal('idle');
      expect(animation.length).to.equal(2);
      const uvs = animation.getValue(0);
      expect(uvs).to.be.an(Engine.UVCoords);
      expect(uvs[0][0].x).to.equal(0);
      expect(uvs[0][0].y).to.equal(1);
      expect(uvs[0][1].x).to.equal(0);
      expect(uvs[0][1].y).to.equal(0.8125);
      expect(uvs[0][2].x).to.equal(0.1875);
      expect(uvs[0][2].y).to.equal(1);

      expect(uvs[1][0].x).to.equal(0);
      expect(uvs[1][0].y).to.equal(0.8125);
      expect(uvs[1][1].x).to.equal(0.1875);
      expect(uvs[1][1].y).to.equal(0.8125);
      expect(uvs[1][2].x).to.equal(0.1875);
      expect(uvs[1][2].y).to.equal(1);
    });
  });
  describe('#parseTextures', function() {
    let textures, character;

    it('should return an object indexed by texture names', function() {
      const texturesNode = getNode('textures');
      const parser = new ObjectParser(loaderMock);
      textures = parser.parseTextures(texturesNode);
      expect(textures).to.be.an(Object);
      expect(textures).to.have.property('moot');
      expect(textures).to.have.property('foo');
      expect(textures).to.have.property('bar');
    });

    it('should provide texture size', function() {
      expect(textures['moot'].size).to.eql({x: 256, y: 128});
      expect(textures['foo'].size).to.eql({x: 129, y: 256});
      expect(textures['bar'].size).to.eql({x: 64, y: 96});
    });

    it('should provide texture instances', function() {
      expect(textures['moot'].texture).to.be.a(THREE.Texture);
      expect(textures['foo'].texture).to.be.a(THREE.Texture);
      expect(textures['bar'].texture).to.be.a(THREE.Texture);
    });

    it('should have the first found texture as default', function() {
      expect(textures['__default']).to.be(textures['moot']);
    });

    it.skip('should load images', function() {
      expect(textures['moot'].texture.image.src).to.equal('moot.png');
    });
  });
});
