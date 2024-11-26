import DependencyList from "./DependencyList.js"

export interface iFileDependencyNode {
  path: string
  dependencies: {
    custom: iFileDependencyNode[]
    builtIn: iFileDependencyNode[]
  }
}

export interface iConfig {
  rootPath: string
  rootFile: string
  outputPath: string
  outputFile: string
  compilerType: 'c++' | 'c'
  watch: boolean
}

export interface iDependencies {
  dependencies: DependencyList
  tree: iFileDependencyNode
}
