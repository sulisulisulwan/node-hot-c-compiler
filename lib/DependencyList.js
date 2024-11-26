class DependencyList {
    dependencies;
    constructor() {
        this.dependencies = new Set();
    }
    addDependency(dependency) {
        this.dependencies.add(dependency);
    }
    getDependencies() {
        return Array.from(this.dependencies);
    }
}
export default DependencyList;
