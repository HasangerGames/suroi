import pkg from "../../package.json";

import { splitVendorChunkPlugin, type UserConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

const config: UserConfig = {
    plugins: [
        splitVendorChunkPlugin(),
        ViteImageOptimizer({
            test: /\.(svg)$/i,
            logStats: false
        })
    ],

    define: {
        APP_VERSION: JSON.stringify(`${pkg.version}`)
    }
};

export default config;
