import { exec } from 'node:child_process';
import { watch, readFile } from 'node:fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import CFileParser from './CFileParser.js';
class HotCompilerForC {
    config;
    constructor(configOptions) {
        this.config = this.loadConfig(configOptions);
    }
    build() {
        this.executeBuild(this.config.rootPath + '/' + this.config.rootFile);
        if (this.config.watch)
            this.watch();
    }
    loadConfig(configOptions) {
        return {
            ...configOptions,
            rootPath: path.resolve(path.dirname(configOptions.rootPath), configOptions.rootPath),
            outputPath: path.resolve(path.dirname(configOptions.outputPath), configOptions.outputPath)
        };
    }
    async executeBuild(srcPath) {
        const dependencies = await this.getAllLinkedDependencies(srcPath);
        this.buildOutputDir();
        const buildCommand = this.constructBuildCommand(dependencies);
        this.executeBuildCommand(buildCommand);
    }
    async getAllLinkedDependencies(rootPath) {
        const file = await readFile(rootPath);
        const dependencyTree = CFileParser.getAllLinkedDependencies(rootPath, file.toString());
        return dependencyTree;
    }
    buildOutputDir() {
        try {
            fs.statSync(this.config.outputPath);
        }
        catch (e) {
            console.log(chalk.green.bold('Creating directory: ') +
                this.config.outputPath);
            fs.mkdirSync(this.config.outputPath);
        }
    }
    executeBuildCommand(buildCommand) {
        exec(buildCommand, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log(chalk.yellow.bold('Compiling: ') + this.config.rootPath + '/' + this.config.rootFile + '\n' +
                chalk.yellow.bold('into file: ') + this.config.outputPath + '/' + this.config.outputFile);
        });
    }
    constructBuildCommand(modulesToLink) {
        let compiler = this.config.compilerType === 'c' ? 'gcc' : 'g++';
        let outputPathOption = '-o ' + this.config.outputPath + '/' + this.config.outputFile;
        const filesToCompile = CFileParser.listCustomDependenciesBySpace(modulesToLink);
        let command = `${compiler} ${filesToCompile} ${outputPathOption}`;
        return command;
    }
    watch() {
        const ac = new AbortController();
        const { signal } = ac;
        console.log(chalk.yellow.bold('Watching directory: ') +
            chalk.bold(this.config.rootPath));
        (async () => {
            try {
                const watcher = watch(this.config.rootPath, { recursive: true, signal });
                for await (const event of watcher) {
                    console.log(chalk.yellow.bold('Detected a change in file: \n') +
                        chalk.green.bold(this.config.rootPath + '/' + event.filename + '\n'));
                    if (event.eventType === 'change')
                        await this.executeBuild(this.config.rootPath + '/' + this.config.rootFile);
                }
            }
            catch (err) {
                if (err.name === 'AbortError')
                    return;
                throw err;
            }
        })();
    }
}
export default HotCompilerForC;
