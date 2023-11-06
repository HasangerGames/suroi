import { clearTimeout } from "timers";
import { AnimationType, FireMode } from "../../../common/src/constants";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { RectangleHitbox } from "../../../common/src/utils/hitbox";
import { degreesToRadians, distanceSquared } from "../../../common/src/utils/math";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { randomFloat, randomPointInsideCircle } from "../../../common/src/utils/random";
import { v, vAdd, vRotate, vSub } from "../../../common/src/utils/vector";
import { Obstacle } from "../objects/obstacle";
import { type Player } from "../objects/player";
import { ReloadAction } from "./action";
import { InventoryItem } from "./inventoryItem";

/**
 * A class representing a firearm
 */
export class GunItem extends InventoryItem<GunDefinition> {
    declare readonly category: ItemType.Gun;

    ammo = 0;

    private _shots = 0;

    private _reloadTimeoutID?: NodeJS.Timeout;
    private _burstTimeoutID?: NodeJS.Timeout;
    private _autoFireTimeoutID?: NodeJS.Timeout;

    cancelAllTimers(): void {
        clearTimeout(this._reloadTimeoutID);
        clearTimeout(this._burstTimeoutID);
        clearTimeout(this._autoFireTimeoutID);
    }

    cancelReload(): void { clearTimeout(this._reloadTimeoutID); }

    /**
     * Constructs a new gun
     * @param idString The `idString` of a `GunDefinition` in the item schema that this object is to base itself off of
     * @param owner The `Player` that owns this gun
     * @throws {TypeError} If the `idString` given does not point to a definition for a gun
     */
    constructor(idString: ReferenceTo<GunDefinition>, owner: Player) {
        super(idString, owner);

        if (this.category !== ItemType.Gun) {
            throw new TypeError(`Attempted to create a Gun object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }
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
            owner.disconnected ||
            this !== this.owner.activeItem
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

        let position = vAdd(
            owner.position,
            vRotate(v(definition.length + jitter, 0), owner.rotation) // player radius + gun length
        );

        for (
            const object of
            this.owner.game.grid.intersectsHitbox(RectangleHitbox.fromLine(owner.position, position))
        ) {
            if (
                object.dead ||
                object.hitbox === undefined ||
                !(object instanceof Obstacle) ||
                object.definition.noCollisions === true
            ) continue;

            for (
                const object of
                this.owner.game.grid.intersectsHitbox(RectangleHitbox.fromLine(owner.position, position))
            ) {
                if (
                    object.dead ||
                    object.hitbox === undefined ||
                    !(object instanceof Obstacle) ||
                    object.definition.noCollisions === true
                ) continue;

                const intersection = object.hitbox.intersectsLine(owner.position, position);
                if (intersection === null) continue;

                if (distanceSquared(this.owner.position, position) > distanceSquared(this.owner.position, intersection.point)) {
                    position = vSub(intersection.point, vRotate(v(0.2 + jitter, 0), owner.rotation));
                }
            }
        }

        const clipDistance = this.owner.distanceToMouse - this.definition.length;

        const limit = definition.bulletCount ?? 1;

        for (let i = 0; i < limit; i++) {
            this.owner.game.addBullet(
                this,
                this.owner,
                {
                    position: jitter
                        ? randomPointInsideCircle(position, jitter)
                        : position,
                    rotation: owner.rotation + Math.PI / 2 +
                        (definition.consistentPatterning === true
                            ? 2 * (i / limit - 0.5)
                            : randomFloat(-1, 1)) * spread,
                    clipDistance
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
        const def = this.definition;

        super._bufferAttack(
            def.fireMode === FireMode.Burst
                ? def.burstProperties.burstCooldown
                : def.fireDelay,
            this._useItemNoDelayCheck.bind(this, true)
        );
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
