import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";
import { spritesheet } from "./plugins/spritesheet-plugin";
import { ViteMinifyPlugin } from "vite-plugin-minify";

const config: UserConfig = {
    define: {
        API_URL: JSON.stringify("/api"),
        DEBUG_CLIENT: false
    },
    plugins: [spritesheet(false), ViteMinifyPlugin({})]
};

export default mergeConfig(common, config);
