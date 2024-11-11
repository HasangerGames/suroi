import type { PerkDefinition } from "@common/definitions/perks";
import type { PerkCollection } from "@common/packets/updatePacket";
import { PerkManager } from "@common/utils/perkManager";
import type { Game } from "../game";

export class ClientPerkManager extends PerkManager {
    constructor(readonly game: Game, perks?: number | readonly PerkDefinition[]) {
        super(perks);
    }

    overwrite(perks: PerkCollection): void {
        this._perks = perks.asBitfield();
    }
}
