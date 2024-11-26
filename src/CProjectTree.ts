import { readFile } from 'node:fs/promises'
import path from 'path'
import { iConfig, iFileDependencyNode } from './types.js'
import ParseIncludes from './ParseIncludes.js'
import DependencyList from './DependencyList.js'
import DependencyData from './DependencyData.js'


class CProjectTree {

  private parseIncludes: ParseIncludes
  private cFilePaths : Record<string, string> | null
  private config : iConfig
  private dependencyList: DependencyList

  constructor(config: iConfig) {
    this.parseIncludes = new ParseIncludes()
    this.config = this.loadConfig(config)
    this.cFilePaths = null
    this.dependencyList = new DependencyList()
  }

  static createFileDependencyNode(filePath: string): iFileDependencyNode {
    return {
      path: filePath,
      dependencies: {
        custom: [],
        builtIn: []
      }
    }
  }

  public loadCFileMap(cFileMap: Record<string, string>) {
    this.cFilePaths = cFileMap
  }

  public async getData(rootPath: string): Promise<DependencyData> {
    if (!this.cFilePaths) {
      throw new Error('this.cFileMap is null.  Must be loaded before calling this.buildTree')
    }
    const file = await readFile(rootPath)
    const dependencyTree = await this.getAllLinkedDependenciesAsTree(rootPath, file.toString())
    return new DependencyData(this.dependencyList, dependencyTree)
  }
  
  private loadConfig(config: iConfig) {
    return config
  }

  private async getAllLinkedDependenciesAsTree(nodePath: string, fileAsString: string) {

    let node = CProjectTree.createFileDependencyNode(nodePath)
    node = this.parseIncludes.parseFile(node, fileAsString) as iFileDependencyNode

    if (node.dependencies.custom.length) {
      const { custom } = node.dependencies

      node.dependencies.custom = await Promise.all(custom.map(async (dep) => {
        const cFileName = path.parse(
          path.resolve(
            path.parse(nodePath).dir + '/', dep.path
          )
        ).name

        const cFilePath = this.config.rootPath + '/' + this.cFilePaths[cFileName]
        this.dependencyList.addDependency(cFilePath)
        const file = await readFile(cFilePath)
        return await this.getAllLinkedDependenciesAsTree(cFilePath, file.toString())
      }))

    }

    return node
  }

}

export default CProjectTree