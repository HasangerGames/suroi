import pkg from "../../package.json";

import type { UserConfig } from "vite";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const DIRNAME = dirname(fileURLToPath(import.meta.url));
const config: UserConfig = {
    build: {
        // So the output directory isn't included (thanks, Vite).
        rollupOptions: {
            input: [
                resolve(DIRNAME, "../index.html"),
                resolve(DIRNAME, "../changelog/index.html"),
                resolve(DIRNAME, "../news/index.html"),
                resolve(DIRNAME, "../rules/index.html")
            ]
        }
    },
    define: {
        APP_VERSION: JSON.stringify(`${pkg.version}`)
    }
};

export default config;
