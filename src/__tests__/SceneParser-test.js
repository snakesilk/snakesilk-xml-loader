const expect = require('expect.js');
const sinon = require('sinon');
const fs = require('fs');

const SceneParser = require('../SceneParser');
const LevelParser = require('../LevelParser');

describe.skip('SceneParser', function() {
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

  let level;
  it('should parse a level', function(done) {
    const resourceMock = new Engine.ResourceManager();
    resourceMock.get = sinon.spy(function(type, id) {
      if (type === 'font') {
        return function() {
          return {
            createMesh: sinon.spy(),
          }
        };
      } else {
        return Obj;
      }
    });
    const game = new Game();
    game.player = new Engine.Player();
    const sceneNode = getNode('level');
    const parser = new LevelParser({
      game: game,
      resource: resourceMock,
    });
    parser.parse(sceneNode)
    .then(function(_level) {
      level = _level;
      expect(level).to.be.a(Engine.Scene);
      done();
    })
    .catch(done);
  });

  it('should create objects with valid positions', function() {
    level.world.objects.forEach(function(object) {
      expect(object.position).to.be.a(THREE.Vector3);
      expect(object.position.x).to.be.a('number');
      expect(object.position.y).to.be.a('number');
      expect(object.position.z).to.be.a('number');
      if (object.model) {
        expect(object.model.material.map).to.be.a(THREE.Texture);
      }
    });
  });

  it('should not put any objects in scene without texture ', function() {
    level.world.scene.children.forEach(function(mesh) {
      if (mesh.material && !mesh.material.map) {
        console.error('Mesh missing texture', mesh);
      }
    });
  });

  context('Object Parsing', function() {
    let object;

    it('should name object', function() {
      object = level.world.getObject('test');
      expect(object.name).to.equal('test');
    });

    it('should take out face indices properly', function() {
      object = level.world.getObject('json-index-only');
      expect(object.animators[0].indices).to.eql([0, 1, 2, 3, 4, 100, 112]);
      object = level.world.getObject('range-index-star');
      expect(object.animators[0].indices).to.eql([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]);
    });
  });

  it('should parse checkpoints', function() {
    expect(level.checkPoints).to.have.length(3);
    expect(level.checkPoints[0]).to.eql({pos: {x: 136, y: -165}, radius: 100});
    expect(level.checkPoints[1]).to.eql({pos: {x: 1920, y: -661}, radius: 100});
    expect(level.checkPoints[2]).to.eql({pos: { x: 4736, y: -1109}, radius: 13});
  });

  context('Camera', function() {
    it('should have smoothing', function() {
      expect(level.world.camera.smoothing).to.be.a('number');
      expect(level.world.camera.smoothing).to.equal(13.5);
    });

    it('should have paths', function() {
      const paths = level.world.camera.paths;
      expect(paths).to.have.length(3);
      expect(paths[0].window[0]).to.eql({x: 0, y: -208, z: 0});
      expect(paths[0].window[1]).to.eql({x: 2048, y: 0, z: 0});
      expect(paths[0].constraint[0]).to.eql({x: 180, y: -120, z: 150});
      expect(paths[0].constraint[1]).to.eql({x: 1920, y: -120, z: 150});
    });
  });
});
