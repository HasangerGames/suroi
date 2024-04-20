import { SSLApp, type HttpRequest, type HttpResponse, App, type TemplatedApp } from "uWebSockets.js";
import { Config } from "../config";

export function createServer(): TemplatedApp {
    return Config.ssl
        ? SSLApp({
            key_file_name: Config.ssl.keyFile,
            cert_file_name: Config.ssl.certFile
        })
        : App();
}

/**
 * Apply CORS headers to a response.
 * @param res The response sent by the server.
 */
export function cors(res: HttpResponse): void {
    res.writeHeader("Access-Control-Allow-Origin", "*")
        .writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .writeHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with")
        .writeHeader("Access-Control-Max-Age", "3600");
}

export function forbidden(res: HttpResponse): void {
    res.writeStatus("403 Forbidden").end("403 Forbidden");
}

export const textDecoder = new TextDecoder();

export function getIP(res: HttpResponse, req: HttpRequest): string {
    return Config.ipHeader
        ? req.getHeader(Config.ipHeader) ?? textDecoder.decode(res.getRemoteAddressAsText())
        : textDecoder.decode(res.getRemoteAddressAsText());
}
