import { FSWatcher, watch } from "chokidar";
import { readFileSync } from "fs";
import path from "path";
import type { Plugin } from "vite";
import fm from "front-matter";
import { marked } from "marked";
import { readDirectory } from "../../../common/src/utils/readDirectory";

const PLUGIN_NAME = "vite-news-posts-plugin";
const VIRTUAL_MODULE_ID = "virtual:news-posts";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const POSTS_DIR = "src/newsPosts";

export interface NewsPost {
    readonly title: string
    readonly author: string
    readonly date: string
    readonly bannerImage?: string
    readonly description?: string
    readonly body?: string
}
const REQUIRED_FIELDS: Array<keyof NewsPost> = ["title", "author", "date"];

const posts: NewsPost[] = [];

const resolveId = (id: string): string | undefined => {
    if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
};

const load = (id: string): string | undefined => {
    if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `export const posts = ${JSON.stringify(posts)}`;
    }
};

function makeSortable(filename: string): string {
    return filename
        .slice(filename.lastIndexOf(path.sep))
        .replace(/\d+/g, n => (parseInt(n) + 100).toString());
}

async function processPosts(): Promise<void> {
    posts.length = 0;
    const files = readDirectory(POSTS_DIR)
        // sort by version
        .sort((a, b) => makeSortable(b).localeCompare(makeSortable(a)));
    for (const file of files) {
        const post = fm(readFileSync(path.resolve(POSTS_DIR, file), "utf8"));
        const attributes = post.attributes as NewsPost;

        for (const field of REQUIRED_FIELDS) {
            if (attributes[field] === undefined) {
                console.error(`Post ${file}: Missing field '${field}'`);
            }
        }

        // awful hack to make links open in a new tab
        const parse = async(text: string): Promise<string> => (await marked.parse(text)).replace("<a href=", '<a target="_blank" href=');

        const { title, author, date, bannerImage } = attributes;
        const [description, body] = post.body.split("***") as [string, string?];
        posts.push({
            title,
            author,
            date,
            bannerImage,
            description: await parse(description),
            body: body ? await parse(body) : undefined
        });
    }
}

export function newsPosts(): Plugin[] {
    let watcher: FSWatcher;
    let buildTimeout: NodeJS.Timeout | undefined;

    return [
        {
            name: `${PLUGIN_NAME}:build`,
            apply: "build",
            async buildStart() {
                await processPosts();
            },
            resolveId,
            load
        },
        {
            name: `${PLUGIN_NAME}:serve`,
            apply: "serve",
            async configureServer(server) {
                const reloadPage = (): void => {
                    clearTimeout(buildTimeout);

                    buildTimeout = setTimeout(() => {
                        void processPosts().then(() => {
                            const module = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
                            if (module !== undefined) void server.reloadModule(module);
                        });
                    }, 500);
                };

                watcher = watch("src/newsPosts", {
                    ignoreInitial: true
                })
                    .on("change", reloadPage)
                    .on("unlink", reloadPage);

                await processPosts();
            },
            closeBundle: async() => {
                await watcher.close();
            },
            resolveId,
            load
        }
    ];
}
