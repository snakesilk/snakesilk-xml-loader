function children(parent, selector) {
    const next = [];
    for (let i = 0; node = parent.children[i]; ++i) {
        if (node.matches(selector)) {
            next.push(node);
        }
    }
    return next;
}

function closest(node, selector) {
    for (; node && node !== node.ownerDocument; node = node.parentNode) {
        if (node.matches(selector)) {
            return node;
        }
    }
}

module.exports = {
    children,
    closest,
};
