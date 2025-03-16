import { PerkManager, type PerkCollection } from "@common/utils/perkManager";

export const ClientPerkManager = new (class ClientPerkManager extends PerkManager {
    overwrite(perks: PerkCollection): void {
        this._items = perks.asBitfield();
    }
})();
