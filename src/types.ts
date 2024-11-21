export interface iFileDependencyNode {
  path: string
  dependencies: {
    custom: iFileDependencyNode[]
    builtIn: iFileDependencyNode[]
  }
}