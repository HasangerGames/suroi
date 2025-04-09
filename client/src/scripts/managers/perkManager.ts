import { PerkManager, type PerkCollection } from "@common/utils/perkManager";

class ClientPerkManagerClass extends PerkManager {
    overwrite(perks: PerkCollection): void {
        this._items = perks.asBitfield();
    }
}

export const ClientPerkManager = new ClientPerkManagerClass();
