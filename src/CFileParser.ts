import { readFile } from 'node:fs/promises'
import path from 'path'
import { iFileDependencyNode } from './types.js'


class CFileParser {

  static createFileDependencyNode(filePath: string): iFileDependencyNode {
    return {
      path: filePath,
      dependencies: {
        custom: [],
        builtIn: []
      }
    }
  }

  static async getAllLinkedDependencies(rootPath: string, fileAsString: string) {

    let rootNode = CFileParser.createFileDependencyNode(rootPath)
    rootNode = CFileParser.parseIncludes(rootNode, fileAsString)
    
    if (rootNode.dependencies.custom.length) {
      let newCustom: iFileDependencyNode[] = []
      for (let i = 0; i < rootNode.dependencies.custom.length; i++) {

        const module = rootNode.dependencies.custom[i] 
        const rootDir = path.parse(rootPath).dir + '/'
        const modulePath = path.resolve(rootDir, module.path)
        const { dir, name } = path.parse(modulePath)
        const cFilePath = dir + '/' + name + '.c'

        const file = await readFile(cFilePath)
        const results = await CFileParser.getAllLinkedDependencies(cFilePath, file.toString())
        newCustom.push(results)
      }
      rootNode.dependencies.custom = newCustom
    }


    return rootNode
  }

  static parseIncludes(fileDependencyNode: iFileDependencyNode, rootFileAsString: string) {

    let parsingIncludes = false
    let withinDoubleQuotes = false
    let withinSingleQuotes = false
    let withinBrackets = false
    let moduleToInclude = ''

    for (let i = 0; i < rootFileAsString.length; i++) {
      if (rootFileAsString[i] === "'") {
        withinSingleQuotes = !withinSingleQuotes
      }

      if (withinSingleQuotes) continue

      //toggle whether or not we are in quotes
      if (rootFileAsString[i] === '"') {
        withinDoubleQuotes = !withinDoubleQuotes

        if (withinDoubleQuotes) continue

        if (parsingIncludes && !withinDoubleQuotes) { //Reached the end of the #includes directive
          fileDependencyNode.dependencies.custom.push(CFileParser.createFileDependencyNode(moduleToInclude))
          parsingIncludes = false
        }

        if (parsingIncludes && withinDoubleQuotes) {
          moduleToInclude += rootFileAsString[i]
        }

        continue
      }

      //toggle whether or not we are in brackets
      if (rootFileAsString[i] === '<' && parsingIncludes) {
        withinBrackets = true

        if (parsingIncludes && !withinBrackets) { //Reached the end of the #includes directive
          fileDependencyNode.dependencies.builtIn.push(CFileParser.createFileDependencyNode(moduleToInclude))
          parsingIncludes = false
        }

        continue
      }

      if (rootFileAsString[i] === '>' && parsingIncludes) {
        withinBrackets = false

        if (parsingIncludes && !withinBrackets) { //Reached the end of the #includes directive
          fileDependencyNode.dependencies.builtIn.push(CFileParser.createFileDependencyNode(moduleToInclude))
          parsingIncludes = false
        }

        continue
      }


      //determine if the preprocessor directive #include has been found
      if (rootFileAsString.substring(i, i + 8) === '#include' && !withinDoubleQuotes) {
        parsingIncludes = true

        if (parsingIncludes) { //ensure that these flags have been reset
          withinDoubleQuotes = false
          withinBrackets = false
          moduleToInclude = ''
        }
        i += 7 // skip past the directive
        continue
      }

      if (parsingIncludes) {
        if (withinBrackets || withinDoubleQuotes) {
          moduleToInclude += rootFileAsString[i]
        }
      }

    }

    return fileDependencyNode
  }

  static listCustomDependenciesBySpace(rootFileDependencyNode: iFileDependencyNode): string {
    let list = ''

    list += rootFileDependencyNode.path + ' '
    if (rootFileDependencyNode.dependencies.custom) {
      for (let i = 0; i < rootFileDependencyNode.dependencies.custom.length; i++) {
        const dependencyNode = rootFileDependencyNode.dependencies.custom[i]
        list += CFileParser.listCustomDependenciesBySpace(dependencyNode)
      }
    }

    return list
  }
}

export default CFileParser