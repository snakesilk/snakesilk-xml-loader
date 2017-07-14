const XMLLoader = require('./XMLLoader');
const Parser = require('./parsers/Parser');

Parser.EntityParser = require('./parsers/EntityParser');
Parser.SceneParser = require('./parsers/SceneParser');
Parser.TraitParser = require('./parsers/TraitParser');

module.exports = {
    XMLLoader,
    Parser,
};
