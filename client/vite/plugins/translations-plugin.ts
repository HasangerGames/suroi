import { Badges } from "../../../common/src/definitions/badges";
import { Emotes } from "../../../common/src/definitions/emotes";
import { Guns } from "../../../common/src/definitions/items/guns";
import { Melees } from "../../../common/src/definitions/items/melees";
import { Throwables } from "../../../common/src/definitions/items/throwables";
import { FSWatcher, watch } from "chokidar";
import { readFileSync } from "fs";
import { parse } from "hjson";
import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

const PLUGIN_NAME = "vite-translations-plugin";

export const REFERENCE_LANGUAGE = "en";
export const LANGUAGES_DIRECTORY = "src/translations/";

const files = readdirSync(LANGUAGES_DIRECTORY).filter(file => file.endsWith(".hjson")).sort();

const virtualModuleIds = [
    "virtual:translations-manifest",
    ...files.map(f => `virtual:translations-${f.slice(0, -".hjson".length)}`)
];

const resolveId = (id: string): string | undefined => virtualModuleIds.includes(id) ? id : undefined;

const load = (id: string): string | undefined => translationsCache.get(id);

const translationsCache = new Map<string, string>();

const METADATA_KEYS = ["name", "flag", "mandatory", "no_space", "no_resize", "percentage", "html_lang"];

const regions = ["region_1v1", "region_ea1v1", "region_test"];

const keyFilter = (key: string): boolean => (
    !METADATA_KEYS.includes(key)
    && !Guns.hasString(key)
    && !Melees.hasString(key)
    && !Throwables.hasString(key)
    && !Emotes.hasString(key)
    && !Badges.hasString(key)
    && !regions.includes(key)
);

function calculateValidRatio(keys: string[], validKeys: readonly string[]): number {
    return keys.filter(key => validKeys.includes(key)).length / validKeys.length;
}

export interface TranslationManifest {
    readonly name: string
    readonly flag: string
    readonly percentage: string
    /** Loading the language is required on client */
    readonly mandatory?: boolean
    readonly no_resize?: boolean
    readonly no_space?: boolean
    readonly html_lang?: string
}
export type TranslationsManifest = Record<string, TranslationManifest>;

export async function buildTranslations(): Promise<void> {
    const start = performance.now();

    const manifest: TranslationsManifest = {};

    let reportBuffer = `# Translation File Reports

This file is a report of all errors and missing keys in the translation files of this game.

`;

    const ValidKeys: readonly string[] = Object.keys(parse(readFileSync(`${LANGUAGES_DIRECTORY + REFERENCE_LANGUAGE}.hjson`, "utf8")) as Record<string, unknown>)
        .filter(keyFilter);

    for (const filename of files) {
        const language = filename.slice(0, -".hjson".length);
        const content = parse(await readFile(LANGUAGES_DIRECTORY + filename, "utf8")) as Record<string, string>;

        manifest[language] = {
            name: content.name,
            flag: content.flag,
            mandatory: Boolean(content.mandatory),
            no_resize: Boolean(content.no_resize),
            no_space: Boolean(content.no_space),
            percentage: content.percentage ?? `${Math.round(100 * calculateValidRatio(Object.keys(content), ValidKeys))}%`
        };

        translationsCache.set(`virtual:translations-${language}`, `export const translations=${JSON.stringify(content)}`);

        const keys = Object.keys(content).filter(keyFilter);

        let languageReportBuffer = `## ${content.flag} ${content.name} (${Math.round(100 * calculateValidRatio(keys, ValidKeys))}% Complete) - ${filename}\n\n`;

        // Find invalid keys
        const invalidKeys = keys.filter(k => !ValidKeys.includes(k)).map(key => `- Key \`${key}\` is not a valid key`).join("\n");
        if (invalidKeys.length > 0) {
            languageReportBuffer += `### Invalid Keys\n\n${invalidKeys}\n\n`;
        } else {
            languageReportBuffer += "### (No Invalid Keys)\n\n";
        }

        // Find undefined keys
        const undefinedKeys = ValidKeys.filter(k => !keys.includes(k)).map(key => `- Key \`${key}\` is not defined`).join("\n");
        if (undefinedKeys.length > 0) {
            languageReportBuffer += `### Undefined Keys\n\n${undefinedKeys}\n\n`;
        } else {
            languageReportBuffer += "### (No Undefined Keys)\n\n";
        }

        reportBuffer += languageReportBuffer;
    }

    const cases = files.map(f => {
        const lang = f.slice(0, -".hjson".length);
        return `case "${lang}":return (await import("virtual:translations-${lang}")).translations;`;
    }).join("");
    translationsCache.set("virtual:translations-manifest", `export const manifest=${JSON.stringify(manifest)};export const importTranslation=async t=>{switch(t){${cases}}}`);

    await writeFile("../TRANSLATIONS_REPORT.md", reportBuffer);
    await buildTypings(ValidKeys);

    console.log(`Built translations for ${files.length} languages in ${Math.round(performance.now() - start)} ms`);
}

export async function buildTypings(keys: readonly string[]): Promise<void> {
    let buffer = "// WARN: THIS FILE IS AUTOGENERATED. DO NOT EDIT!\n";
    buffer += "export type TranslationKeys=";
    buffer += [
        ...keys,
        ...Guns.definitions.map(({ idString }) => idString),
        ...Melees.definitions.map(({ idString }) => idString),
        ...Throwables.definitions.map(({ idString }) => idString)
    ].sort().map(key => `"${key}"`).join("\n|");
    buffer += ";";

    await writeFile("src/scripts/utils/translations/typings.ts", buffer);
}

export function translations(): Plugin[] {
    let watcher: FSWatcher;
    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await buildTranslations();
            },
            resolveId,
            load
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            async configureServer(server) {
                await buildTranslations();

                watcher = watch("src/translations").on("change", (filename: string): void => {
                    clearTimeout(buildTimeout);

                    buildTimeout = setTimeout(() => {
                        void buildTranslations().then(() => {
                            const id = filename.slice(filename.lastIndexOf(path.sep) + 1, -".hjson".length);
                            const module = server.moduleGraph.getModuleById(`virtual:translations-${id}`);
                            if (module !== undefined) void server.reloadModule(module);
                            const module2 = server.moduleGraph.getModuleById("virtual:translations-manifest");
                            if (module2 !== undefined) void server.reloadModule(module2);
                        });
                    }, 500);
                });
            },
            closeBundle: async() => {
                await watcher.close();
            },
            resolveId,
            load
        }
    ];
}
