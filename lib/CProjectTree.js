import { readFile } from 'node:fs/promises';
import path from 'path';
import ParseIncludes from './ParseIncludes.js';
import DependencyList from './DependencyList.js';
import DependencyData from './DependencyData.js';
class CProjectTree {
    parseIncludes;
    cFilePaths;
    config;
    dependencyList;
    constructor(config) {
        this.parseIncludes = new ParseIncludes();
        this.config = this.loadConfig(config);
        this.cFilePaths = null;
        this.dependencyList = new DependencyList();
    }
    static createFileDependencyNode(filePath) {
        return {
            path: filePath,
            dependencies: {
                custom: [],
                builtIn: []
            }
        };
    }
    loadCFileMap(cFileMap) {
        this.cFilePaths = cFileMap;
    }
    async getData(rootPath) {
        if (!this.cFilePaths) {
            throw new Error('this.cFileMap is null.  Must be loaded before calling this.buildTree');
        }
        const file = await readFile(rootPath);
        const dependencyTree = await this.getAllLinkedDependenciesAsTree(rootPath, file.toString());
        return new DependencyData(this.dependencyList, dependencyTree);
    }
    loadConfig(config) {
        return config;
    }
    async getAllLinkedDependenciesAsTree(nodePath, fileAsString) {
        let node = CProjectTree.createFileDependencyNode(nodePath);
        node = this.parseIncludes.parseFile(node, fileAsString);
        if (node.dependencies.custom.length) {
            const { custom } = node.dependencies;
            node.dependencies.custom = await Promise.all(custom.map(async (dep) => {
                const cFileName = path.parse(path.resolve(path.parse(nodePath).dir + '/', dep.path)).name;
                const cFilePath = this.config.rootPath + '/' + this.cFilePaths[cFileName];
                this.dependencyList.addDependency(cFilePath);
                const file = await readFile(cFilePath);
                return await this.getAllLinkedDependenciesAsTree(cFilePath, file.toString());
            }));
        }
        return node;
    }
}
export default CProjectTree;
