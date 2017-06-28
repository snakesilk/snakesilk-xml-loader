const expect = require('expect.js');
const {createNode} = require('@snakesilk/testing/xml');

const {ensure} = require('../traverse');

describe('XML Traverse Utils', () => {
  describe('ensure()', () => {
    it('throws a TypeError if node is not a node', () => {
      expect(() => {
        ensure('string', 'camera');
      }).to.throwError(error => {
        expect(error).to.be.a(TypeError);
        expect(error.message).to.be('string is not an XML node');
      });
    });

    it('throws a TypeError if node not matching selector', () => {
      const node = createNode(`<animations/>`);
      expect(() => {
        ensure(node, 'camera');
      }).to.throwError(error => {
        expect(error).to.be.a(TypeError);
        expect(error.message).to.be('<animations></animations> must match selector "camera"');
      });
    });

    it('does nothing when node matches selector', () => {
      const node = createNode(`<good-node/>`);
      expect(ensure(node, 'good-node')).to.be(undefined);
    });
  });
});
