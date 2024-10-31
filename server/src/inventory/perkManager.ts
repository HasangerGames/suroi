import { AnimationType, GameConstants } from "@common/constants";
import { PerkIds, type PerkDefinition, type PerkNames } from "@common/definitions/perks";
import { PerkManager } from "@common/utils/perkManager";
import { type Player } from "../objects";
import { GunItem } from "./gunItem";

export class ServerPerkManager extends PerkManager {
    constructor(
        readonly owner: Player,
        perks?: number | readonly PerkDefinition[]
    ) {
        super(perks);
    }

    /**
     * Adds a perk to this manager
     * @param perk The perk to add
     * @returns Whether the perk was already present (and thus nothing has changed)
     */
    override addPerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object"
            ? perk.idString
            : perk;
        const absent = super.addPerk(perk);

        if (absent) {
            // ! evil starts here
            // some perks need to perform setup when added
            switch (idString) {
                case PerkIds.PlumpkinBomb: {
                    this.owner.halloweenThrowableSkin = true;
                    this.owner.animation = AnimationType.UpdateThrowableSpriteToHalloween;
                    this.owner.setPartialDirty();
                    break;
                }
                case PerkIds.Lycanthropy: {
                    this.owner.action?.cancel();
                    this.owner.inventory.dropWeapon(0, true)?.destroy();
                    this.owner.inventory.dropWeapon(1, true)?.destroy();

                    // Drop all throwables
                    while (this.owner.inventory.getWeapon(3)) {
                        this.owner.inventory.dropWeapon(3, true)?.destroy();
                    }

                    /* TODO: continue crying */
                    break;
                }
                case PerkIds.ExtendedMags: {
                    const weapons = this.owner.inventory.weapons;
                    const maxWeapons = GameConstants.player.maxWeapons;
                    for (let i = 0; i < maxWeapons; i++) {
                        const weapon = weapons[i];

                        if (!(weapon instanceof GunItem)) continue;

                        const def = weapon.definition;

                        if (def.extendedCapacity === undefined) continue;

                        const extra = weapon.ammo - def.extendedCapacity;
                        if (extra > 0) {
                            // firepower is anti-boosting this weapon, we need to shave the extra rounds off
                            weapon.ammo = def.extendedCapacity;
                            this.owner.inventory.giveItem(def.ammoType, extra);
                        }
                    }
                    break;
                }

                default: {
                    this.owner.animation = AnimationType.UpdateThrowableSpriteToNormal;
                    this.owner.setPartialDirty();
                }
            }
            // ! evil ends here
        }

        this.owner.dirty.perks ||= absent;
        return absent;
    }

    /**
     * Removes a perk from this manager
     * @param perk The perk to remove
     * @returns Whether the perk was present (and therefore removed, as opposed
     * to not being removed due to not being present to begin with)
     */
    override removePerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object" ? perk.idString : perk;

        const has = super.removePerk(perk);

        if (has) {
            // ! evil starts here
            // some perks need to perform cleanup on removal
            switch (idString) {
                case PerkIds.Lycanthropy: { /* TODO: cry */ break; }
                case PerkIds.ExtendedMags: {
                    const weapons = this.owner.inventory.weapons;
                    const maxWeapons = GameConstants.player.maxWeapons;
                    for (let i = 0; i < maxWeapons; i++) {
                        const weapon = weapons[i];

                        if (!(weapon instanceof GunItem)) continue;

                        const def = weapon.definition;
                        const extra = weapon.ammo - def.capacity;
                        if (extra > 0) {
                            // firepower boosted this weapon, we need to shave the extra rounds off
                            weapon.ammo = def.capacity;
                            this.owner.inventory.giveItem(def.ammoType, extra);
                        }
                    }
                    break;
                }
            }
            // ! evil ends here
        }

        this.owner.dirty.perks ||= has;
        return has;
    }
}
