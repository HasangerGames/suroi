import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";
import { spritesheet } from "./plugins/image-spritesheet-plugin";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import { audioSpritesheet } from "./plugins/audio-spritesheet-plugin";

const config: UserConfig = {
    define: {
        API_URL: JSON.stringify("/api"),
        DEBUG_CLIENT: false
    },
    plugins: [
        spritesheet(false),
        audioSpritesheet(false),
        ViteMinifyPlugin()
    ]
};

export default mergeConfig(common, config);
