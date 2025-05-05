import { GameConstants, PlayerActions } from "@common/constants";
import { Obstacles } from "@common/definitions/obstacles";
import { PerkData, PerkIds, Perks, type PerkDefinition } from "@common/definitions/items/perks";
import { Skins } from "@common/definitions/items/skins";
import { PerkManager } from "@common/utils/perkManager";
import { weightedRandom } from "@common/utils/random";
import { type Player } from "../objects/player";
import type { ReifiableDef } from "@common/utils/objectDefinitions";

export type UpdatablePerkDefinition = PerkDefinition & { readonly updateInterval: number };

export class ServerPerkManager extends PerkManager {
    private readonly _selfData: Record<string, unknown> = {};

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
    override addItem(perk: PerkDefinition): boolean {
        const idString = perk.idString;
        const owner = this.owner;
        const absent = super.addItem(perk);

        this._addToMap(perk);

        if (absent) {
            // ! evil starts here
            // some perks need to perform setup when added
            switch (idString) {
                case PerkIds.Costumed: {
                    const { choices } = PerkData[PerkIds.Costumed];

                    owner.activeDisguise = Obstacles.fromString(
                        weightedRandom(
                            Object.keys(choices),
                            Object.values(choices)
                        )
                    );
                    owner.setDirty();
                    break;
                }
                case PerkIds.PlumpkinBomb: {
                    owner.halloweenThrowableSkin = true;
                    owner.setDirty();
                    break;
                }
                case PerkIds.Lycanthropy: {
                    [this._selfData["Lycanthropy::old_skin"], owner.loadout.skin] = [owner.loadout.skin, Skins.fromString("werewolf")];
                    owner.setDirty();
                    owner.action?.cancel();
                    const inventory = owner.inventory;
                    inventory.dropWeapon(0, true)?.destroy();
                    inventory.dropWeapon(1, true)?.destroy();
                    inventory.dropWeapon(2, true)?.destroy();

                    // Drop all throwables
                    while (inventory.getWeapon(3)) {
                        inventory.dropWeapon(3, true)?.destroy();
                    }

                    inventory.lockAllSlots();

                    /* TODO: continue crying */
                    break;
                }
                case PerkIds.ExtendedMags: {
                    const weapons = owner.inventory.weapons;
                    const maxWeapons = GameConstants.player.maxWeapons;
                    for (let i = 0; i < maxWeapons; i++) {
                        const weapon = weapons[i];

                        if (!weapon?.isGun) continue;

                        const def = weapon.definition;

                        if (def.extendedCapacity === undefined) continue;

                        const extra = weapon.ammo - def.extendedCapacity;
                        if (extra > 0) {
                            // firepower is anti-boosting this weapon, we need to shave the extra rounds off
                            weapon.ammo = def.extendedCapacity;
                            owner.inventory.giveItem(def.ammoType, extra);
                        }
                    }
                    break;
                }
                case PerkIds.CombatExpert: {
                    if (owner.action?.type === PlayerActions.Reload) owner.action?.cancel();
                    break;
                }
                case PerkIds.PrecisionRecycling: {
                    owner.bulletTargetHitCount = 0;
                    break;
                }
            }
            // ! evil ends here
        }

        owner.updateAndApplyModifiers();
        owner.dirty.perks = true;
        return absent;
    }

    override toggleItem(item: ReifiableDef<PerkDefinition>): boolean {
        const res = super.toggleItem(item);

        if (res) this._addToMap(item);
        else this._removeFromMap(item);

        return res;
    }

    /**
     * Removes a perk from this manager
     * @param perk The perk to remove
     * @returns Whether the perk was present (and therefore removed, as opposed
     * to not being removed due to not being present to begin with)
     */
    override removeItem(perk: PerkDefinition): boolean {
        const idString = perk.idString;
        const owner = this.owner;

        const has = super.removeItem(perk);

        if (has) {
            this._removeFromMap(perk);

            // ! evil starts here
            // some perks need to perform cleanup on removal
            switch (idString) {
                case PerkIds.Lycanthropy: {
                    owner.loadout.skin = Skins.fromStringSafe(this._selfData["Lycanthropy::old_skin"] as string) ?? Skins.fromString("hazel_jumpsuit");
                    owner.inventory.unlockAllSlots();
                    owner.setDirty();
                    break;
                }
                case PerkIds.ExtendedMags: {
                    const weapons = owner.inventory.weapons;
                    const maxWeapons = GameConstants.player.maxWeapons;
                    for (let i = 0; i < maxWeapons; i++) {
                        const weapon = weapons[i];

                        if (!weapon?.isGun) continue;

                        const def = weapon.definition;
                        const extra = weapon.ammo - def.capacity;
                        if (extra > 0) {
                            // firepower boosted this weapon, we need to shave the extra rounds off
                            weapon.ammo = def.capacity;
                            owner.inventory.giveItem(def.ammoType, extra);
                        }
                    }
                    break;
                }
                case PerkIds.PlumpkinBomb: {
                    owner.halloweenThrowableSkin = false;
                    owner.setDirty();
                    break;
                }
                case PerkIds.Costumed: {
                    owner.activeDisguise = undefined;
                    owner.setDirty();
                    break;
                }
                case PerkIds.CombatExpert: {
                    if (owner.action?.type === PlayerActions.Reload) owner.action?.cancel();
                    break;
                }
                case PerkIds.PrecisionRecycling: {
                    owner.bulletTargetHitCount = 0;
                    owner.targetHitCountExpiration?.kill();
                    owner.targetHitCountExpiration = undefined;
                    break;
                }
                case PerkIds.Infected: { // evil
                    const immunity = PerkData[PerkIds.Immunity];
                    owner.perks.addItem(immunity);
                    owner.immunityTimeout?.kill();
                    owner.immunityTimeout = owner.game.addTimeout(() => owner.perks.removeItem(immunity), immunity.duration);
                    owner.setDirty();
                    break;
                }
            }
            // ! evil ends here
        }

        this.owner.updateAndApplyModifiers();

        owner.dirty.perks ||= has;
        return has;
    }

    protected _addToMap(perk: ReifiableDef<PerkDefinition>): void {
        const owner = this.owner;
        const def = Perks.reify(perk);

        if ("updateInterval" in def) {
            (owner.perkUpdateMap ??= new Map<UpdatablePerkDefinition, number>())
                .set(perk as UpdatablePerkDefinition, owner.game.now);
        }
    }

    protected _removeFromMap(perk: ReifiableDef<PerkDefinition>): void {
        const owner = this.owner;
        const def = Perks.reify(perk);

        const perkUpdateMap = owner.perkUpdateMap;
        if ("updateInterval" in def && perkUpdateMap !== undefined) {
            perkUpdateMap?.delete(perk as UpdatablePerkDefinition);

            if (perkUpdateMap?.size === 0) {
                owner.perkUpdateMap = undefined;
            }
        }
    }
}
