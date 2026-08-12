import { paraglideVitePlugin } from "@inlang/paraglide-js";
import adapter from "@sveltejs/adapter-auto";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { audioSpritesheet } from "./vite/audio-spritesheet-plugin";
import { imageSpritesheet } from "./vite/image-spritesheet-plugin";
import { teamSocket } from "./vite/team-socket-plugin";

export default defineConfig({
    server: {
        port: 3000,
        host: "0.0.0.0"
    },
    preview: {
        port: 3000,
        host: "0.0.0.0"
    },
    plugins: [
		tailwindcss(),
        paraglideVitePlugin({
            project: "./project.inlang",
            outdir: "./src/lib/paraglide",
            strategy: ["url", "cookie", "baseLocale"]
        }),
        enhancedImages(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
                experimental: {
                    async: true
                }
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter(),

            preprocess: vitePreprocess(),

            alias: {
			    "$common/*": "../common/src/*"
		    }
		}),
        imageSpritesheet(),
        audioSpritesheet(),
        teamSocket(),
    ],
    define: {
        IS_CLIENT: true
    }
});
