const expect = require('expect.js');
const sinon = require('sinon');
const mocks = require('@snakesilk/testing/mocks');
const {createNode, readXMLFile} = require('@snakesilk/testing/xml');

const {Animation, Entity, Loader, Objects, UVCoords} = require('@snakesilk/engine');
const ObjectParser = require('../ObjectParser');

describe('ObjectParser', () => {
    let parser;

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
            let Entity;

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

describe('ObjectParser', () => {
  beforeEach(() => {

  });

  afterEach(function() {

  });

  describe('#getObjects', () => {
    let node, objects;

    before(() => {
      node = readXMLFile(__dirname + '/fixtures/character.xml').childNodes[0];
    });

    beforeEach(() => {
      mocks.Image.mock();

      const loader = new Loader();
      sinon.stub(loader.resourceLoader, 'loadImage', () => {
        return Promise.resolve(new mocks.Canvas())
      });

      const parser = new ObjectParser(loader, node);
      return parser.getObjects().then(_o => {objects = _o});
    });

    afterEach(() => {
      mocks.Image.restore();
    });

    it('returns an object indexed by object names', () => {
      expect(objects).to.be.an(Object);
      expect(objects).to.have.property('Megaman');
    });

    describe('parsed candidate', () => {
      let candidate;

      beforeEach(() => {
        candidate = objects['Megaman'];
      });

      it('contains reference to parsed node', () => {
        expect(candidate.node).to.be(node.querySelector('object[id=Megaman]'));
      });

      it('containes a constructor for object', () => {
        expect(candidate.constructor).to.be.a(Function);
      });

      describe('constructed instance', () => {
        let instance;

        beforeEach(() => {
          instance = new candidate.constructor();
        });

        it('is an Entity', () => {
          expect(instance).to.be.an(Entity);
        });

        it('contains animation router', () => {
          expect(instance.routeAnimation).to.be.a(Function);
          expect(instance.routeAnimation()).to.be('test-value-is-fubar');
        });

        ['idle', 'run', 'run-fire'].forEach(name => {
          it(`contains "${name}" animation`, () => {
            expect(instance.animations[name]).to.be.an(Animation);
          });
        });

        it('has default animation', () => {
            expect(instance.animations['__default'])
              .to.be(instance.animations['idle']);
        });

        it.skip('has default animation applied', () => {
          const uvs = instance.animations['__default'].getValue(0);
          expect(instance.model.geometry.faceVertexUvs[0][0]).to.eql(uvs[0]);
          expect(instance.model.geometry.faceVertexUvs[0][1]).to.eql(uvs[1]);
        });

        it.skip('should take out face indices properly', function() {
          const object = scene.world.getObject('json-index-only');
          expect(object.animators[0].indices).to.eql([0, 1, 2, 3, 4, 100, 112]);
          object = scene.world.getObject('range-index-star');
          expect(object.animators[0].indices).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
        });

        describe('Animations', () => {
          it.skip('have correct UV maps', () => {
            const uvs = instance.animations['idle'].getValue(0);
            expect(uvs).to.be.an(UVCoords);
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

          it('have group set to null if not specified', () => {
            expect(instance.animations['idle'].group).to.be(null);
          });

          it('have group set to string if specified', () => {
            expect(instance.animations['run'].group).to.be('run');
            expect(instance.animations['run-fire'].group).to.be('run');
          });
        });
      });
    });
  });

  describe.skip('#parseTextures', () => {
    let textures, character;

    it('should return an object indexed by texture names', () => {
      const texturesNode = getNode('textures');
      const parser = new ObjectParser(loaderMock);
      textures = parser.parseTextures(texturesNode);
      expect(textures).to.be.an(Object);
      expect(textures).to.have.property('moot');
      expect(textures).to.have.property('foo');
      expect(textures).to.have.property('bar');
    });

    it('should provide texture size', () => {
      expect(textures['moot'].size).to.eql({x: 256, y: 128});
      expect(textures['foo'].size).to.eql({x: 129, y: 256});
      expect(textures['bar'].size).to.eql({x: 64, y: 96});
    });

    it('should provide texture instances', () => {
      expect(textures['moot'].texture).to.be.a(THREE.Texture);
      expect(textures['foo'].texture).to.be.a(THREE.Texture);
      expect(textures['bar'].texture).to.be.a(THREE.Texture);
    });

    it('should have the first found texture as default', () => {
      expect(textures['__default']).to.be(textures['moot']);
    });

    it.skip('should load images', () => {
      expect(textures['moot'].texture.image.src).to.equal('moot.png');
    });
  });

  describe('Regression Tests', () => {
    it('only finds first hand object nodes', (done) => {
      const node = createNode(`<objects>
        <object id="CollidableName"/>

        <object id="UniqueName">
          <node1>
            <object id="CollidableName"/>
            <node2>
              <object id="CollidableName"/>
            </node2>
          </node1>
        </object>
      </objects>`);

      const parser = new ObjectParser(new Loader(), node);
      parser.getObjects().then(() => done()).catch(done);
    });
  });
});