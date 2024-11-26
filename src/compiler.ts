import { exec } from 'node:child_process'
import { watch, readFile, readdir } from 'node:fs/promises'
import * as path from 'path'
import * as fs from 'fs'
import chalk from 'chalk'
import { iConfig, iFileDependencyNode } from './types.js'
import CProjectTree from './CProjectTree.js'


class Compiler {

  protected config: iConfig
  protected cFilePaths: Record<string,string>
  protected cProjectTree: CProjectTree
  
  constructor(configOptions: iConfig) {
    this.config = this.loadConfig(configOptions)
    this.cFilePaths = {}
    this.cProjectTree = new CProjectTree(configOptions)
  }

  public async init() {
    await this.loadCFilePaths()
    this.executeBuild(this.config.rootPath + '/' + this.config.rootFile)
    if (this.config.watch) this.watch()
  }

  protected loadConfig(configOptions: any) { 
    return {
      ...configOptions,
      rootPath: path.resolve(path.dirname(configOptions.rootPath), configOptions.rootPath),
      outputPath: path.resolve(path.dirname(configOptions.outputPath), configOptions.outputPath)
    }
  }

  protected async loadCFilePaths() {
    this.cFilePaths = await this.getAllCFilePaths() // map of all C files which exist in src path
  }

  protected async executeBuild(srcPath: string) {
    this.cProjectTree.loadCFileMap(this.cFilePaths)

    const dependencyTree = await this.cProjectTree.buildTree(srcPath) // tree of dependencies (look at iFileDependencyNode)
    const mainFilePath = this.config.rootPath + '/' + this.config.rootFile
    const fullCFilePaths = [mainFilePath].concat(dependencyTree.dependencies.getDependencies())
    const buildCommand = this.constructBuildCommand(fullCFilePaths) 

    this.buildOutputDir()
    this.executeBuildCommand(buildCommand)
  }

  protected async getAllCFilePaths() { // map of all C files which exist in src path
    const allFilesAndDirs = await readdir(this.config.rootPath, { recursive: true }) // tree of dependencies (look at iDepe)
    const filePaths = allFilesAndDirs.reduce((filePathsMap: Record<string, string>, currFileOrDir: string) => {
      const { ext, name } = path.parse(currFileOrDir)
      if (['.c', '.cpp'].includes(ext)) {
        filePathsMap[name] = currFileOrDir
      }
      return filePathsMap
    }, {})
    return filePaths
  }

  protected buildOutputDir () {
    try { 
      fs.statSync(this.config.outputPath) 
    } catch(e) {
      console.log(chalk.green.bold('Creating directory: ') +  this.config.outputPath)
      fs.mkdirSync(this.config.outputPath)
    }
  }

  protected executeBuildCommand(buildCommand: string) {
    exec(buildCommand, (err) => {
      if (err) { console.error(err); return }
      console.log(
        chalk.yellow.bold('Compiling: ') + this.config.rootPath + '/' + this.config.rootFile + '\n' +
        chalk.yellow.bold('into file: ') + this.config.outputPath + '/' + this.config.outputFile
      )
    })
  }

  protected constructBuildCommand(fullCFilePaths: string[]) {
    let compiler = this.config.compilerType === 'c' ? 'gcc' : 'g++'
    let outputPathOption = '-o ' + this.config.outputPath + '/' + this.config.outputFile //TODO: we need to support different config inputs regarding forward slashes
    let command = `${compiler} ${fullCFilePaths.join(' ')} ${outputPathOption}`
    return command
  }

  protected watch() {
    const ac = new AbortController()
    const { signal } = ac;
    console.log(
      chalk.yellow.bold('Watching directory: ') +
      chalk.bold(this.config.rootPath) 
    );
    
    (async () => {
      try {
        const watcher = watch(this.config.rootPath, { recursive: true, signal })
        for await(const event of watcher) {
          console.log(
            chalk.yellow.bold('Detected a change in file: \n') +
            chalk.green.bold(this.config.rootPath + '/' + event.filename + '\n') 
          );

          if (event.eventType === 'change') {
            this.onChangeEvent()
          }
            
          if (event.eventType === 'rename') {
            this.onRenameEvent()
          }
        }
      } catch(err) {
        if (err.name === 'AbortError') return
        throw err
      }
    })()
  }

  private async onChangeEvent() {
    await this.executeBuild(this.config.rootPath + '/' + this.config.rootFile)
  }

  private async onRenameEvent() {
    await this.loadCFilePaths()
    await this.executeBuild(this.config.rootPath + '/' + this.config.rootFile)
  }
  
}

export default Compiler