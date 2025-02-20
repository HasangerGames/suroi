import { IncomingMessage, ServerResponse } from "node:http";
import { Config } from "../config";

export function forbidden(resp: ServerResponse): void {
    resp.statusCode = 403;
    resp.end("403 Forbidden");
}

export function getIP(req: IncomingMessage): string {
    return (Config.ipHeader ? req.headers[Config.ipHeader] as string : req.socket.remoteAddress) ?? "";
}
