import * as fs from "fs";

/**
 * Read a JSON file.
 * @param path The path to the JSON file.
 */
export const readJSON = <T>(path: string): T => JSON.parse(fs.readFileSync(path, "utf-8")) as T;

export interface Configuration {
    host: string
    port: number
    ssl: {
        keyFile: string
        certFile: string
        enable: boolean
    }
    movementSpeed: number
    diagonalSpeed: number
    debug: Record<string, unknown>
}

export const Config = readJSON<Configuration>("config.json");
Config.diagonalSpeed = Config.movementSpeed / Math.SQRT2;
