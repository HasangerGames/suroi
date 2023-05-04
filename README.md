<div align="center">
    <h1>Suroi</h1>
</div>

<div align="center">
    <img src="https://img.shields.io/badge/node.js%20-%23339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/typescript-%233178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/html-%23E34F26?style=for-the-badge&logo=html5&logoColor=white" />
    <img src="https://img.shields.io/badge/css-%231572B6?style=for-the-badge&logo=css3" />
    <img src="https://img.shields.io/badge/sass-%23CC6699?style=for-the-badge&logo=sass&logoColor=white" />
    <img src="https://img.shields.io/badge/bootstrap-%237952B3?style=for-the-badge&logo=bootstrap&logoColor=white" />
    <img src="https://img.shields.io/badge/tailwind-%2306B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</div>

## Prerequisites
 * [Node.js](https://nodejs.org)

## Installation
This project utilizes [npm](https://npmjs.com). No other package manager is supported for this project.

To install dependencies for this project, open a command line interface at the directory of the cloned repository, and run:
```sh
cd ./common && npm ci \
cd ../client && npm ci \
cd ../server && npm ci
```

This will create a `node_modules` directory in all three folders and link the packages there.

## Development
To run the app locally in development, in the root of the project, open two terminals.

In one terminal, run the following:
```sh
cd ./client && npm run dev
```

In another, run the following:
```sh
cd ./server && npm run dev
```


## Production
To build for production, in the root of the project, execute
```sh
npm run build
```

To execute a production build, run
```
npm start
```
