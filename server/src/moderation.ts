import { readFileSync, writeFileSync } from "fs";
import { type Punishment } from "./server";

const punishments: Record<string, Punishment> = JSON.parse(readFileSync("punishments.json", "utf8"));
const ip = process.argv[3];
const now = Date.now();

switch (process.argv[2]) {
    case "warn": {
        punishments[ip] = { type: "warning" };
        console.log(`${ip} warned`);
        break;
    }
    case "ban": {
        const permanent = process.argv[4] === "perm";
        punishments[ip] = {
            type: permanent ? "permaBan" : "tempBan",
            expires: permanent ? undefined : now + 3600000 // = 1 day
        };
        console.log(`${ip} banned ${permanent ? "permanently" : "temporarily"}`);
        break;
    }
    case "unban": {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete punishments[ip];
        console.log(`${ip} unbanned`);
        break;
    }
}

writeFileSync("punishments.json", JSON.stringify(punishments, null, 4));
