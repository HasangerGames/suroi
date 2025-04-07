import { mergeConfig, type UserConfig } from "vite";

import common from "./vite.common";

const config: UserConfig = {
    define: {
        API_URL: JSON.stringify("http://localhost:8080/api"),
        DEBUG_CLIENT: true
    }
};

export default mergeConfig(common, config);
