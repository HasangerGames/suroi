import { existsSync, readFileSync, writeFileSync } from "fs";
import type { ConfigSchema } from "./config.d";

let configExists = existsSync("config.json");
if (!configExists && existsSync("config.example.json")) {
    writeFileSync("config.json", readFileSync("config.example.json", "utf8"));
    configExists = true;
}

const BaseConfig = await import("../../config.json") as ConfigSchema;

export const Config: ConfigSchema = {
    ...BaseConfig,
    // Use environment variables if present, otherwise fall back to config.json
    hostname: process.env.HOSTNAME || "0.0.0.0",
    port: Number(process.env.PORT) || BaseConfig.port
};
