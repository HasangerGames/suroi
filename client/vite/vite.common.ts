import { svelte } from "@sveltejs/vite-plugin-svelte";
import path, { resolve } from "path";
import { splitVendorChunkPlugin, type UserConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import pkg from "../../package.json";
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
        /**
         * This is a bad idea, but configuration for this is unnecessary until frontend overhaul is done
         */
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        splitVendorChunkPlugin(),
        ViteImageOptimizer({
            test: /\.(svg)$/i,
            logStats: false
        }),
        spritesheet()
    ],

    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler"
            }
        }
    },

    resolve: {
        alias: {
            "@common": path.resolve(__dirname, "../../common/src")
        }
    },

    define: {
        APP_VERSION: JSON.stringify(pkg.version)
    }
};

export default config;
