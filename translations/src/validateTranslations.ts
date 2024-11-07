import english from "../languages/english";
import { TranslationMap } from "../translations";
import { Guns, Melees, Throwables } from "@common/definitions";
import { readdir, writeFile } from "fs/promises";

(async () => {
  const languageFiles = await readdir("../languages/");
  let reportContents = `# Translation File Report

File generated on ${new Date(Date.now()).toUTCString()}

`;

  const languages: Record<string, TranslationMap> = {};

  await Promise.all(languageFiles
    .map(async (file) => [file, await import("../languages/" + file)] satisfies [string, any])
    .map(async (contentPromise) => {
      const content = await contentPromise;
      languages[content[0]] = content[1].default;
    }));

  const keyFilter = (key: string) => (
    key !== "name" &&
    key !== "flag" &&
    !Guns.hasString(key) &&
    !Melees.hasString(key) &&
    !Throwables.hasString(key)
  )

  console.log(Object.keys(english))
  const validKeys = Object.keys(english).filter(keyFilter);

  // HACK: Yeah sorry for hard coding english.ts
  for (const [file, content] of Object.entries(languages).filter(([file, _]) => file !== "english.ts")) {
    let buffer = `## ${content.flag} ${content.name} (${file})\n\n`
    let flawless = true;

    const keys = Object.keys(content).filter(keyFilter)

    for (const key of keys) {
      if (validKeys.find(k => k === key)) continue;
      buffer += `- Key \`${key}\` is invalid\n`
      flawless = false;
    }

    for (const key of validKeys) {
      if (content[key]) continue;
      buffer += `- Key \`${key}\` is not defined\n`;
      flawless = false;
    }

    if (flawless) {
      buffer += `No problems reported!\n`
    }
    buffer += "\n";

    reportContents += buffer;
  }

  await writeFile("../README.md", reportContents);

  console.log(reportContents);
  console.log("Report is also avaliable in translations/README.md");
})()
