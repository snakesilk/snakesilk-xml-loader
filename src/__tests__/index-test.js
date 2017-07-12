const expect = require('expect.js');
const sinon = require('sinon');
const packageJSON = require('../../package.json');
const Main = require('../index.js');

describe('Main Export', function() {
  it('is defined in package.json', () => {
    expect(packageJSON.main).to.be('./dist/index.js');
  });

  describe('Exports', () => {
    it('exports XMLLoader', () => {
      expect(Main.XMLLoader).to.be(require('../XMLLoader'));
    });

    it('exports Parser', () => {
      expect(Main.Parser).to.be(require('../parsers/Parser'));
    });

    it('exports ObjectParser', () => {
      expect(Main.Parser.ObjectParser).to.be(require('../parsers/ObjectParser'));
    });

    it('exports SceneParser', () => {
      expect(Main.Parser.SceneParser).to.be(require('../parsers/SceneParser'));
    });

    it('exports TraitParser', () => {
      expect(Main.Parser.TraitParser).to.be(require('../parsers/TraitParser'));
    });
  });
});
