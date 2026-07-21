import { type GameInfo, GamesApiResponse } from "$common/schemas/api/games";
import type { Region } from "$common/schemas/misc";
import { Config } from "$lib/scripts/utils/config";
import type { PageServerLoad } from "./$types";

export const ssr = false;

export const load: PageServerLoad = async({ depends }) => {
    depends("app:games");

    const games: GameInfo[] = [];

    await Promise.all(Object.entries(Config.regions).map(async([id, region]) => {
        let regionGames: GamesApiResponse | undefined;

        for (let attempts = 0; attempts < 3; attempts++) {
            console.log(`Loading server info for region ${id}: ${region.mainAddress} (attempt ${attempts + 1} of 3)`);
            try {
                const response = await fetch(`${region.mainAddress}/api/game/list`, { signal: AbortSignal.timeout(10000) });
                regionGames = GamesApiResponse.parse(await response.json());
                if (regionGames) break;
            } catch (e) {
                console.error(`Error loading server info for region ${id}. Details:`, e);
            }
        }

        if (!regionGames) {
            console.error(`Unable to load server info for region ${id} after 3 attempts`);
            return;
        }

        for (const game of regionGames) {
            games.push({ ...game, region: id as Region });
        }

        console.log(`Loaded server info for region ${id}`);
    }));

	return { games };
};

