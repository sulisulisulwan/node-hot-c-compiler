import { iFileDependencyNode } from "./types.js"

class ParseIncludes {

  private state: {
    parsingIncludes: boolean
    withinDoubleQuotes: boolean
    withinSingleQuotes: boolean
    withinBrackets: boolean
    withinAComment: boolean
    moduleToInclude: string
  }

  constructor() {
    this.state = {
      parsingIncludes: false,
      withinDoubleQuotes: false,
      withinSingleQuotes: false,
      withinBrackets: false,
      withinAComment: false,
      moduleToInclude: '',
    }
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

  private openComment() {
    this.state.withinAComment = true
  }
  private closeComment() {
    this.state.withinAComment = false
  }

  private closeSingleQuotes() {
    this.state.withinSingleQuotes = false
  }

  private isWithinComment() {
    return this.state.withinAComment
  }

  private isWithinDoubleQuotes() {
    return this.state.withinDoubleQuotes
  }
  private isWithinSingleQuotes() {
    return this.state.withinSingleQuotes
  }

  private isWithinBrackets() {
    return this.state.withinBrackets
  }

  public parseFile(dependencyCollection: iFileDependencyNode, rootFileAsString: string) {

    for (let i = 0; i < rootFileAsString.length; i++) {

      if (
        rootFileAsString[i] + rootFileAsString[i + 1] === '//' 
        && !this.isWithinDoubleQuotes()
        && !this.isWithinSingleQuotes() 
        && !this.isWithinBrackets()
        && !this.state.withinAComment) {
          this.openComment()
          continue
      }  
      if (this.isWithinComment() && (rootFileAsString[i] === '\n' || rootFileAsString[i] === '\r')) {
        this.closeComment()
      }

      if (rootFileAsString[i] === "'") {
        this.state.withinSingleQuotes = !this.state.withinSingleQuotes
      }

      if (this.state.withinSingleQuotes) continue

      //toggle whether or not we are in quotes
      if (rootFileAsString[i] === '"') {
        this.state.withinDoubleQuotes = !this.state.withinDoubleQuotes

        if (this.state.withinDoubleQuotes) continue

        if (this.state.parsingIncludes && !this.state.withinDoubleQuotes) { //Reached the end of the #includes directive
          dependencyCollection.dependencies.custom.push(ParseIncludes.createFileDependencyNode(this.state.moduleToInclude))
          this.state.parsingIncludes = false
        }

        if (this.state.parsingIncludes && this.state.withinDoubleQuotes) {
          this.state.moduleToInclude += rootFileAsString[i]
        }

        continue
      }

      //toggle whether or not we are in brackets
      if (rootFileAsString[i] === '<' && this.state.parsingIncludes) {
        this.state.withinBrackets = true

        if (this.state.parsingIncludes && !this.state.withinBrackets) { //Reached the end of the #includes directive
          dependencyCollection.dependencies.custom.push(ParseIncludes.createFileDependencyNode(this.state.moduleToInclude))
          this.state.parsingIncludes = false
        }

        continue
      }

      if (rootFileAsString[i] === '>' && this.state.parsingIncludes) {
        this.state.withinBrackets = false

        if (this.state.parsingIncludes && !this.state.withinBrackets) { //Reached the end of the #includes directive
          dependencyCollection.dependencies.builtIn.push(ParseIncludes.createFileDependencyNode(this.state.moduleToInclude))
          this.state.parsingIncludes = false
        }

        continue
      }


      //determine if the preprocessor directive #include has been found
      if (rootFileAsString.substring(i, i + 8) === '#include' && !this.state.withinDoubleQuotes) {
        this.state.parsingIncludes = true

        if (this.state.parsingIncludes) { //ensure that these flags have been reset
          this.state.withinDoubleQuotes = false
          this.state.withinBrackets = false
          this.state.moduleToInclude = ''
        }
        i += 7 // skip past the directive
        continue
      }

      if (this.state.parsingIncludes && this.state.withinBrackets || this.state.withinDoubleQuotes) {
        this.state.moduleToInclude += rootFileAsString[i]
      }

    }

    return dependencyCollection
  }
}

export default ParseIncludes