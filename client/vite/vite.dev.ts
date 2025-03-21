import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";
import { spritesheet } from "./plugins/image-spritesheet-plugin";
import { audioSpritesheet } from "./plugins/audio-spritesheet-plugin";

const config: UserConfig = {
    define: {
        API_URL: JSON.stringify("http://localhost:8080/api"),
        DEBUG_CLIENT: true
    },

    plugins: [
        spritesheet(true),
        audioSpritesheet(true)
    ]
};

export default mergeConfig(common, config);
