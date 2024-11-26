class DependencyData {
    tree;
    list;
    constructor(list, tree) {
        this.tree = tree;
        this.list = list;
    }
    setTree(tree) {
        this.tree = tree;
    }
    setList(list) {
        this.list = list;
    }
    getTree() {
        return this.tree;
    }
    getList() {
        return this.list.getDependencies();
    }
}
export default DependencyData;
