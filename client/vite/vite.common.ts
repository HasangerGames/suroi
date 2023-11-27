import pkg from "../../package.json";

import { splitVendorChunkPlugin, type UserConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { spritesheet } from "vite-spritesheet-plugin";
import { resolve } from "path";

const config: UserConfig = {

    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "../index.html"),
                changelog: resolve(__dirname, "../changelog/index.html"),
                news: resolve(__dirname, "../news/index.html"),
                rules: resolve(__dirname, "../rules/index.html")
            }
        }
    },

    plugins: [
        splitVendorChunkPlugin(),
        ViteImageOptimizer({
            test: /\.(svg)$/i,
            logStats: false
        }),
        spritesheet({
            patterns: [{
                rootDir: "public/img/game"
            }],
            options: {
                outputFormat: "png",
                margin: 5,
                removeExtensions: true
            }
        })
    ],

    define: {
        APP_VERSION: JSON.stringify(`${pkg.version}`)
    }
};

export default config;
