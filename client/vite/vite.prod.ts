import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";

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

    define: {
        API_URL: JSON.stringify("/api")
    }
};

export default mergeConfig(common, config);
