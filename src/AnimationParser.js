const {Vector2} = require('three');
const {Animation, UVCoords} = require('@snakesilk/engine');

const Parser = require('./Parser');

class AnimationParser extends Parser
{
    parseAnimation(animationNode, textureSize)
    {
        const id = animationNode.getAttribute('id');
        const group = animationNode.getAttribute('group') || undefined;
        const animation = new Animation(id, group);
        const frameNodes = animationNode.getElementsByTagName('frame');
        let loop = [];
        for (let i = 0, frameNode; frameNode = frameNodes[i++];) {
            const offset = this.getVector2(frameNode, 'x', 'y');
            const size = this.getVector2(frameNode, 'w', 'h') ||
                         this.getVector2(frameNode.parentNode, 'w', 'h') ||
                         this.getVector2(frameNode.parentNode.parentNode, 'w', 'h');
            const uvMap = new UVCoords(offset, size, textureSize);
            const duration = this.getFloat(frameNode, 'duration') || undefined;
            animation.addFrame(uvMap, duration);

            const parent = frameNode.parentNode;
            if (parent.tagName === 'loop') {
                loop.push([uvMap, duration]);
                const next = frameNodes[i+1] && frameNodes[i+1].parentNode;
                if (parent !== next) {
                    let loopCount = parseInt(parent.getAttribute('count'), 10) || 1;
                    while (--loopCount) {
                        for (let j = 0; j < loop.length; ++j) {
                            animation.addFrame(loop[j][0], loop[j][1]);
                        }
                    }
                    loop = [];
                }
            }
        }

        return animation;
    }
}

module.exports = AnimationParser;
