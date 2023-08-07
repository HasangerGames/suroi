import { readFileSync, writeFileSync } from "fs";

interface BanRecord { ip: string, expires?: number }
const banRecords: BanRecord[] = JSON.parse(readFileSync("bannedIPs.json", "utf8"));

const option = process.argv[2];
const ip = process.argv[3];

function unban(ip: string): void {
    const index = banRecords.findIndex(record => record.ip === ip);
    if (index !== -1) banRecords.splice(index, 1);
}

if (option === "ban") {
    unban(ip); // Delete any existing ban records before creating a new one
    const permanent = process.argv[4] === "perm";
    banRecords.push({
        ip,
        expires: permanent ? undefined : Date.now() + 3600000
    });
    console.log(`${ip} banned ${permanent ? "permanently" : "temporarily"}`);
} else if (option === "unban") {
    unban(ip);
    console.log(`${ip} unbanned`);
}

writeFileSync("bannedIPs.json", JSON.stringify(banRecords));
