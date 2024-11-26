class DependencyList {

  private dependencies: Set<string>

  constructor() {
    this.dependencies = new Set()
  }

  addDependency(dependency: string) {
    this.dependencies.add(dependency)
  }

  getDependencies() {
    return Array.from(this.dependencies)
  }
}

export default DependencyList