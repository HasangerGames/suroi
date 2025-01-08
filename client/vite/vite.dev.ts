import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";
import { spritesheet } from "./vite-spritesheet-plugin/spritesheet-plugin";

const config: UserConfig = {
    server: {
        port: 3000,
        strictPort: true,
        host: "0.0.0.0"

    },
    preview: {
        port: 3000,
        strictPort: true,
        host: "0.0.0.0"
    },

    define: {
        API_URL: JSON.stringify("http://localhost:8080/api")
    },

    plugins: [spritesheet(true)]
};

export default mergeConfig(common, config);
