import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "hjson";

readdirSync(".")
    .filter(file => file.endsWith(".hjson"))
    .forEach(file =>
        writeFileSync(
            `messages/${file.replace(".hjson", ".json")}`,
            JSON.stringify({
                "$schema": "https://inlang.com/schema/inlang-message-format",
                ...Object.fromEntries(
                    Object
                        .entries(parse(readFileSync(file, "utf8")))
                        .filter(([key]) => !["mandatory", "no_space", "no_resize", "percentage", "html_lang"].includes(key)))
            }, null, 4)
        )
    );
