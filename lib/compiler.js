import { exec } from 'node:child_process';
import { watch, readdir } from 'node:fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import CProjectTree from './CProjectTree.js';
class Compiler {
    config;
    cFilePaths;
    cProjectTree;
    constructor(configOptions) {
        this.config = this.loadConfig(configOptions);
        this.cFilePaths = {};
        this.cProjectTree = new CProjectTree(configOptions);
    }
    async init() {
        await this.loadCFilePaths();
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
    async loadCFilePaths() {
        this.cFilePaths = await this.getAllCFilePaths();
    }
    async executeBuild(srcPath) {
        this.cProjectTree.loadCFileMap(this.cFilePaths);
        const depData = await this.cProjectTree.getData(srcPath);
        const mainFilePath = this.config.rootPath + '/' + this.config.rootFile;
        const fullCFilePaths = [mainFilePath].concat(depData.getList());
        const buildCommand = this.constructBuildCommand(fullCFilePaths);
        this.buildOutputDir();
        this.executeBuildCommand(buildCommand);
    }
    async getAllCFilePaths() {
        const allFilesAndDirs = await readdir(this.config.rootPath, { recursive: true });
        const filePaths = allFilesAndDirs.reduce((filePathsMap, currFileOrDir) => {
            const { ext, name } = path.parse(currFileOrDir);
            if (['.c', '.cpp'].includes(ext)) {
                filePathsMap[name] = currFileOrDir;
            }
            return filePathsMap;
        }, {});
        return filePaths;
    }
    buildOutputDir() {
        try {
            fs.statSync(this.config.outputPath);
        }
        catch (e) {
            console.log(chalk.green.bold('Creating directory: ') + this.config.outputPath);
            fs.mkdirSync(this.config.outputPath);
        }
    }
    executeBuildCommand(buildCommand) {
        exec(buildCommand, (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log(chalk.yellow.bold('Compiling: ') + this.config.rootPath + '/' + this.config.rootFile + '\n' +
                chalk.yellow.bold('into file: ') + this.config.outputPath + '/' + this.config.outputFile);
        });
    }
    constructBuildCommand(fullCFilePaths) {
        let compiler = this.config.compilerType === 'c' ? 'gcc' : 'g++';
        let outputPathOption = '-o ' + this.config.outputPath + '/' + this.config.outputFile;
        let command = `${compiler} ${fullCFilePaths.join(' ')} ${outputPathOption}`;
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
                    if (event.eventType === 'change') {
                        this.onChangeEvent();
                    }
                    if (event.eventType === 'rename') {
                        this.onRenameEvent();
                    }
                }
            }
            catch (err) {
                if (err.name === 'AbortError')
                    return;
                throw err;
            }
        })();
    }
    async onChangeEvent() {
        await this.executeBuild(this.config.rootPath + '/' + this.config.rootFile);
    }
    async onRenameEvent() {
        await this.loadCFilePaths();
        await this.executeBuild(this.config.rootPath + '/' + this.config.rootFile);
    }
}
export default Compiler;
