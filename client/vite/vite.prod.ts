import { createHash, randomBytes } from "crypto";
import { mergeConfig, type UserConfig } from "vite";

import { spritesheet } from "vite-spritesheet-plugin";

import common from "./vite.common";

const ATLAS_HASH = createHash("sha256").update(randomBytes(512)).digest("hex").slice(0, 8);

const config: UserConfig = {
    build: {
        rollupOptions: {
            // todo: better asset naming
            output: {
                entryFileNames: "assets/lib/[hash].js",
                assetFileNames: "assets/lib/[hash][extname]",
                chunkFileNames: "assets/lib/[hash].js"
            }
        }
    },

    // todo: better chunk management
    resolve: {
        dedupe: ["pixi.js", "jquery"]
    },

    plugins: [
        spritesheet({
            patterns: [{
                rootDir: "public/assets/img/game",
                outDir: "assets/img/atlases",
                filename: `main.${ATLAS_HASH}.png`
            }],

            compilerOptions: {
                format: "png",
                margin: 5,
                svgo: false
            }
        })
    ],

    define: {
        API_URL: JSON.stringify("/api"),
        ATLAS_HASH: JSON.stringify(ATLAS_HASH)
    }
};

export default mergeConfig(common, config);
