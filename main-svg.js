class Tree {
    constructor(label, left, right) {
        this.label = label
        this.left = left
        this.right = right
    }

    replace(other) {
        this.label = other.label
        this.left = other.left
        this.right = other.right
    }

    translate(dx, dy) {
        this.x += dx
        this.y += dy
        if (this.left && this.right) {
            this.left.translate(dx, dy)
            this.right.translate(dx, dy)
        }
    }

    position(levelHeight, spacing) {
        this.x = 0
        this.y = 0
        this.leftWidth = 0
        this.rightWidth = 0
        this.height = 0

        if (!this.isLeaf()) {
            this.left.position(levelHeight, spacing)
            this.right.position(levelHeight, spacing)

            const space = this.left.rightWidth + this.right.leftWidth + spacing
            this.left.translate(-space / 2, -levelHeight)
            this.right.translate(space / 2, -levelHeight)

            this.leftWidth = this.left.leftWidth + space / 2
            this.rightWidth = this.right.rightWidth + space / 2
            this.height = levelHeight + Math.max(this.left.height, this.right.height)
        }
    }

    substituted(mapping) {
        if (this.isLeaf() && mapping.has(this.label)) {
            return mapping.get(this.label).clone()
        } else if (!this.isLeaf()) {
            return new Tree(this.label,
                this.left.substituted(mapping),
                this.right.substituted(mapping)
            )
        } else {
            return new Tree(this.label)
        }
    }

    clone() {
        if (this.isLeaf()) {
            return new Tree(this.label)
        } else {
            return new Tree(this.label, this.left.clone(), this.right.clone())
        }
    }

    isLeaf() {
        return this.left === undefined && this.right === undefined;
    }

    expression() {
        if (this.isLeaf()) {
            return this.label;
        } else {
            return `(${this.left.expression()}${this.right.expression()})`
        }
    }


}

class Match {
    constructor(matched, mapping) {
        this.matched = matched
        this.mapping = mapping
    }

    merged(other) {
        return new Match(this.matched && other.matched, new Map([...this.mapping, ...other.mapping]))
    }
}

class AnyPattern {
    constructor(name) { this.name = name }
    match(tree) {
        return new Match(true, new Map([[this.name, tree]]))
    }
}

class ExactPattern {
    constructor(label, name) {
        this.label = label
        this.name = name
    }
    match(tree) {
        if (tree !== undefined && tree.isLeaf() && tree.label === this.label) {
            return new Match(true, new Map([[this.name, tree]]))
        } else {
            return new Match(false, new Map())
        }
    }
}

class TreePattern {
    constructor(left, right) {
        this.left = left
        this.right = right
    }

    match(tree) {
        if (tree === undefined) {
            return new Match(false, new Map())
        }
        const left = this.left.match(tree.left)
        const right = this.right.match(tree.right)
        return left.merged(right)
    }
}

const S_PATTERN = new TreePattern(
    new TreePattern(
        new TreePattern(
            new ExactPattern("S", "S"),
            new AnyPattern("x")
        ),
        new AnyPattern("y")
    ),
    new AnyPattern("z")
)
const S_TREE = new Tree(
    "",
    new Tree("", new Tree("x"), new Tree("z")),
    new Tree("", new Tree("y"), new Tree("z"))
)

const K_PATTERN = new TreePattern(
    new TreePattern(
        new ExactPattern("K", "K"),
        new AnyPattern("x")
    ),
    new AnyPattern("y")
)
const K_TREE = new Tree("x")

const I_PATTERN = new TreePattern(new ExactPattern("I", "I"), new AnyPattern("x"))
const I_TREE = new Tree("x")


const Mode = {
    ADD: 0,
    REMOVE: 1,
    EDIT: 2,
    PLAY: 3
}

