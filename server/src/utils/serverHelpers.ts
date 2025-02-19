import { IncomingMessage, ServerResponse } from "node:http";
import { Config } from "../config";

/**
 * Apply CORS headers to a response.
 * @param resp The response sent by the server.
 */
export function cors(resp: ServerResponse): void {
    resp.setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with")
        .setHeader("Access-Control-Max-Age", "3600");
}

export function forbidden(resp: ServerResponse): void {
    resp.statusCode = 403;
    resp.end("403 Forbidden");
}

export function getIP(req: IncomingMessage): string {
    return (Config.ipHeader ? req.headers[Config.ipHeader] as string : req.socket.remoteAddress) ?? "";
}
