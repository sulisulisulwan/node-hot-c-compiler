import { exec } from 'node:child_process'
import { Console } from 'node:console'
import { watch, readFile } from 'node:fs/promises'
import * as path from 'path'
import * as fs from 'fs'
import chalk from 'chalk'
import CFileParser from './CFileParser.js'
import { iFileDependencyNode } from './types.js'


class HotCompilerForC {

  protected config: any

  constructor(configOptions: any) {
    this.config = this.loadConfig(configOptions)
  }

  public build() {
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

  protected async executeBuild(srcPath: string) {
    
    const dependencies = await this.getAllLinkedDependencies(srcPath)
    this.buildOutputDir()
    const buildCommand = this.constructBuildCommand(dependencies)
    this.executeBuildCommand(buildCommand)
  }

  protected async getAllLinkedDependencies(rootPath: string) {
    const file = await readFile(rootPath)
    const dependencyTree = CFileParser.getAllLinkedDependencies(rootPath, file.toString())
    return dependencyTree
  }

  protected buildOutputDir () {
    try { 
      //Check if build output directory exists
      fs.statSync(this.config.outputPath) 
    } catch(e) {
      //Create directory if it doesn't exist
      console.log(
        chalk.green.bold('Creating directory: ') + 
        this.config.outputPath
      )
      fs.mkdirSync(this.config.outputPath)
    }
  }

  protected executeBuildCommand(buildCommand: string) {
    exec(buildCommand, (err, stdout, stderr) => {
      if (err) { console.error(err); return }

      console.log(
        chalk.yellow.bold('Compiling: ') + this.config.rootPath + '/' + this.config.rootFile + '\n' +
        chalk.yellow.bold('into file: ') + this.config.outputPath + '/' + this.config.outputFile
      )
    })
  }

  protected constructBuildCommand(modulesToLink: iFileDependencyNode) {
    
    let compiler = this.config.compilerType === 'c' ? 'gcc' : 'g++'
    let outputPathOption = '-o ' + this.config.outputPath + '/' + this.config.outputFile //TODO: we need to support different config inputs regarding forward slashes
    const filesToCompile = CFileParser.listCustomDependenciesBySpace(modulesToLink)

    let command = `${compiler} ${filesToCompile} ${outputPathOption}`

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
          if (event.eventType === 'change')  await this.executeBuild(this.config.rootPath + '/' + this.config.rootFile)
        }
      } catch(err) {
        if (err.name === 'AbortError') return
        throw err
      }
    })()
  }
  
}

export default HotCompilerForC