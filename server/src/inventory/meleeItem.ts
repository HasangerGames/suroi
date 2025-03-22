import { AnimationType, FireMode } from "@common/constants";
import { type MeleeDefinition } from "@common/definitions/items/melees";
import { PerkIds } from "@common/definitions/items/perks";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { ItemType, type ReifiableDef } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";
import { type CollidableGameObject } from "../objects/gameObject";
import { type ItemData } from "../objects/loot";
import { type Player } from "../objects/player";
import { InventoryItemBase } from "./inventoryItem";

/**
 * A class representing a melee weapon
 */
export class MeleeItem extends InventoryItemBase.derive(ItemType.Melee) {
    private _autoUseTimeoutID?: NodeJS.Timeout;

    /**
     * Constructs a new melee weapon
     * @param idString The `idString` of a `MeleeDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this melee weapon
     * @throws {TypeError} If the `idString` given does not point to a definition for a melee weapon
     */
    constructor(idString: ReifiableDef<MeleeDefinition>, owner: Player, data?: ItemData<MeleeDefinition>) {
        super(idString, owner);

        if (this.category !== ItemType.Melee) {
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
        if (this.owner.game.pluginManager.emit("inv_item_use", this) !== undefined) {
            return;
        }

        const owner = this.owner;
        const definition = this.definition;

        this._lastUse = owner.game.now;
        owner.animation = AnimationType.Melee;
        owner.setPartialDirty();

        owner.action?.cancel();

        this.owner.game.addTimeout((): void => {
            if (
                this.owner.activeItem === this
                && (owner.attacking || skipAttackCheck)
                && !owner.dead
                && !owner.downed
                && !owner.disconnected
            ) {
                const position = Vec.add(
                    owner.position,
                    Vec.scale(Vec.rotate(definition.offset, owner.rotation), owner.sizeMod)
                );
                const hitbox = new CircleHitbox(definition.radius * owner.sizeMod, position);

                // Damage the closest object
                const damagedObjects: readonly CollidableGameObject[] = (
                    Array.from(owner.game.grid.intersectsHitbox(hitbox))
                        .filter(
                            object => !object.dead
                                && object !== owner
                                && (object.damageable || (object.isProjectile && object.definition.c4))
                                && (!object.isObstacle || (!object.definition.isStair))
                                && object.hitbox?.collidesWith(hitbox)
                                && adjacentOrEqualLayer(object.layer, this.owner.layer)
                        ) as CollidableGameObject[]
                ).sort((a, b) => {
                    if (
                        (a.isObstacle && a.definition.noMeleeCollision)
                        || (owner.game.teamMode && a.isPlayer && a.teamID === this.owner.teamID)
                    ) return Infinity;

                    if (
                        (b.isObstacle && b.definition.noMeleeCollision)
                        || (owner.game.teamMode && b.isPlayer && b.teamID === this.owner.teamID)
                    ) return -Infinity;

                    return a.hitbox.distanceTo(this.owner.hitbox).distance - b.hitbox.distanceTo(this.owner.hitbox).distance;
                });

                const targetLimit = Numeric.min(damagedObjects.length, definition.maxTargets ?? 1);

                for (let i = 0; i < targetLimit; i++) {
                    const closestObject = damagedObjects[i];
                    let multiplier = 1;

                    multiplier *= this.owner.mapPerkOrDefault(PerkIds.Berserker, ({ damageMod }) => damageMod, 1);
                    multiplier *= this.owner.mapPerkOrDefault(PerkIds.Lycanthropy, ({ damageMod }) => damageMod, 1);

                    if (closestObject.isObstacle) {
                        multiplier *= definition.piercingMultiplier !== undefined && closestObject.definition.impenetrable
                            ? definition.piercingMultiplier
                            : definition.obstacleMultiplier;

                        if (closestObject.definition.material === "ice") {
                            multiplier *= definition.iceMultiplier ?? 0.01;
                        }
                    }

                    if (closestObject.isProjectile) {
                        multiplier *= definition.obstacleMultiplier;
                    }

                    closestObject.damage({
                        amount: definition.damage * multiplier,
                        source: owner,
                        weaponUsed: this
                    });

                    if (closestObject.isObstacle && !closestObject.dead) {
                        closestObject.interact(this.owner);
                    }
                }

                if (definition.fireMode === FireMode.Auto || owner.isMobile) {
                    clearTimeout(this._autoUseTimeoutID);
                    this._autoUseTimeoutID = setTimeout(
                        this._useItemNoDelayCheck.bind(this, false),
                        damagedObjects.length && definition.attackCooldown
                            ? definition.attackCooldown
                            : definition.cooldown
                    );
                }
            }
        }, 50 + (definition.hitDelay ?? 0));
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
            this._useItemNoDelayCheck.bind(this, true)
        );
    }
}
