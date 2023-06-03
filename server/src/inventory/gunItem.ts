import { type GunDefinition } from "../../../common/src/definitions/guns";
import { InventoryItem } from "./inventoryItem";
import { type Player } from "../objects/player";
import { degreesToRadians } from "../../../common/src/utils/math";
import { v, vRotate } from "../../../common/src/utils/vector";
import { Vec2 } from "planck";
import { randomFloat } from "../../../common/src/utils/random";
import { Bullet } from "../objects/bullet";

/**
 * A class representing a firearm
 */
export class GunItem extends InventoryItem {
    declare readonly category: "gun";

    readonly definition: GunDefinition;

    ammo: number;

    /**
     * Constructs a new gun
     * @param idString The `idString` of a `GunDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this gun
     * @throws {TypeError} If the `idString` given does not point to a definition for a gun
     */
    constructor(idString: string, owner: Player) {
        super(idString, owner);

        if (this.category !== "gun") {
            throw new TypeError(`Attempted to create a Gun object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }

        this.definition = this.type.definition as GunDefinition;

        this.ammo = this.definition.capacity;
    }

    /**
     * As the name implies, this version does not check whether the firing delay
     * has been respected. Used in conjunction with other time-keeping mechanisms,
     * namely setTimeout
     */
    private _useItemNoDelayCheck(): void {
        const owner = this.owner;
        const definition = this.definition;

        if (
            this.ammo > 0 &&
            owner.attacking &&
            !owner.dead &&
            !owner.disconnected
        ) {
            this.ammo--;
            this._lastUse = Date.now();

            const spread = degreesToRadians(definition.shotSpread);

            let rotated = vRotate(v(definition.length, 0), owner.rotation); // player radius + gun length
            let position = Vec2(owner.position.x + rotated.x, owner.position.y - rotated.y);

            for (const object of this.owner.nearObjects) {
                if (!object.dead && (object.hitbox != null) && object.hitbox.intersectsLine(this.owner.position, position)) {
                    rotated = vRotate(v(2.50001, 0), owner.rotation);
                    position = Vec2(owner.position.x + rotated.x, owner.position.y - rotated.y);
                    break;
                }
            }

            for (let i = 0; i < (definition.bulletCount ?? 1); i++) {
                const angle = owner.rotation + randomFloat(-spread, spread) + Math.PI / 2;
                const bullet = new Bullet(
                    owner.game,
                    position,
                    angle,
                    definition,
                    this.type,
                    owner
                );

                owner.game.bullets.add(bullet);
                owner.game.newBullets.add(bullet);
            }

            if (definition.fireMode === "auto" && this.owner.activeItem === this) {
                setTimeout(this._useItemNoDelayCheck.bind(this), definition.cooldown);
            }
        }
    }

    override useItem(): void {
        if (Date.now() - this._lastUse > this.definition.cooldown) {
            this._useItemNoDelayCheck();
        }
    }
}
