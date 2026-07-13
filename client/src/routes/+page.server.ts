import { GameConstants } from "$common/constants";
import { Config, type ServerInfo } from "$lib/scripts/utils/config";
import type { PageLoad } from "./$types";

export const ssr = false;

// export const load: PageLoad = async() => {
//     const { regions } = Config;
//     await Promise.all(Object.entries(regions).map(async([id, region]) => {
//         let info: ServerInfo | undefined;

//         for (let attempts = 0; attempts < 3; attempts++) {
//             console.log(`Loading server info for region ${id}: ${region.mainAddress} (attempt ${attempts + 1} of 3)`);
//             try {
//                 const response = await fetch(`${region.mainAddress}/api/serverInfo`, { signal: AbortSignal.timeout(10000) });
//                 info = await response.json() as ServerInfo;
//                 if (info) break;
//             } catch (e) {
//                 console.error(`Error loading server info for region ${id}. Details:`, e);
//             }
//         }

//         if (!info) {
//             console.error(`Unable to load server info for region ${id} after 3 attempts`);
//             return;
//         }

//         if (info.protocolVersion !== GameConstants.protocolVersion) {
//             console.error(`Protocol version mismatch for region ${id}. Expected ${GameConstants.protocolVersion} (ours), got ${info.protocolVersion} (theirs)`);
//             return;
//         }

//         regions[id] = { ...region, ...info };

//         console.log(`Loaded server info for region ${id}`);
//     }));
// 	return { regions };
// };

