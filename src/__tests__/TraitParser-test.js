const expect = require('expect.js');
const sinon = require('sinon');

const TraitParser = require('../TraitParser');

describe.skip('TraitParser', function() {
  describe('Door', function() {
    context('when parsing defaults', function() {
      let node, Trait;

      beforeEach(() => {
        node = createNode('<trait source="Door"/>');
        Trait = parser.parseTrait(node);
      });

      it('should inherit Door trait', function() {
        expect(new Trait).to.be.a(Engine.traits.Door);
      });

      it('should default to universal direction', function() {
        const trait = new Trait();
        expect(trait.direction).to.eql({x: 0, y: 0});
      });

      it('should default to two way', function() {
        const trait = new Trait();
        expect(trait.oneWay).to.be(false);
      });
    });

    it('should parse direction', function() {
      const node = createNode('<trait source="Door"><direction x="13" y="1../trait>');
      const Trait = parser.parseTrait(node);
      const trait = new Trait();
      expect(trait.direction).to.be.eql({x: 13, y: 17});
    });

    it('should parse one-way', function() {
      const node = createNode('<trait source="Door" one-way="true"/>');
      const Trait = parser.parseTrait(node);
      const trait = new Trait();
      expect(trait.oneWay).to.be(true);
    });
  });

  describe('Solid', function() {
    context('when instantiating', function() {
      let trait;

      beforeEach(() => {
        trait = new Engine.traits.Solid();
      });

      it('should have name set to "solid"', function() {
        expect(trait.NAME).to.be('solid');
      });

      it('should have fixed set to false', function() {
        expect(trait.fixed).to.be(false);
      });
    });

    context('when no attack attribute set', function() {
      it('should default to all surfaces', function() {
        const node = createNode('<trait source="Solid"/>');
        const Trait = parser.parseTrait(node);
        const trait = new Trait();
        expect(trait.attackAccept).to
          .eql([trait.TOP, trait.BOTTOM, trait.LEFT, trait.RIGHT]);
      });
    });

    context('when attack attribute set', function() {
      it('should honor attribute', function() {
        const node = createNode('<trait source="Solid" attack="top"/>');
        const Trait = parser.parseTrait(node);
        const trait = new Trait();
        expect(trait.attackAccept).to.eql([trait.TOP]);
      });

      it('should parse using space-separated', function() {
        const node = createNode('<trait source="Solid" attack="bottom left right"/>');
        const Trait = parser.parseTrait(node);
        const trait = new Trait();
        expect(trait.attackAccept).to.eql([trait.BOTTOM, trait.LEFT, trait.RIGHT]);
      });
    });
  });

  describe('Spawn', function() {
    let spawn;
    let hostMock;

    beforeEach(function() {
      hostMock = {
        position: {x: 3, y: 5, z: 0},
        world: {
          addObject: sinon.spy(),
        },
      };
    });

    it('should discover a single item', function() {
      parser.loader.resource.addObject('Explosion', Obj);
      const node = createNode('<trait source="Spawn"><item event="recycle" object="Explosio../trait>');
      const Spawn = parser.parseTrait(node);
      spawn = new Spawn();
      expect(spawn._conditions).to.have.length(1);
    });

    it('should discover multiple items', function() {
      const node = createNode('<trait source="Spawn">' +
        '<item event="recycle" object="Explosion"/>' +
        '<item event="blast" object="Explosion">' +
          '<offset x="13" y="11" z="5"/>' +
        '</item>' +
      '</trait>');
      const Spawn = parser.parseTrait(node);
      spawn = new Spawn();
      expect(spawn._conditions).to.have.length(2);
    });

    it('should provide a default offset', function() {
      spawn._conditions[0].callback.call(hostMock);
      expect(hostMock.world.addObject.callCount).to.be(1);
      const spawned = hostMock.world.addObject.lastCall.args[0];
      expect(spawned).to.be.a(Obj);
      expect(spawned.position).to.eql({x: 3, y: 5, z: 0});
    });

    it('should honor parsed offset', function() {
      spawn._conditions[1].callback.call(hostMock);
      expect(hostMock.world.addObject.callCount).to.be(1);
      const spawned = hostMock.world.addObject.lastCall.args[0];
      expect(spawned).to.be.a(Obj);
      expect(spawned.position).to.eql({x: 3 + 13, y: 5 + 11, z: 0 + 5});
    });
  });
});