class App {
    constructor() {
        this.editBtn = document.querySelector("#edit-btn")
        this.addBtn = document.querySelector("#add-btn")
        this.removeBtn = document.querySelector("#remove-btn")
        this.playBtn = document.querySelector("#play-btn")
        this.clearBtn = document.querySelector("#clear-btn")
        this.stepBtn = document.querySelector("#step-btn")

        this.btns = [this.editBtn, this.addBtn, this.removeBtn, this.playBtn]
        this.exprContainer = document.querySelector("#expr-container")
        this.container = document.querySelector("#tree-container")
        this.hintContainer = document.querySelector("#hint-container")
        this.drawBtn = document.querySelector("#draw-from-text")
        this.drawBtn.addEventListener("click", () => this.drawFromText())

        this.setMode(Mode.ADD)
        this.editBtn.addEventListener("click", () => this.setMode(Mode.EDIT))
        this.addBtn.addEventListener("click", () => this.setMode(Mode.ADD))
        this.removeBtn.addEventListener("click", () => this.setMode(Mode.REMOVE))
        this.playBtn.addEventListener("click", () => this.setMode(Mode.PLAY))
        this.clearBtn.addEventListener("click", () => this.update(new Tree("")))
        this.stepBtn.addEventListener("click", () => this.step())

        this.patterns = [[K_PATTERN, K_TREE], [S_PATTERN, S_TREE]]
    }

    setMode(mode) {
        this.mode = mode
        for (const btn of this.btns) btn.classList.remove("active")
        if (mode == Mode.ADD) {
            this.addBtn.classList.add("active")
            this.hintContainer.innerHTML = "Click on a flower to split it in two"
        } else if (mode == Mode.REMOVE) {
            this.removeBtn.classList.add("active")
            this.hintContainer.innerHTML = "Click on a node to change it into a flower"
        } else if (mode == Mode.EDIT) {
            this.editBtn.classList.add("active")
            this.hintContainer.innerHTML = "Click on a flower to rename it"
        } else if (mode == Mode.PLAY) {
            this.playBtn.classList.add("active")
            this.hintContainer.innerHTML = "Click on a node"
        }
    }

    clickTree(tree) {
        if (this.mode == Mode.ADD && tree.isLeaf()) {
            tree.label = ""
            tree.left = new Tree("x")
            tree.right = new Tree("x")
            this.update(this.tree)
        } else if (this.mode == Mode.REMOVE && !tree.isLeaf()) {
            tree.left = undefined
            tree.right = undefined
            this.update(this.tree)
        } else if (this.mode == Mode.EDIT && tree.isLeaf()) {
            if (this.keyPressListener !== undefined)
                document.removeEventListener("keypress", this.keyPressListener)
            this.keyPressListener = (e) => { tree.label = e.key; this.update(this.tree) }
            document.addEventListener("keypress", this.keyPressListener)
        } else if (this.mode === Mode.PLAY) {
            if (this.tryReduce(tree))
                this.update(this.tree)
        }
    }

    step() {
        if (!this.tryReduceRec(this.tree)) {
            console.log("Cannot reduce anymore")
        }
        this.update(this.tree)
    }

    tryReduceRec(tree) {
        if (this.tryReduce(tree)) return true;
        else if (!tree.isLeaf()) {
            if (this.tryReduceRec(tree.left))
                return true;
            else
                return this.tryReduceRec(tree.right)
        }
        return false;
    }

    tryReduce(tree) {
        for (const pattern of this.patterns) {
            const match = pattern[0].match(tree)
            if (match.matched) {
                tree.replace(pattern[1].substituted(match.mapping))
                return true;
            }
        }
        return false;
    }

    hoverTree(tree) {
    }

    unhoverTree(tree) {
    }

    drawTree(svg, tree) {
        const treeWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
        if (!tree.isLeaf()) {
            const edgeLeft = createEdge(tree.x, tree.y, tree.left.x, tree.left.y);
            const edgeRight = createEdge(tree.x, tree.y, tree.right.x, tree.right.y);
            treeWrapper.appendChild(edgeLeft)
            treeWrapper.appendChild(edgeRight)
            this.drawTree(treeWrapper, tree.left)
            this.drawTree(treeWrapper, tree.right)
        }
        const node = createNode(tree.x, tree.y, tree.label, tree.isLeaf())
        tree.node = node
        tree.wrapper = treeWrapper
        node.addEventListener("click", () => this.clickTree(tree))
        node.addEventListener("mouseover", () => this.hoverTree(tree))
        node.addEventListener("mouseout", () => this.unhoverTree(tree))
        treeWrapper.appendChild(node)
        svg.appendChild(treeWrapper)
    }

