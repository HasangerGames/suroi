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
Suroi is an open-source 2D battle royale game inspired by [surviv.io](https://survivio.fandom.com/wiki/Surviv.io_Wiki). Work in progress.

To learn more about the game, [join our Discord server.](https://discord.suroi.io)

## Installation and setup
Start by installing [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

Next, [click here to download the repo](https://github.com/HasangerGames/suroi/archive/refs/heads/master.zip), or clone it with the following command:
```sh
git clone https://github.com/HasangerGames/suroi.git
```

To install dependencies, open a terminal in the project root, and run this command:
```sh
pnpm full-install
```

This will create a `node_modules` directory in all three folders (`client`, `common`, and `server`) and link the packages there.

Finally, to build the texture atlas, run this command in the `client` folder:
```sh
pnpm build-atlas
```

## Development
To run the game locally, open a terminal in the project root and run the following:

```sh
pnpm dev
```
To open the game, go to http://127.0.0.1:3000 in your browser.

## Production
To build for production, run this command in the project root:
```sh
pnpm build
```

To start the WebSocket server, run this command:
```sh
pnpm start
```

Production builds are served using [NGINX](https://nginx.org). A config file can be found [here](nginx.conf).
