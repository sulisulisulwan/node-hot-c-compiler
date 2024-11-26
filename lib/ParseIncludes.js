class ParseIncludes {
    state;
    constructor() {
        this.state = {
            parsingIncludes: false,
            withinDoubleQuotes: false,
            withinSingleQuotes: false,
            withinBrackets: false,
            withinAComment: false,
            moduleToInclude: '',
        };
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
    openComment() {
        this.state.withinAComment = true;
    }
    closeComment() {
        this.state.withinAComment = false;
    }
    closeSingleQuotes() {
        this.state.withinSingleQuotes = false;
    }
    isWithinComment() {
        return this.state.withinAComment;
    }
    isWithinDoubleQuotes() {
        return this.state.withinDoubleQuotes;
    }
    isWithinSingleQuotes() {
        return this.state.withinSingleQuotes;
    }
    isWithinBrackets() {
        return this.state.withinBrackets;
    }
    parseFile(dependencyCollection, rootFileAsString) {
        for (let i = 0; i < rootFileAsString.length; i++) {
            if (rootFileAsString[i] + rootFileAsString[i + 1] === '//'
                && !this.isWithinDoubleQuotes()
                && !this.isWithinSingleQuotes()
                && !this.isWithinBrackets()
                && !this.state.withinAComment) {
                this.openComment();
                continue;
            }
            if (this.isWithinComment() && (rootFileAsString[i] === '\n' || rootFileAsString[i] === '\r')) {
                this.closeComment();
            }
            if (rootFileAsString[i] === "'") {
                this.state.withinSingleQuotes = !this.state.withinSingleQuotes;
            }
            if (this.state.withinSingleQuotes)
                continue;
            if (rootFileAsString[i] === '"') {
                this.state.withinDoubleQuotes = !this.state.withinDoubleQuotes;
                if (this.state.withinDoubleQuotes)
                    continue;
                if (this.state.parsingIncludes && !this.state.withinDoubleQuotes) {
                    dependencyCollection.dependencies.custom.push(ParseIncludes.createFileDependencyNode(this.state.moduleToInclude));
                    this.state.parsingIncludes = false;
                }
                if (this.state.parsingIncludes && this.state.withinDoubleQuotes) {
                    this.state.moduleToInclude += rootFileAsString[i];
                }
                continue;
            }
            if (rootFileAsString[i] === '<' && this.state.parsingIncludes) {
                this.state.withinBrackets = true;
                if (this.state.parsingIncludes && !this.state.withinBrackets) {
                    dependencyCollection.dependencies.custom.push(ParseIncludes.createFileDependencyNode(this.state.moduleToInclude));
                    this.state.parsingIncludes = false;
                }
                continue;
            }
            if (rootFileAsString[i] === '>' && this.state.parsingIncludes) {
                this.state.withinBrackets = false;
                if (this.state.parsingIncludes && !this.state.withinBrackets) {
                    dependencyCollection.dependencies.builtIn.push(ParseIncludes.createFileDependencyNode(this.state.moduleToInclude));
                    this.state.parsingIncludes = false;
                }
                continue;
            }
            if (rootFileAsString.substring(i, i + 8) === '#include' && !this.state.withinDoubleQuotes) {
                this.state.parsingIncludes = true;
                if (this.state.parsingIncludes) {
                    this.state.withinDoubleQuotes = false;
                    this.state.withinBrackets = false;
                    this.state.moduleToInclude = '';
                }
                i += 7;
                continue;
            }
            if (this.state.parsingIncludes && this.state.withinBrackets || this.state.withinDoubleQuotes) {
                this.state.moduleToInclude += rootFileAsString[i];
            }
        }
        return dependencyCollection;
    }
}
export default ParseIncludes;
