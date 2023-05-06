<div align="center">
  <img src="./client/src/assets/img/logos/suroi_readme.svg">
  <hr />
</div>


<div align="center">
  <img src="https://img.shields.io/badge/node.js%20-%23339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/typescript-%233178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/html-%23E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/css-%231572B6?style=for-the-badge&logo=css3" />
  <img src="https://img.shields.io/badge/sass-%23CC6699?style=for-the-badge&logo=sass&logoColor=white" />
  <img src="https://img.shields.io/badge/uwebsockets%20-%23000000.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/phaser%20-%232094f3.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/webpack-%231C78C0.svg?style=for-the-badge&logo=webpack" />
</div>

## About
Suroi is a 2D top-down battle royale game inspired by [surviv.io](https://en.wikipedia.org/wiki/Surviv.io). Work in progress.

## Prerequisites
 * [Node.js](https://nodejs.org)

## Installation
This project utilizes [npm](https://npmjs.com). No other package manager is supported for this project.

To install dependencies for this project, open a command line interface at the directory of the cloned repository, and run:
```sh
npm run full-install
```

This will create a `node_modules` directory in all three folders and link the packages there.

## Development
To run the app locally in development, in the root of the project, open two terminals.

In one terminal, run the following:
```sh
cd client && npm run dev
```

In another, run the following:
```sh
cd server && npm run dev
```


## Production
To build for production, in the root of the project, execute
```sh
npm run build
```

Production builds are served using [NGINX](https://nginx.org). A config file can be found [here](nginx.conf).
