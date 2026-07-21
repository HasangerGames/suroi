import z from "zod";
import { ClientConfig } from "./schemas/config/clientConfig";
import { ServerConfig } from "./schemas/config/serverConfig";

async function initConfig(schema: z.ZodObject, folder: string) {
    const configSchemaFile = Bun.file(`${folder}/config.schema.json`);
    const configSchemaJson = JSON.stringify(schema.toJSONSchema({ io: "input" }), null, 4);
    Bun.write(configSchemaFile, configSchemaJson);

    const configFile = Bun.file(`${folder}/config.json`);
    if (!(await configFile.exists())) {
        const configJson = `{\n    "$schema": "config.schema.json"\n}`;
        Bun.write(configFile, configJson);
    }
}

void initConfig(ClientConfig, "client");
void initConfig(ServerConfig, "server");
