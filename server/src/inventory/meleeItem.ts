import { InventoryItem } from "./inventoryItem";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type Player } from "../objects/player";
import { vRotate } from "../../../common/src/utils/vector";
import { AnimationType } from "../../../common/src/constants";
import { Vec2 } from "planck";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { type GameObject } from "../types/gameObject";
import { type CollisionRecord } from "../../../common/src/utils/math";

/**
 * A class representing a melee weapon
 */
export class MeleeItem extends InventoryItem {
    declare readonly category: "melee";

    readonly definition: MeleeDefinition;

    /**
     * Constructs a new melee weapon
     * @param idString The `idString` of a `MeleeDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this melee weapon
     * @throws {TypeError} If the `idString` given does not point to a definition for a melee weapon
     */
    constructor(idString: string, owner: Player) {
        super(idString, owner);

        if (this.category !== "melee") {
            throw new TypeError(`Attempted to create a Melee object based on a definition for a non-melee object (Received a ${this.category as unknown as string} definition)`);
        }

        this.definition = this.type.definition as MeleeDefinition;
    }

    /**
     * As the name implies, this version does not check whether the firing delay
     * has been respected. Used in conjunction with other time-keeping mechanisms,
     * namely setTimeout
     */
    private _useItemNoDelayCheck(): void {
        const owner = this.owner;
        const definition = this.definition;

        owner.animation.type = AnimationType.Punch;
        owner.animation.seq = !this.owner.animation.seq;

        setTimeout(() => {
            if (
                this.owner.activeItem === this &&
                owner.attacking &&
                !owner.dead &&
                !owner.disconnected
            ) {
                this._lastUse = Date.now();
                const rotated = vRotate(definition.offset, owner.rotation);
                const position = Vec2(owner.position.x + rotated.x, owner.position.y - rotated.y);
                const hitbox = new CircleHitbox(definition.radius, position);

                // Damage the closest object
                let minDist = Number.MAX_VALUE;
                let closestObject: GameObject | undefined;

                for (const object of this.owner.visibleObjects) {
                    if (!object.dead && object !== owner) {
                        const record: CollisionRecord | undefined = object.hitbox?.distanceTo(hitbox);

                        if (record?.collided === true && record.distance < minDist) {
                            minDist = record.distance;
                            closestObject = object;
                        }
                    }
                }

                if (closestObject?.dead === false) {
                    closestObject.damage(definition.damage, owner);
                }

                if (definition.fireMode === "auto") {
                    setTimeout(this._useItemNoDelayCheck.bind(this), definition.cooldown);
                }
            }
        }, 50);
    }

    override useItem(): void {
        if (Date.now() - this._lastUse > this.definition.cooldown) {
            this._useItemNoDelayCheck();
        }
    }
}
