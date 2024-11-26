import { readFile } from 'node:fs/promises';
import path from 'path';
import ParseIncludes from './ParseIncludes.js';
class CProjectTree {
    parseIncludes;
    constructor() {
        this.parseIncludes = new ParseIncludes();
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
    async getAllLinkedDependenciesAsTree(rootPath, fileAsString) {
        let rootNode = CProjectTree.createFileDependencyNode(rootPath);
        rootNode = this.parseIncludes.parseFile(rootNode, fileAsString);
        console.log('////////////>>>>>>>>>>heree');
        if (rootNode.dependencies.custom.length) {
            let newCustom = [];
            for (let i = 0; i < rootNode.dependencies.custom.length; i++) {
                const module = rootNode.dependencies.custom[i];
                const rootDir = path.parse(rootPath).dir + '/';
                const modulePath = path.resolve(rootDir, module.path);
                const { dir, name } = path.parse(modulePath);
                const cFilePath = dir + '/' + name + '.c';
                const file = await readFile(cFilePath);
                const results = await this.getAllLinkedDependenciesAsTree(cFilePath, file.toString());
                newCustom.push(results);
            }
            rootNode.dependencies.custom = newCustom;
        }
        return rootNode;
    }
}
export default CProjectTree;
