import { ClientConfig } from "./schemas/config/clientConfig";

void (async() => {
    const configSchemaFile = Bun.file("./client/src/config.schema.json");
    const configSchemaJson = JSON.stringify(ClientConfig.toJSONSchema(), null, 4);
    Bun.write(configSchemaFile, configSchemaJson);

    const configFile = Bun.file("./client/src/config.json");
    if (!(await configFile.exists())) {
        const configJson = `{
    "$schema": "config.schema.json"
}`;
        Bun.write(configFile, configJson);
    }
})();
