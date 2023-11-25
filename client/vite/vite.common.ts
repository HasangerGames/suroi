import pkg from "../../package.json";

import type { UserConfig } from "vite";

const config: UserConfig = {
    define: {
        APP_VERSION: JSON.stringify(`${pkg.version}`)
    }
};

export default config;
