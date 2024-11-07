import { readFile, writeFile } from "node:fs/promises";
import { parse } from "hjson";
import { readdirSync } from "node:fs";

export const REFERNCE_LANGUAGE = "en";

export const LANGUAGES_DIRECTORY = "../languages/"

const files = readdirSync(LANGUAGES_DIRECTORY).filter(file => file.endsWith(".hjson"));

export async function buildTranslations() {
  await Promise.all(files.map(async file => {
    writeFile("../../client/public/translations/" + file.slice(0, -".hjson".length) + ".json", JSON.stringify(parse(await readFile(LANGUAGES_DIRECTORY + files[0], "utf8"))))
  }));
}

buildTranslations();
