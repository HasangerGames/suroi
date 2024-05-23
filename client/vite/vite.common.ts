import pkg from "../../package.json";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { splitVendorChunkPlugin, type UserConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { spritesheet } from "./vite-spritesheet-plugin/spritesheet-plugin";

const config: UserConfig = {
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "../index.html"),
                changelog: resolve(__dirname, "../changelog/index.html"),
                news: resolve(__dirname, "../news/index.html"),
                rules: resolve(__dirname, "../rules/index.html"),
                editor: resolve(__dirname, "../editor/index.html"),
                wiki: resolve(__dirname, "../wiki/index.html")
            }
        }
    },

    plugins: [
        svelte(),
        splitVendorChunkPlugin(),
        ViteImageOptimizer({
            test: /\.(svg)$/i,
            logStats: false
        }),
        spritesheet()
    ],

    define: {
        APP_VERSION: JSON.stringify(pkg.version)
    }
};

export default config;
