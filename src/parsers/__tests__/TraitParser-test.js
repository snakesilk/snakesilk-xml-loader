const expect = require('expect.js');
const sinon = require('sinon');
const {createNode} = require('@snakesilk/testing/xml');

const {Entity, Loader, Trait} = require('@snakesilk/engine');
const TraitParser = require('../TraitParser');

describe('TraitParser', () => {
  let parser, loader;

  beforeEach(() => {
    loader = new Loader();
    parser = new TraitParser(loader);
  });

  describe('#createFactory', () => {
    class MyTrait extends Trait {
      constructor() {
        super();
        this.force = 12;
        this.event = undefined;
        this.damage = 0;
        this.create = undefined;
        this.find = undefined;
      }
    }

    let factory;

    beforeEach(() => {
      factory = TraitParser.createFactory(MyTrait);
    });

    it('returns a function', () => {
      expect(factory).to.be.a(Function);
    });

    describe('when parsing using factory', () => {
      let trait;

      beforeEach(() => {
        const node = createNode(`<trait
          force="1124.24"
          event="recycle"
          damage="12"
          create="true"
          find="false"
          unmatched="124.23"
        />`);
        trait = factory(parser, node)();
      });

      it('applies matched properties to trait', () => {
        expect(trait.force).to.equal(1124.24);
        expect(trait.event).to.equal('recycle');
        expect(trait.damage).to.equal(12);
        expect(trait.create).to.be(true);
        expect(trait.find).to.be(false);
      });

      it('ignores unmatched properties in trait', () => {
        expect(trait).to.not.have.property('unmatched');
      });
    });
  });

  describe('#parseTrait', () => {
    describe('when trait has been registered', () => {
      const MOCK_CONSTRUCTOR = Symbol('mock constructor');
      let constructor, factory, node;

      beforeEach(() => {
        factory = sinon.stub().returns(MOCK_CONSTRUCTOR);

        loader.traits.add({
          'my-trait': factory,
        });

        node = createNode(`<trait name='my-trait'/>`);
        constructor = parser.parseTrait(node);
      });

      it('returns constructor created by factory', () => {
        expect(constructor).to.be(MOCK_CONSTRUCTOR);
      });

      it('calls factory with Parser instance and node', () => {
        expect(factory.callCount).to.be(1);
        expect(factory.lastCall.args).to.eql([
          parser,
          node,
        ]);
      });
    });
  });

  describe('#parsePrimitives', () => {
    let props;

    beforeEach(() => {
      const node = createNode(`<trait
        force="1124.24"
        event="recycle"
        yes="true"
        no="false"
      />`);
      props = parser.parsePrimitives(node);
    });

    it('returns a Map', () => {
      expect(props).to.be.a(Map);
    });

    it('parses numbers', () => {
      expect(props.get('force')).to.equal(1124.24);
    });

    it('parses strings', () => {
      expect(props.get('event')).to.equal('recycle');
    });

    it('parses boolean', () => {
      expect(props.get('yes')).to.be(true);
      expect(props.get('no')).to.be(false);
    });
  });
});
