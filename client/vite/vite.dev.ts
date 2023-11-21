import { mergeConfig, type UserConfig } from "vite";

import { spritesheet } from "../node_modules/vite-spritesheet-plugin/dist/index.js";

import common from "./vite.common";

const config: UserConfig = {
    server: {
        port: 3000,
        strictPort: true
    },
    preview: {
        port: 3000,
        strictPort: true
    },

    plugins: [
        spritesheet({
            patterns: [{
                rootDir: "public/assets/img/game",
                outDir: "assets/img/atlases",
                filename: "main.dev.png"
            }],

            compilerOptions: {
                format: "png",
                margin: 5,
                svgo: false
            }
        })
    ],

    define: {
        API_URL: JSON.stringify("http://localhost:8080/api"),
        ATLAS_HASH: JSON.stringify("dev")
    }
};

export default mergeConfig(common, config);
