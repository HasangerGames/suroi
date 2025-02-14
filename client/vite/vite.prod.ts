import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";
import { spritesheet } from "./vite-spritesheet-plugin/spritesheet-plugin";

const config: UserConfig = {
    define: {
        API_URL: JSON.stringify("/api"),
        DEBUG_CLIENT: false
    },
    plugins: [spritesheet(false)]
};

export default mergeConfig(common, config);
