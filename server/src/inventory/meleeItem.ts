import { AnimationType, FireMode } from "@common/constants";
import { type MeleeDefinition } from "@common/definitions/items/melees";
import { PerkIds } from "@common/definitions/items/perks";
import { DefinitionType, type ReifiableDef } from "@common/utils/objectDefinitions";
import { Building } from "../objects/building";
import { type ItemData } from "../objects/loot";
import { Obstacle } from "../objects/obstacle";
import { type Player } from "../objects/player";
import { Projectile } from "../objects/projectile";
import { InventoryItemBase } from "./inventoryItem";
import { getMeleeHitbox, getMeleeTargets } from "@common/utils/gameHelpers";

/**
 * A class representing a melee weapon
 */
export class MeleeItem extends InventoryItemBase.derive(DefinitionType.Melee) {
    private _autoUseTimeoutID?: NodeJS.Timeout;

    /**
     * Constructs a new melee weapon
     * @param idString The `idString` of a `MeleeDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this melee weapon
     * @throws {TypeError} If the `idString` given does not point to a definition for a melee weapon
     */
    constructor(idString: ReifiableDef<MeleeDefinition>, owner: Player, data?: ItemData<MeleeDefinition>) {
        super(idString, owner);

        if (this.category !== DefinitionType.Melee) {
            throw new TypeError(`Attempted to create a Melee object based on a definition for a non-melee object (Received a ${this.category as unknown as string} definition)`);
        }

        if (data) {
            this.stats.kills = data.kills;
            this.stats.damage = data.damage;
        }
    }

    /**
     * As the name implies, this version does not check whether the firing delay
     * has been respected. Used in conjunction with other time-keeping mechanisms,
     * namely setTimeout
     */
    private _useItemNoDelayCheck(skipAttackCheck: boolean): void {
        const owner = this.owner;

        const satisfiesPreflights = (): boolean => owner.activeItem === this
            && (owner.attacking || skipAttackCheck)
            && !owner.dead
            && !owner.downed
            && !owner.disconnected;

        if (
            !satisfiesPreflights()
            || this.owner.game.pluginManager.emit("inv_item_use", this) !== undefined
        ) {
            return;
        }
        clearTimeout(this._autoUseTimeoutID);

        const definition = this.definition;

        this.lastUse = owner.game.now;
        owner.animation = AnimationType.Melee;
        owner.setPartialDirty();

        owner.action?.cancel();

        const hitDelay = definition.hitDelay ?? 50;

        this.owner.game.addTimeout((): void => {
            if (!satisfiesPreflights()) return;
            for (let i = 0; i < (definition.numberOfHits ?? 1); i++) {
                this.owner.game.addTimeout((): void => {
                    if (this.owner.activeItem.definition.defType !== DefinitionType.Melee) return;

                    type MeleeObject = Player | Obstacle | Building | Projectile;

                    const hitbox = getMeleeHitbox(this.owner, this.definition);

                    const objects = owner.game.grid.intersectsHitbox(hitbox);

                    const hits = getMeleeTargets<MeleeObject>(hitbox, this.definition, this.owner, this.owner.game.isTeamMode, objects);

                    for (const hit of hits) {
                        const target = hit.object;
                        let multiplier = 1;

                        if (!this.owner.hasPerk(PerkIds.Lycanthropy)) multiplier *= this.owner.mapPerkOrDefault(PerkIds.Berserker, ({ damageMod }) => damageMod, 1);
                        multiplier *= this.owner.mapPerkOrDefault(PerkIds.Lycanthropy, ({ damageMod }) => damageMod, 1);

                        if (target.isObstacle) {
                            multiplier *= definition.piercingMultiplier !== undefined && target.definition.impenetrable
                                ? definition.piercingMultiplier
                                : definition.obstacleMultiplier;

                            if (target.definition.material === "ice") {
                                multiplier *= definition.iceMultiplier ?? 0.01;
                            }
                        }

                        if (target.isProjectile) {
                            multiplier *= definition.obstacleMultiplier;
                        }

                        target.damage({
                            amount: definition.damage * multiplier,
                            source: owner,
                            weaponUsed: this
                        });

                        if (target.isObstacle && !target.dead) {
                            target.interact(this.owner);
                        }
                    }

                    if (definition.fireMode === FireMode.Auto || owner.isMobile) {
                        clearTimeout(this._autoUseTimeoutID);
                        this._autoUseTimeoutID = setTimeout(
                            () => this._useItemNoDelayCheck(false),
                            (
                                hits.length && definition.attackCooldown
                                    ? definition.attackCooldown
                                    : definition.cooldown
                            ) - hitDelay
                        );
                    }
                }, (i === 0 ? 0 : (definition.delayBetweenHits ?? 0)));
            }
        }, hitDelay);
    }

    stopUse(): void {
        // if (this.owner.game.pluginManager.emit("inv_item_stop_use", this) !== undefined) return;
        // there's no logic in this method, so just emit the event and exit. if there ever comes
        // the need to put logic here, uncomment the line above and remove the current one

        this.owner.game.pluginManager.emit("inv_item_stop_use", this);
    }

    override itemData(): ItemData<MeleeDefinition> {
        return {
            kills: this.stats.kills,
            damage: this.stats.damage
        };
    }

    override useItem(): void {
        super._bufferAttack(
            this.definition.cooldown,
            () => this._useItemNoDelayCheck(true)
        );
    }
}
