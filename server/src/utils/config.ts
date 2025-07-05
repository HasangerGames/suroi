import { existsSync, readFileSync, writeFileSync } from "fs";

if (!existsSync("config.json") && existsSync("config.example.json")) {
    writeFileSync("config.json", readFileSync("config.example.json", "utf8"));
}

import type { ConfigSchema } from "./config.d";
export const Config = JSON.parse(readFileSync("config.json", "utf8")) as ConfigSchema;
