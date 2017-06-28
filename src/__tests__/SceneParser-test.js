const expect = require('expect.js');
const sinon = require('sinon');
const fs = require('fs');

const mocks = require('@snakesilk/testing/mocks');
const {readXMLFile} = require('@snakesilk/testing/xml');

const THREE = require('three');
const {Game, Loader, World} = require('@snakesilk/engine');
const SceneParser = require('../SceneParser');

describe('SceneParser', function() {
  let parser, node;

  before(() => {
    node = readXMLFile(__dirname + '/fixtures/scene.xml').childNodes[0];
  });

  beforeEach(function() {
    mocks.AudioContext.mock();
    mocks.Image.mock();

    const loader = new Loader();
    sinon.stub(loader.resourceLoader, 'loadImage', () => {
      return Promise.resolve(new mocks.Canvas())
    });

    sinon.stub(World.prototype, 'simulateTime');

    parser = new SceneParser(loader, node);
  });

  afterEach(function() {
    mocks.AudioContext.restore();
    mocks.Image.restore();

    World.prototype.simulateTime.restore();
  });

  describe('when instantiated', () => {
    describe('#getScene', () => {
      let scene;

      beforeEach(() => {
        return parser.getScene().then(_s => {scene = _s});
      });

      it('creates objects with valid positions', function() {
        scene.world.objects.forEach(function(object) {
          expect(object.position).to.be.a(THREE.Vector3);
          expect(object.position.x).to.be.a('number');
          expect(object.position.y).to.be.a('number');
          expect(object.position.z).to.be.a('number');
        });
      });

      it.skip('creates sane textures', () => {
        expect(object.model.material.map).to.be.a(THREE.Texture);
      });

      it('should not put any objects in scene without texture ', function() {
        scene.world.scene.children.forEach(function(mesh) {
          if (mesh.material && !mesh.material.map) {
            console.error('Mesh missing texture', mesh);
          }
        });
      });

      describe('parsed Camera', function() {
        it('have smoothing', function() {
          expect(scene.camera.smoothing).to.equal(13.5);
        });

        it('have paths', function() {
          const paths = scene.camera.paths;
          expect(paths).to.have.length(3);
          expect(paths[0].window[0]).to.eql({x: 0, y: -208, z: 0});
          expect(paths[0].window[1]).to.eql({x: 2048, y: 0, z: 0});
          expect(paths[0].constraint[0]).to.eql({x: 180, y: -120, z: 150});
          expect(paths[0].constraint[1]).to.eql({x: 1920, y: -120, z: 150});
        });
      });

      describe('Object Parsing', function() {
        it('should name object', function() {
          const object = scene.world.getObject('my-test-object');
          expect(object.id).to.equal('my-test-object');
          expect(object.name).to.equal('test');
        });
      });

      it.skip('should parse checkpoints', function() {
        expect(scene.checkPoints).to.have.length(3);
        expect(scene.checkPoints[0]).to.eql({pos: {x: 136, y: -165}, radius: 100});
        expect(scene.checkPoints[1]).to.eql({pos: {x: 1920, y: -661}, radius: 100});
        expect(scene.checkPoints[2]).to.eql({pos: { x: 4736, y: -1109}, radius: 13});
      });
    });
  });
});
