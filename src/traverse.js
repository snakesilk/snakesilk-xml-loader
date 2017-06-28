function closest(node, selector) {
    for (; node && node !== node.ownerDocument; node = node.parentNode) {
        if (node.matches(selector)) {
            return node;
        }
    }
}

module.exports = {
    closest,
};
