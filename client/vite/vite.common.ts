import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { type UserConfig } from "vite";
import pkg from "../package.json";
import { audioSpritesheet } from "./plugins/audio-spritesheet-plugin";
import { imageSpritesheet } from "./plugins/image-spritesheet-plugin";
import { newsPosts } from "./plugins/news-posts-plugin";
import { translations } from "./plugins/translations-plugin";

const commonConfig: UserConfig = {
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
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
                experimental: {
                    async: true
                }
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter(),

            alias: {
			    "$common/*": "../common/src/*"
		    }
		}),
        imageSpritesheet(),
        audioSpritesheet(),
        newsPosts(),
        translations()
    ],
    define: {
        IS_CLIENT: true,
        APP_VERSION: JSON.stringify(pkg.version)
    }
};

export default commonConfig;
