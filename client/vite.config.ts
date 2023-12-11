import pkg from "../package.json" assert { type: "json" };

import { defineConfig } from "vite";

import prodConfig from "./vite/vite.prod.js";
import devConfig from "./vite/vite.dev.js";

import { existsSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const DIRNAME = dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ command, mode }) => {
    // temporary hack until svelte rewrite
    process.env = {
        ...process.env,
        VITE_APP_VERSION: pkg.version
    };

    // So output directory isn't included (thanks Vite).
    if (command === "serve" && mode === "development") {
        if (existsSync(resolve(DIRNAME, "./dist"))) { rmSync(resolve(DIRNAME, "./dist"), { recursive: true, force: true }); }
    }

    return command === "serve" ? devConfig : prodConfig;
});
