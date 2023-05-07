<div align="center">
  <img src="./client/src/assets/img/logos/suroi_readme.svg">
  <hr />
</div>


<div align="center">
  <img src="https://img.shields.io/badge/node.js%20-%23339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/typescript-%233178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/phaser%20-%232094f3.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/uwebsockets.js%20-%23000000.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/html-%23E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/css-%231572B6?style=for-the-badge&logo=css3" />
  <img src="https://img.shields.io/badge/sass-%23CC6699?style=for-the-badge&logo=sass&logoColor=white" />
  <img src="https://img.shields.io/badge/webpack-%231C78C0.svg?style=for-the-badge&logo=webpack" />
</div>

## About
Suroi is a 2D top-down battle royale game inspired by [surviv.io](https://survivio.fandom.com/wiki/Surviv.io_Wiki). Work in progress.

To learn more about the game, [join our Discord server.](https://discord.suroi.io)

## Installation
Start by installing [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

Next, [click here to download the repo](https://github.com/HasangerGames/suroi/archive/refs/heads/master.zip), or clone it with the following command:
```sh
git clone https://github.com/HasangerGames/suroi.git
```

To install dependencies, open a command line interface in the repo folder, and run this command:
```sh
pnpm full-install
```

This will create a `node_modules` directory in all three folders and link the packages there.

## Development
To run the app locally, in the root of the project, open two terminals.

In one terminal, run the following:
```sh
cd client && pnpm dev
```

In the other, run the following:
```sh
cd server && pnpm dev
```


## Production
To build for production, in the root of the project, execute
```sh
pnpm build
```

Production builds are served using [NGINX](https://nginx.org). A config file can be found [here](nginx.conf).
