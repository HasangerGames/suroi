import { clearTimeout } from "timers";
import { AnimationType, FireMode, type ObjectCategory } from "../../../common/src/constants";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { RectangleHitbox } from "../../../common/src/utils/hitbox";
import { degreesToRadians, distanceSquared, normalizeAngle } from "../../../common/src/utils/math";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { randomFloat, randomPointInsideCircle } from "../../../common/src/utils/random";
import { v, vAdd, vRotate, vSub } from "../../../common/src/utils/vector";
import { Obstacle } from "../objects/obstacle";
import { type Player } from "../objects/player";
import { ReloadAction } from "./action";
import { InventoryItem } from "./inventoryItem";

/**
 * A class representing a firearm
 */
export class GunItem extends InventoryItem {
    declare readonly category: ItemType.Gun;
    declare readonly type: ObjectType<ObjectCategory.Loot, GunDefinition>;

    readonly definition: GunDefinition;

    ammo = 0;

    private _shots = 0;

    private _reloadTimeoutID: NodeJS.Timeout | undefined;

    private _burstTimeoutID: NodeJS.Timeout | undefined;

    private _autoFireTimeoutID: NodeJS.Timeout | undefined;

    cancelReload(): void { clearTimeout(this._reloadTimeoutID); }

    /**
     * Constructs a new gun
     * @param idString The `idString` of a `GunDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this gun
     * @throws {TypeError} If the `idString` given does not point to a definition for a gun
     */
    constructor(idString: string, owner: Player) {
        super(idString, owner);

        if (this.category !== ItemType.Gun) {
            throw new TypeError(`Attempted to create a Gun object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
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

        if (
            (!skipAttackCheck && !owner.attacking) ||
            owner.dead ||
            owner.disconnected
        ) {
            this._shots = 0;
            return;
        }

        if (this.ammo <= 0) {
            if (owner.inventory.items[definition.ammoType] <= 0) {
                owner.animation.type = AnimationType.GunClick;
                owner.animation.seq = !owner.animation.seq;
            }

            this._shots = 0;
            return;
        }

        this.owner.action?.cancel();
        clearTimeout(this._burstTimeoutID);

        if (definition.fireMode === FireMode.Burst && this._shots >= definition.burstProperties.shotsPerBurst) {
            this._shots = 0;
            this._burstTimeoutID = setTimeout(this._useItemNoDelayCheck.bind(this, false), definition.burstProperties.burstCooldown);
            return;
        }

        owner.animation.type = AnimationType.Gun;
        owner.animation.seq = !this.owner.animation.seq;
        owner.game.partialDirtyObjects.add(owner);

        owner.dirty.weapons = true;

        this._shots++;

        this._lastUse = owner.game.now;

        const spread = degreesToRadians((definition.shotSpread + (this.owner.isMoving ? definition.moveSpread : 0)) / 2);

        const jitter = definition.jitterRadius ?? 0;

        const rotated = vRotate(v(definition.length - jitter, 0), owner.rotation); // player radius + gun length

        let position = vAdd(owner.position, rotated);

        const objects = this.owner.game.grid.intersectsRect(RectangleHitbox.fromLine(owner.position, position));
        for (const object of objects) {
            if (!object.dead && object.hitbox && object instanceof Obstacle && !object.definition.noCollisions) {
                const intersection = object.hitbox.intersectsLine(owner.position, position);
                if (intersection === null) continue;

                if (distanceSquared(this.owner.position, position) > distanceSquared(this.owner.position, intersection.point)) {
                    position = vSub(intersection.point, vRotate(v(0.2 + jitter, 0), owner.rotation));
                }
            }
        }

        const limit = definition.bulletCount ?? 1;

        for (let i = 0; i < limit; i++) {
            this.owner.game.addBullet(
                this,
                this.owner,
                {
                    position: definition.jitterRadius
                        ? vAdd(position, randomPointInsideCircle(v(0, 0), definition.jitterRadius))
                        : position,
                    rotation: normalizeAngle(
                        owner.rotation + Math.PI / 2 +
                (
                    definition.consistentPatterning === true
                        ? i / limit - 0.5
                        : randomFloat(-1, 1)
                ) * spread
                    )
                }
            );
        }

        owner.recoil.active = true;
        owner.recoil.time = owner.game.now + definition.recoilDuration;
        owner.recoil.multiplier = definition.recoilMultiplier;

        if (!definition.infiniteAmmo) {
            --this.ammo;
        }

        if (this.ammo <= 0) {
            this._reloadTimeoutID = setTimeout(this.reload.bind(this, true), this.definition.fireDelay);
            this._shots = 0;
            return;
        }

        if (
            (definition.fireMode !== FireMode.Single || this.owner.isMobile) &&
            this.owner.activeItem === this
        ) {
            clearTimeout(this._autoFireTimeoutID);
            this._autoFireTimeoutID = setTimeout(this._useItemNoDelayCheck.bind(this, false), definition.fireDelay);
        }
    }

    override useItem(): void {
        let attackCooldown = this.definition.fireDelay;
        if (this.definition.fireMode === FireMode.Burst) attackCooldown = this.definition.burstProperties.burstCooldown;
        if (
            this.owner.game.now - this._lastUse > attackCooldown &&
            this.owner.game.now - this._switchDate > this.owner.effectiveSwitchDelay
        ) {
            this._useItemNoDelayCheck(true);
        }
    }

    reload(skipFireDelayCheck = false): void {
        if (
            this.definition.infiniteAmmo === true ||
            this.ammo >= this.definition.capacity ||
            this.owner.inventory.items[this.definition.ammoType] <= 0 ||
            this.owner.action !== undefined ||
            this.owner.activeItem !== this ||
            (!skipFireDelayCheck && this.owner.game.now - this._lastUse < this.definition.fireDelay)
        ) return;

        this.owner.executeAction(new ReloadAction(this.owner, this));
    }
}
