import { App, SSLApp } from "uWebSockets.js";
import fs from "fs";
import { Config, Debug, getContentType, log } from "@suroi/api/dist/utils";

// Initialize the server
let app;
if(Config.https) {
    app = SSLApp({
        key_file_name: Config.keyFile,
        cert_file_name: Config.certFile
    });
} else {
    app = App();
}

// Set up static files
const staticFiles = {};
function walk(dir: string, files: string[] = []): string[] {
    if(dir.includes(".git") || dir.includes("src") || dir.includes(".vscode") || dir.includes(".idea")) return files;
    const dirFiles = fs.readdirSync(dir);
    for(const f of dirFiles) {
        const stat = fs.lstatSync(dir + "/" + f);
        if(stat.isDirectory()) {
            walk(dir + "/" + f, files);
        } else {
            files.push(dir.slice(12) + "/" + f);
        }
    }
    return files;
}
for(const file of walk("client/dist")) {
    staticFiles[file] = fs.readFileSync("client/dist/" + file);
}

app.get("/*", async (res, req) => {
    const path: string = req.getUrl() === "/" ? "/index.html" : req.getUrl();
    let file: Buffer | undefined;
    if(Debug.disableStaticFileCache) {
        try {
            file = fs.readFileSync("client/dist" + path);
        } catch(e) {
            file = undefined;
        }
    } else {
        file = staticFiles[path];
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    res.onAborted(() => {});

    if(file === undefined) {
        res.writeStatus("404 Not Found");
        res.end(`<!DOCTYPE html><html lang="en"><body><pre>404 Not Found: ${req.getUrl()}</pre></body></html>`);
        return;
    }

    res.writeHeader("Content-Type", getContentType(path)).end(file);
});

// Start the servers
log("Suroi v0.1.0");
app.listen(Config.host, Config.port, () => {
    log(`Listening on ${Config.host}:${Config.port}`);
    log("Press Ctrl+C to exit.");
});
