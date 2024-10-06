import { GameConstants } from "@common/constants";
import { PerkIds, Perks, type PerkDefinition, type PerkNames } from "@common/definitions/perks";
import { type PerkCollection } from "@common/packets/updatePacket";
import { type Player } from "../objects";
import { GunItem } from "./gunItem";

export class PerkManager implements Iterable<PerkDefinition>, PerkCollection {
    // this is a bitfield
    // change to bigint once perk count exceeds 30
    private _perks = 0;

    constructor(
        readonly owner: Player,
        perks?: number | readonly PerkDefinition[]
    ) {
        // @ts-expect-error we write terse code and stay winning
        if (typeof (this._perks = (perks ?? 0)) === "object") {
            this._perks = (perks as readonly PerkDefinition[])
                .map(({ idString }) => 1 << Perks.idStringToNumber[idString])
                .reduce((acc, cur) => acc + cur, 0);
        }
    }

    /**
     * Adds a perk to this manager
     * @param perk The perk to add
     * @returns Whether the perk was already present (and thus nothing has changed)
     */
    addPerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object"
            ? perk.idString
            : perk;

        const n = 1 << Perks.idStringToNumber[idString];
        const absent = (this._perks & n) === 0;
        this._perks |= n;

        if (absent) {
            // ! evil starts here
            // some perks need to perform setup when added
            switch (idString) {
                case PerkIds.Werewolf: {
                    this.owner.inventory.dropWeapon(0, true);
                    this.owner.inventory.dropWeapon(1, true);
                    /* TODO: continue crying */
                    break;
                }
                case PerkIds.SecondWind: { /* not applicable */ break; }
                case PerkIds.Overstimmed: { /* not applicable */ break; }
                case PerkIds.Splinter: { /* not applicable */ break; }
                case PerkIds.Sabot: { /* not applicable */ break; }
                case PerkIds.HiCap: {
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
                case PerkIds.Engorged: { /* not applicable */ break; }
                case PerkIds.Recycling: { /* not applicable */ break; }
                case PerkIds.DemoExport: { /* not applicable */ break; }
            }
            // ! evil ends here
        }

        this.owner.dirty.perks ||= absent;
        return absent;
    }

    hasPerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object" ? perk.idString : perk;
        return (this._perks & (1 << Perks.idStringToNumber[idString])) !== 0;
    }

    /**
     * Removes a perk from this manager
     * @param perk The perk to remove
     * @returns Whether the perk was present (and therefore removed, as opposed
     * to not being removed due to not being present to begin with)
     */
    removePerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object" ? perk.idString : perk;
        const n = 1 << Perks.idStringToNumber[idString];
        const has = (this._perks & n) !== 0;
        this._perks &= ~n;

        if (has) {
            // ! evil starts here
            // some perks need to perform cleanup on removal
            switch (idString) {
                case PerkIds.Werewolf: { /* TODO: cry */ break; }
                case PerkIds.SecondWind: { /* not applicable */ break; }
                case PerkIds.Overstimmed: { /* not applicable */ break; }
                case PerkIds.Splinter: { /* not applicable */ break; }
                case PerkIds.Sabot: { /* not applicable */ break; }
                case PerkIds.HiCap: {
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
                case PerkIds.Engorged: { /* not applicable */ break; }
                case PerkIds.Recycling: { /* not applicable */ break; }
                case PerkIds.DemoExport: { /* not applicable */ break; }
            }
            // ! evil ends here
        }

        this.owner.dirty.perks ||= has;
        return has;
    }

    asBitfield(): number {
        return this._perks;
    }

    asList(): PerkDefinition[] {
        return Perks.definitions.filter((_, i) => (this._perks & (1 << i)) !== 0);
    }

    [Symbol.iterator](): Iterator<PerkDefinition> {
        return this.asList()[Symbol.iterator]();
    }
}
