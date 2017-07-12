const XMLLoader = require('./XMLLoader');
const Parser = require('./parsers/Parser');

Parser.ObjectParser = require('./parsers/ObjectParser');
Parser.SceneParser = require('./parsers/SceneParser');
Parser.TraitParser = require('./parsers/TraitParser');

module.exports = {
    XMLLoader,
    Parser,
};
