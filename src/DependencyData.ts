import DependencyList from "./DependencyList.js"
import { iFileDependencyNode } from "./types.js"

class DependencyData {

  private tree: iFileDependencyNode
  private list: DependencyList

  constructor(list: DependencyList, tree: iFileDependencyNode) {
    this.tree = tree
    this.list = list
  }

  setTree(tree: iFileDependencyNode) {
    this.tree = tree
  }

  setList(list: DependencyList) {
    this.list = list
  }

  getTree() {
    return this.tree
  }

  getList() {
    return this.list.getDependencies()
  }
}

export default DependencyData