import pkg from "../../package.json";

import { splitVendorChunkPlugin, type UserConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { spritesheet } from "vite-spritesheet-plugin";

const config: UserConfig = {
    plugins: [
        splitVendorChunkPlugin(),
        ViteImageOptimizer({
            test: /\.(svg)$/i,
            logStats: false
        }),
        spritesheet({
            patterns: [{
                rootDir: "public/assets/img/game",
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