    drawTreeFromRoot(svg, tree) {
        svg.appendChild(createNode(0, 100, "", false))
        svg.appendChild(createEdge(0, 100, 0, 0))
        this.drawTree(svg, tree)
    }

    drawFromText() {
        const text = document.querySelector("#text-input").value
        this.tree = parse(text)
        this.container.innerHTML = ""
        this.update(this.tree)
    }


    update(tree) {
        this.tree = tree
        tree.position(100, 100)
        this.container.innerHTML = ""
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%")
        svg.setAttribute("height", "100%")
        svg.setAttribute("viewBox", `${-tree.leftWidth - 50}, ${-tree.height - 100}, ${tree.leftWidth + tree.rightWidth + 50}, ${tree.height + 300}`);

        this.drawTreeFromRoot(svg, tree)
        this.container.appendChild(svg)
        this.exprContainer.innerHTML = this.tree.expression()
    }


}

function rad(deg) {
    return deg * Math.PI / 180
}

function createFlower(x, y, r, fill) {
    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const petals = 5;

    for (let i = 0; i < petals; i++) {
        const x = r * Math.cos(rad(i * 360 / petals))
        const y = r * Math.sin(rad(i * 360 / petals))
        const petal = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        petal.setAttribute("cx", x)
        petal.setAttribute("cy", y)
        petal.setAttribute("r", r)
        if (fill) petal.setAttribute("fill", fill)
        wrapper.appendChild(petal)
    }

    const middle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    middle.setAttribute("cx", 0)
    middle.setAttribute("cy", 0)
    middle.setAttribute("r", r)
    middle.setAttribute("fill", "#fff")
    wrapper.appendChild(middle)

    wrapper.setAttribute("transform", `translate(${x}, ${y})`)
    return wrapper
}


function createNode(x, y, text, leaf) {
    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");

    if (leaf) {
        const color = text == "S" ? "#e36e14" : (text == "K" ? "#c71494" : "#1066c2")
        const flower = createFlower(x, y, 15, color)
        flower.classList.add("node")
        wrapper.appendChild(flower)
    }
    else {
        const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        node.setAttribute("cx", x)
        node.setAttribute("cy", y)
        node.setAttribute("r", 10)
        node.setAttribute("fill", "#21cc1f")
        node.classList.add("node")
        wrapper.appendChild(node)
    }


    if (text) {
        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.innerHTML = text
        textElement.setAttribute("x", x)
        textElement.setAttribute("y", y)
        textElement.setAttribute("text-anchor", "middle")
        textElement.setAttribute("dominant-baseline", "middle")
        wrapper.appendChild(textElement)
    }

    return wrapper;
}

function createEdge(x1, y1, x2, y2) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1)
    line.setAttribute("y1", y1)
    line.setAttribute("x2", x2)
    line.setAttribute("y2", y2)
    line.setAttribute("stroke", "#21cc1f")
    line.setAttribute("stroke-width", "2")

    return line;
}


function concat(trees) {
    let tree = trees[0];
    for (let i = 1; i < trees.length; i++) {
        tree = new Tree("", tree, trees[i])
    }
    return tree;
}

function parse(text) {
    const stack = []
    for (const s of text) {
        if (s == "(") stack.push("(")
        else if (s == ")") {
            const trees = []

            while (stack.length > 0) {
                const t = stack.pop()
                if (t == "(") break
                else trees.push(t)
            }

            trees.reverse()
            stack.push(concat(trees))
        } else {
            stack.push(new Tree(s))
        }
    }
    return concat(stack)
}

const app = new App()
document.addEventListener("DOMContentLoaded", () => app.update(parse("SKK")))