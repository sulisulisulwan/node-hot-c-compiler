# node-hot-c-compiler
A simple javascript tool in Node to aid in hot-compiling simple C projects.

Install with terminal command:

npm i autocompilerforc

Sample project root directory:


```bash
|--cproject
|  |--src
|  |  |--main.c
|  |--compile.js
|  |--package.json

```

Sample package.json
```
{
  "name": "cproject",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "compile.js",
  "scripts": {
    "build": "node ./compile.js",
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "autocompilerforc": "0.0.4"
  }
}
```

compile.js:

```
import AutoCompilerForC from "autocompilerforc";
import path from 'path'

const config = {
  rootPath: path.resolve('./src'),
  rootFile: 'main.c',
  compilerType: 'c',
  outputPath: path.resolve('./bin'),
  outputFile: 'main',
  watch: true
}

new AutoCompilerForC(config).build()
```