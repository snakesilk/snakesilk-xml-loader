const XMLLoader = require('./XMLLoader');
const Parser = require('./parsers/Parser');

Parser.ObjectParser = require('./parsers/ObjectParser');
Parser.SceneParser = require('./parsers/SceneParser');

module.exports = {
    XMLLoader,
    Parser,
};
