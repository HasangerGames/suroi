import { AnimationType, FireMode, type ObjectCategory } from "../../../common/src/constants";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { vAdd, vRotate } from "../../../common/src/utils/vector";
import { Obstacle } from "../objects/obstacle";
import { type Player } from "../objects/player";
import { type GameObject } from "../types/gameObject";
import { InventoryItem } from "./inventoryItem";

/**
 * A class representing a melee weapon
 */
export class MeleeItem extends InventoryItem {
    declare readonly category: ItemType.Melee;
    declare readonly type: ObjectType<ObjectCategory.Loot, MeleeDefinition>;

    readonly definition: MeleeDefinition;

    private _autoUseTimeoutID: NodeJS.Timeout | undefined;

    /**
     * Constructs a new melee weapon
     * @param idString The `idString` of a `MeleeDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this melee weapon
     * @throws {TypeError} If the `idString` given does not point to a definition for a melee weapon
     */
    constructor(idString: string, owner: Player) {
        super(idString, owner);

        if (this.category !== ItemType.Melee) {
            throw new TypeError(`Attempted to create a Melee object based on a definition for a non-melee object (Received a ${this.category as unknown as string} definition)`);
        }

        this.definition = this.type.definition;
    }

    /**
     * As the name implies, this version does not check whether the firing delay
     * has been respected. Used in conjunction with other time-keeping mechanisms,
     * namely setTimeout
     */
    private _useItemNoDelayCheck(skipAttackCheck: boolean): void {
        const owner = this.owner;
        const definition = this.definition;

        this._lastUse = owner.game.now;
        owner.animation.type = AnimationType.Melee;
        owner.animation.seq = !this.owner.animation.seq;
        owner.game.partialDirtyObjects.add(owner);

        owner.action?.cancel();

        setTimeout((): void => {
            if (
                this.owner.activeItem === this &&
                (owner.attacking || skipAttackCheck) &&
                !owner.dead &&
                !owner.disconnected
            ) {
                const rotated = vRotate(definition.offset, owner.rotation);
                const position = vAdd(owner.position, rotated);
                const hitbox = new CircleHitbox(definition.radius, position);

                // Damage the closest object

                const damagedObjects: GameObject[] = [];

                const objects = owner.game.grid.intersectsRect(hitbox.toRectangle());

                for (const object of objects) {
                    if (!object.dead && object !== owner && object.damageable) {
                        if (object.hitbox && hitbox.collidesWith(object.hitbox)) damagedObjects.push(object);
                    }
                }

                damagedObjects.sort((a: GameObject, b: GameObject): number => {
                    if (a instanceof Obstacle && a.definition.noMeleeCollision) return Infinity;
                    if (b instanceof Obstacle && b.definition.noMeleeCollision) return -Infinity;

                    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
                    return a.hitbox!.distanceTo(this.owner.hitbox).distance - b.hitbox!.distanceTo(this.owner.hitbox).distance;
                });

                const targetLimit = Math.min(damagedObjects.length, definition.maxTargets);
                for (let i = 0; i < targetLimit; i++) {
                    const closestObject: GameObject = damagedObjects[i];
                    let multiplier = 1;

                    if (closestObject instanceof Obstacle) {
                        multiplier = definition.piercingMultiplier && closestObject.definition.impenetrable
                            ? definition.piercingMultiplier
                            : definition.obstacleMultiplier;
                    }

                    closestObject.damage(definition.damage * multiplier, owner, this);
                }

                if (definition.fireMode === FireMode.Auto || owner.isMobile) {
                    clearTimeout(this._autoUseTimeoutID);
                    this._autoUseTimeoutID = setTimeout(this._useItemNoDelayCheck.bind(this, false), definition.cooldown);
                }
            }
        }, 50);
    }

    override useItem(): void {
        if (this.owner.game.now - this._lastUse > this.definition.cooldown) {
            this._useItemNoDelayCheck(true);
        }
    }
}
