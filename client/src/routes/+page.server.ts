import { type GameInfo, GamesApiResponse } from "$common/schemas/api/games";
import type { Region } from "$common/schemas/misc";
import { randomBackground } from "$lib/scripts/data/backgrounds";
import { randomMarqueeText } from "$lib/scripts/data/marqueeTexts";
import { Config } from "$lib/scripts/utils/config";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async({ depends }) => {
    depends("app:games");

    const games: GameInfo[] = [];

    await Promise.all(Object.entries(Config.regions).map(async([id, region]) => {
        let regionGames: GamesApiResponse | undefined;

        console.log(`Loading server info for region ${id}: ${region.mainAddress}`);
        try {
            const response = await fetch(`${region.mainAddress}/api/game/list`, { signal: AbortSignal.timeout(10000) });
            regionGames = GamesApiResponse.parse(await response.json());
        } catch (e) {
            console.error(`Error loading server info for region ${id}. Details:`, e);
        }

        if (regionGames === undefined) {
            console.error(`Unable to load server info for region ${id}`);
            return;
        }

        for (const game of regionGames) {
            games.push({ ...game, region: id as Region });
        }

        console.log(`Loaded server info for region ${id}`);
    }));

	return {
        games,
        background: randomBackground(),
        marqueeText: randomMarqueeText()
    };
};

