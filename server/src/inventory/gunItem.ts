import { AnimationType, FireMode } from "../../../common/src/constants.js";
import { type GunDefinition } from "../../../common/src/definitions/guns.js";
import { RectangleHitbox } from "../../../common/src/utils/hitbox.js";
import { degreesToRadians, distanceSquared } from "../../../common/src/utils/math.js";
import { ItemType, type ReferenceTo } from "../../../common/src/utils/objectDefinitions.js";
import { randomFloat, randomPointInsideCircle } from "../../../common/src/utils/random.js";
import { v, vAdd, vRotate, vSub } from "../../../common/src/utils/vector.js";
import { Obstacle } from "../objects/obstacle.js";
import { type Player } from "../objects/player.js";
import { ReloadAction } from "./action.js";
import { InventoryItem } from "./inventoryItem.js";
import { type Timeout } from "../../../common/src/utils/misc.js";

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

    private _dual = false;

    set dual(dual: boolean) {
        if (this.definition.dual === undefined) {
            throw new Error(`Tried to set dual on a weapon with no dual properties: ${this.definition.idString}`);
        }
        this._dual = dual;
    }

    get dual(): boolean { return this._dual; }

    altFire = false;

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
            (!skipAttackCheck && !owner.attacking) ||
            owner.dead ||
            owner.disconnected ||
            this !== this.owner.activeItem ||
            (definition.summonAirdrop && owner.isInsideBuilding)
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
        clearTimeout(this._burstTimeout);

        if (definition.fireMode === FireMode.Burst && this._shots >= definition.burstProperties.shotsPerBurst) {
            this._shots = 0;
            this._burstTimeout = setTimeout(
                this._useItemNoDelayCheck.bind(this, false),
                definition.burstProperties.burstCooldown
            );
            return;
        }

        owner.animation.type = definition.ballistics.lastShotFX && this.ammo === 1
            ? AnimationType.LastShot
            : this.altFire ? AnimationType.GunAlt : AnimationType.Gun;
        owner.animation.seq = !this.owner.animation.seq;
        owner.game.partialDirtyObjects.add(owner);

        owner.dirty.weapons = true;

        this._shots++;

        this._lastUse = owner.game.now;

        const { moveSpread, shotSpread } = this.dual ? definition.dual! : definition;

        const spread = degreesToRadians((this.owner.isMoving ? moveSpread : shotSpread) / 2);
        const jitter = definition.jitterRadius ?? 0;

        let offset = 0;
        if (definition.dual && this.dual) {
            offset = this.altFire ? -definition.dual.offset : definition.dual.offset;
            this.altFire = !this.altFire;
        }

        const startPosition = vRotate(v(0, offset), owner.rotation);

        let position = vAdd(
            owner.position,
            vRotate(v(definition.length + jitter, offset), owner.rotation) // player radius + gun length
        );

        for (
            const object of
            this.owner.game.grid.intersectsHitbox(RectangleHitbox.fromLine(startPosition, position))
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

        if (definition.summonAirdrop) {
            owner.game.summonAirdrop(owner.position);
        }

        if (!definition.infiniteAmmo) {
            --this.ammo;
        }

        if (this.ammo <= 0) {
            this._reloadTimeout = this.owner.game.addTimeout(
                this.reload.bind(this, true),
                this.fireDelay
            );
            this._shots = 0;
            return;
        }

        if (
            (definition.fireMode !== FireMode.Single || this.owner.isMobile) &&
            this.owner.activeItem === this
        ) {
            clearTimeout(this._autoFireTimeout);
            this._autoFireTimeout = setTimeout(
                this._useItemNoDelayCheck.bind(this, false),
                this.fireDelay
            );
        }
    }

    override useItem(): void {
        const def = this.definition;

        super._bufferAttack(
            def.fireMode === FireMode.Burst
                ? def.burstProperties.burstCooldown
                : this.fireDelay,
            this._useItemNoDelayCheck.bind(this, true)
        );
    }

    reload(skipFireDelayCheck = false): void {
        if (
            this.definition.infiniteAmmo === true ||
            this.ammo >= this.capacity ||
            this.owner.inventory.items[this.definition.ammoType] <= 0 ||
            this.owner.action !== undefined ||
            this.owner.activeItem !== this ||
            (!skipFireDelayCheck && this.owner.game.now - this._lastUse < this.fireDelay)
        ) return;

        this.owner.executeAction(new ReloadAction(this.owner, this));
    }

    get capacity(): number {
        return this.definition.capacity * (this.dual ? 2 : 1);
    }

    get fireDelay(): number {
        const def = this.definition;
        return def.dual && this.dual ? def.dual.fireDelay : def.fireDelay;
    }
}
