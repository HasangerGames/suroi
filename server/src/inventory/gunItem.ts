import { AnimationType, FireMode } from "@common/constants";
import { type GunDefinition } from "@common/definitions/guns";
import { RectangleHitbox } from "@common/utils/hitbox";
import { Angle, Geometry } from "@common/utils/math";
import { type Timeout } from "@common/utils/misc";
import { ItemType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { Vec } from "@common/utils/vector";

import { type Player } from "../objects/player";
import { ReloadAction } from "./action";
import { InventoryItem } from "./inventoryItem";
import { adjacentOrEqualLayer } from "@common/utils/layer";

/**
 * A class representing a firearm
 */
export class GunItem extends InventoryItem<GunDefinition> {
    declare readonly category: ItemType.Gun;

    ammo = 0;

    private _shots = 0;

    private _reloadTimeout?: Timeout;

    // those need to be nodejs timeouts because some guns fire rate are too close to the tick rate
    private _burstTimeout?: NodeJS.Timeout;
    private _autoFireTimeout?: NodeJS.Timeout;

    private _altFire = false;

    cancelAllTimers(): void {
        this._reloadTimeout?.kill();
        clearTimeout(this._burstTimeout);
        clearTimeout(this._autoFireTimeout);
    }

    cancelReload(): void { this._reloadTimeout?.kill(); }

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
            (!skipAttackCheck && !owner.attacking)
            || owner.dead
            || owner.downed
            || owner.disconnected
            || this !== owner.activeItem
            || (definition.summonAirdrop && owner.isInsideBuilding)
        ) {
            this._shots = 0;
            return;
        }

        if (this.ammo <= 0) {
            if (!owner.inventory.items.hasItem(definition.ammoType)) {
                owner.animation = AnimationType.GunClick;
                owner.setPartialDirty();
            }

            this._shots = 0;
            return;
        }

        owner.action?.cancel();
        clearTimeout(this._burstTimeout);

        owner.animation = definition.ballistics.lastShotFX && this.ammo === 1
            ? AnimationType.LastShot
            : this._altFire
                ? AnimationType.GunFireAlt
                : AnimationType.GunFire;

        owner.setPartialDirty();

        owner.dirty.weapons = true;

        this._shots++;

        const { moveSpread, shotSpread, fsaReset } = definition;

        const spread = owner.game.now - this._lastUse >= (fsaReset ?? Infinity)
            ? 0
            : Angle.degreesToRadians((owner.isMoving ? moveSpread : shotSpread) / 2);

        this._lastUse = owner.game.now;
        const jitter = definition.jitterRadius;

        const offset = definition.isDual
            ? ((this._altFire = !this._altFire) ? 1 : -1) * definition.leftRightOffset
            : (definition.bulletOffset ?? 0);

        const startPosition = Vec.rotate(Vec.create(0, offset), owner.rotation);

        let position = Vec.add(
            owner.position,
            Vec.rotate(Vec.create(definition.length, offset), owner.rotation) // player radius + gun length
        );

        for (const object of owner.game.grid.intersectsHitbox(RectangleHitbox.fromLine(startPosition, position))) {
            if (
                object.dead
                || object.hitbox === undefined
                || !(object.isObstacle || object.isBuilding)
                || !adjacentOrEqualLayer(owner.layer, object.layer)
                || object.definition.noCollisions
                || (object.isObstacle && object.definition.isStair)
            ) continue;

            const intersection = object.hitbox.intersectsLine(owner.position, position);
            if (intersection === null) continue;

            if (Geometry.distanceSquared(owner.position, position) > Geometry.distanceSquared(owner.position, intersection.point)) {
                position = Vec.sub(intersection.point, Vec.rotate(Vec.create(0.2 + jitter, 0), owner.rotation));
            }
        }

        const rangeOverride = owner.distanceToMouse - this.definition.length;
        const projCount = definition.bulletCount;

        for (let i = 0; i < projCount; i++) {
            owner.game.addBullet(
                this,
                owner,
                {
                    position: jitter
                        ? randomPointInsideCircle(position, jitter)
                        : position,
                    rotation: owner.rotation + Math.PI / 2
                        + (
                            definition.consistentPatterning
                                ? 8 * (i / (projCount - 1) - 0.5) ** 3
                                : randomFloat(-1, 1)
                        ) * spread,
                    layer: owner.layer,
                    rangeOverride
                }
            );
        }

        owner.recoil.active = true;
        owner.recoil.time = owner.game.now + definition.recoilDuration;
        owner.recoil.multiplier = definition.recoilMultiplier;

        if (definition.summonAirdrop) {
            owner.game.summonAirdrop(owner.position);
        }

        if (!definition.infiniteAmmo) {
            --this.ammo;
        }

        if (this.ammo <= 0) {
            this._shots = 0;
            this._reloadTimeout = owner.game.addTimeout(
                this.reload.bind(this, true),
                definition.fireDelay
            );
            return;
        }

        if (definition.fireMode === FireMode.Burst && this._shots >= definition.burstProperties.shotsPerBurst) {
            this._shots = 0;
            this._burstTimeout = setTimeout(
                this._useItemNoDelayCheck.bind(this, false),
                definition.burstProperties.burstCooldown
            );
            return;
        }

        if (
            (definition.fireMode !== FireMode.Single || owner.isMobile)
            && owner.activeItem === this
        ) {
            clearTimeout(this._autoFireTimeout);
            this._autoFireTimeout = setTimeout(
                this._useItemNoDelayCheck.bind(this, false),
                definition.fireDelay
            );
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
        const { owner, definition } = this;

        if (
            definition.infiniteAmmo
            || this.ammo >= definition.capacity
            || !owner.inventory.items.hasItem(definition.ammoType)
            || owner.action !== undefined
            || owner.activeItem !== this
            || (!skipFireDelayCheck && owner.game.now - this._lastUse < definition.fireDelay)
            || owner.downed
        ) return;

        owner.executeAction(new ReloadAction(owner, this));
    }
}
