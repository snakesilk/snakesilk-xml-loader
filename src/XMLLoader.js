const {Loader} = require('@snakesilk/engine');
const SceneParser = require('./parsers/SceneParser');

class XMLLoader extends Loader
{
    asyncLoadXML(url) {
        return this.resourceLoader.loadXML(url);
    }

    followNode(node) {
        const url = this.resolveURL(node, 'src');
        if (!url) {
            return Promise.resolve(node);
        }
        return this.asyncLoadXML(url).then(doc => {
            return doc.children[0];
        });
    }

    loadScene(url) {
        return this.asyncLoadXML(url).then(doc => {
            const sceneNode = doc.querySelector('scene');
            return this.parseScene(sceneNode);
        });
    }

    parseScene(node) {
        const parser = new SceneParser(this);
        return parser.getScene(node);
    }

    resolveURL(node, attr) {
        const url = node.getAttribute(attr || 'url');
        if (!url) {
            return null;
        }

        if (node.ownerDocument.baseURL === undefined) {
            return url;
        }
        if (url.indexOf('http') === 0) {
            return url;
        }
        const baseUrl = node.ownerDocument.baseURL
            .split('/').slice(0, -1).join('/') + '/';

        return baseUrl + url;
    }
}

module.exports = XMLLoader;
