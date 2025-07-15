import { GameConstants, PlayerActions } from "@common/constants";
import { Obstacles } from "@common/definitions/obstacles";
import { PerkData, PerkIds, Perks, type PerkDefinition } from "@common/definitions/items/perks";
import { Skins } from "@common/definitions/items/skins";
import { weightedRandom } from "@common/utils/random";
import { type Player } from "../objects/player";
import type { ReferenceTo, ReifiableDef } from "@common/utils/objectDefinitions";

export type UpdatablePerkDefinition = PerkDefinition & { readonly updateInterval: number };

export class ServerPerkManager extends Set<PerkDefinition> {
    private readonly _selfData: Record<string, unknown> = {};

    constructor(readonly owner: Player) {
        super();
    }

    override add(perk: PerkDefinition): this {
        const idString = perk.idString;
        const owner = this.owner;
        const absent = !this.has(perk);

        super.add(perk);
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
        return this;
    }

    override has(perk: ReifiableDef<PerkDefinition>): boolean {
        return super.has(Perks.reify(perk));
    }

    override delete(perk: PerkDefinition): boolean {
        const idString = perk.idString;
        const owner = this.owner;

        const has = this.has(perk);

        if (has) {
            this.delete(perk);
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
                    owner.perks.add(immunity);
                    owner.immunityTimeout?.kill();
                    owner.immunityTimeout = owner.game.addTimeout(() => owner.perks.delete(immunity), immunity.duration);
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

    ifPresent<Name extends ReferenceTo<PerkDefinition>>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        cb: (def: PerkDefinition & { readonly idString: Name }) => void
    ): void {
        const def = Perks.reify(perk);
        if (this.has(def)) {
            cb(def as PerkDefinition & { readonly idString: Name });
        }
    }

    map<Name extends ReferenceTo<PerkDefinition>, U>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U
    ): U | undefined {
        const def = Perks.reify(perk);
        if (this.has(def)) {
            return mapper(def as PerkDefinition & { readonly idString: Name });
        }
    }

    mapOrDefault<Name extends ReferenceTo<PerkDefinition>, U>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U,
        defaultValue: U
    ): U {
        const def = Perks.reify(perk);
        if (this.has(def)) {
            return mapper(def as PerkDefinition & { readonly idString: Name });
        }

        return defaultValue;
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
