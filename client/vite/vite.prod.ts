import { mergeConfig, type UserConfig } from "vite";

import { ViteMinifyPlugin } from "vite-plugin-minify";
import common from "./vite.common";

const config: UserConfig = {
    define: {
        API_URL: JSON.stringify("/api"),
        DEBUG_CLIENT: false
    },
    plugins: [ViteMinifyPlugin()]
};

export default mergeConfig(common, config);
