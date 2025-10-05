import { AnimationType, FireMode } from "@common/constants";
import { type MeleeDefinition } from "@common/definitions/items/melees";
import { PerkIds } from "@common/definitions/items/perks";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEquivLayer } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { DefinitionType, type ReifiableDef } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";
import { Building } from "../objects/building";
import { type ItemData } from "../objects/loot";
import { Obstacle } from "../objects/obstacle";
import { type Player } from "../objects/player";
import { Projectile } from "../objects/projectile";
import { InventoryItemBase } from "./inventoryItem";

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

                    const position = Vec.add(
                        owner.position,
                        Vec.scale(Vec.rotate(definition.offset, owner.rotation), owner.sizeMod)
                    );
                    const hitbox = new CircleHitbox(definition.radius * owner.sizeMod, position);
                    const targets: MeleeObject[] = [];

                    for (const object of owner.game.grid.intersectsHitbox(hitbox)) {
                        if (
                            (object.dead && !(object.isBuilding && object.definition.hasDamagedCeiling))
                            || object === owner
                            || !(object.isPlayer || object.isObstacle || object.isBuilding || object.isProjectile)
                            || !object.damageable
                            || (object.isObstacle && (object.definition.isStair || object.definition.noMeleeCollision))
                            || !adjacentOrEquivLayer(object, owner.layer)
                            || !object.hitbox?.collidesWith(hitbox)
                        ) continue;

                        targets.push(object);
                    }

                    targets.sort((a, b) => {
                        if (owner.game.isTeamMode && a.isPlayer && a.teamID === owner.teamID) return Infinity;
                        if (owner.game.isTeamMode && b.isPlayer && b.teamID === owner.teamID) return -Infinity;

                        return (a.hitbox?.distanceTo(owner.hitbox).distance ?? 0) - (b.hitbox?.distanceTo(owner.hitbox).distance ?? 0);
                    });

                    const numTargets = Numeric.min(targets.length, definition.maxTargets ?? 1);
                    for (let i = 0; i < numTargets; i++) {
                        const target = targets[i];
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
                                targets.length && definition.attackCooldown
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
