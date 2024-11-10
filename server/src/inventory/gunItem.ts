import { AnimationType, FireMode, InventoryMessages } from "@common/constants";
import { type GunDefinition } from "@common/definitions/guns";
import { PerkData, PerkIds } from "@common/definitions/perks";
import { PickupPacket } from "@common/packets/pickupPacket";
import { Orientation } from "@common/typings";
import { type BulletOptions } from "@common/utils/baseBullet";
import { CircleHitbox, RectangleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, isStairLayer } from "@common/utils/layer";
import { Angle, Geometry, HALF_PI, resolveStairInteraction } from "@common/utils/math";
import { type DeepMutable, type DeepRequired, type Timeout } from "@common/utils/misc";
import { ItemType, type ReifiableDef } from "@common/utils/objectDefinitions";
import { randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type ItemData } from "../objects/loot";
import { type Player } from "../objects/player";
import { getPatterningShape } from "../utils/misc";
import { ReloadAction } from "./action";
import { InventoryItem } from "./inventoryItem";

/**
 * A class representing a firearm
 */
export class GunItem extends InventoryItem<GunDefinition> {
    declare readonly category: ItemType.Gun;

    ammo = 0;

    private _consecutiveShots = 0;

    private _shots = 0;
    get shots(): number { return this._shots; }

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
    constructor(idString: ReifiableDef<GunDefinition>, owner: Player, data?: ItemData<GunDefinition>) {
        super(idString, owner);

        if (this.category !== ItemType.Gun) {
            throw new TypeError(`Attempted to create a Gun object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }

        if (data) {
            this.stats.kills = data.kills;
            this.stats.damage = data.damage;
            this._shots = data.totalShots;
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
        ) {
            this._consecutiveShots = 0;
            return;
        }

        if (definition.summonAirdrop && owner.isInsideBuilding) {
            owner.sendPacket(PickupPacket.create({ message: InventoryMessages.CannotUseRadio }));
            this._consecutiveShots = 0;
            return;
        }

        if (this.ammo <= 0) {
            if (!owner.inventory.items.hasItem(definition.ammoType)) {
                owner.animation = AnimationType.GunClick;
                owner.setPartialDirty();
            }

            this._consecutiveShots = 0;
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

        this._consecutiveShots++;
        this._shots++;

        const { moveSpread, shotSpread, fsaReset } = definition;

        let spread = owner.game.now - this._lastUse >= (fsaReset ?? Infinity)
            ? 0
            : Angle.degreesToRadians((owner.isMoving ? moveSpread : shotSpread) / 2);

        this._lastUse = owner.game.now;
        const jitter = definition.jitterRadius;
        // when are we gonna have a perk that takes this mechanic and chucks it in the fucking trash where it belongs

        const offset = definition.isDual
            ? ((this._altFire = !this._altFire) ? 1 : -1) * definition.leftRightOffset
            : (definition.bulletOffset ?? 0);

        const startPosition = Vec.rotate(Vec.create(0, offset), owner.rotation);

        const ownerPos = owner.position;
        let position = Vec.add(
            ownerPos,
            Vec.scale(Vec.rotate(Vec.create(definition.length, offset), owner.rotation), owner.sizeMod)
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

            const intersection = object.hitbox.intersectsLine(ownerPos, position);
            if (intersection === null) continue;

            if (Geometry.distanceSquared(ownerPos, position) > Geometry.distanceSquared(ownerPos, intersection.point)) {
                position = Vec.sub(intersection.point, Vec.rotate(Vec.create(0.2 + jitter, 0), owner.rotation));
            }
        }

        const rangeOverride = owner.distanceToMouse - this.definition.length;
        const projCount = definition.bulletCount;

        const modifiers: DeepMutable<DeepRequired<BulletOptions["modifiers"]>> = {
            damage: 1,
            dtc: 1,
            range: 1,
            speed: 1,
            tracer: {
                opacity: 1,
                width: 1,
                length: 1
            }
        };
        let saturate = false;
        let thin = false;

        const modifyForDamageMod = (damageMod: number): void => {
            if (damageMod < 1) thin = true;
            if (damageMod > 1) saturate = true;
        };

        // ! evil starts here
        let modifiersModified = false; // lol
        let doSplinterGrouping = false;
        for (const perk of owner.perks) {
            switch (perk.idString) {
                case PerkIds.Flechettes: {
                    if (definition.ballistics.onHitExplosion === undefined && !definition.summonAirdrop) {
                        doSplinterGrouping = true;
                        modifiers.damage *= perk.damageMod;
                        modifyForDamageMod(perk.damageMod);
                        modifiersModified = true;
                    }
                    break;
                }
                case PerkIds.SabotRounds: {
                    modifiers.range *= perk.rangeMod;
                    modifiers.speed *= perk.speedMod;
                    modifiers.damage *= perk.damageMod;
                    modifyForDamageMod(perk.damageMod);
                    modifiers.tracer.length *= perk.tracerLengthMod;
                    spread *= perk.spreadMod;
                    modifiersModified = true;
                    break;
                }
                case PerkIds.CloseQuartersCombat: {
                    const sqCutoff = perk.cutoff ** 2;
                    if (
                        [
                            ...this.owner.game.grid.intersectsHitbox(
                                new CircleHitbox(perk.cutoff, ownerPos),
                                this.owner.layer
                            )
                        ].some(
                            obj => obj !== owner
                                && obj.isPlayer
                                && (!owner.game.teamMode || obj.teamID !== owner.teamID)
                                && Geometry.distanceSquared(ownerPos, obj.position) <= sqCutoff
                        )
                    ) {
                        modifiers.damage *= perk.damageMod;
                        modifyForDamageMod(perk.damageMod);
                    }
                    break;
                }
                case PerkIds.Toploaded: {
                    // assumption: threshholds are sorted from least to greatest
                    const ratio = 1 - this.ammo / (
                        owner.hasPerk(PerkIds.ExtendedMags)
                            ? definition.extendedCapacity ?? definition.capacity
                            : definition.capacity
                    );

                    for (const [cutoff, mod] of perk.thresholds) {
                        if (ratio <= cutoff) {
                            modifiers.damage *= mod;
                            modifyForDamageMod(mod);
                            break;
                        }
                    }
                    break;
                }
            }
        }
        // ! evil ends here

        const activeStair = owner.activeStair;
        const getStartingLayer = isStairLayer(owner.layer) && activeStair !== undefined
            ? resolveStairInteraction.bind(
                null,
                activeStair.definition,
                activeStair.rotation as Orientation,
                activeStair.hitbox as RectangleHitbox,
                activeStair.layer
            )
            : (_: Vector) => owner.layer;

        const spawn = (position: Vector, spread: number): void => {
            owner.game.addBullet(
                this,
                owner,
                {
                    position,
                    rotation: owner.rotation + HALF_PI + spread,
                    layer: getStartingLayer(position),
                    rangeOverride,
                    modifiers: modifiersModified ? modifiers : undefined,
                    saturate,
                    thin
                }
            );
        };

        const { split, deviation } = PerkData[PerkIds.Flechettes];
        const pcM1 = projCount - 1;
        const sM1 = split - 1;

        let pattern: Vector[] | undefined;
        for (let i = 0; i < projCount; i++) {
            let finalSpawnPosition: Vector;
            let rotation: number;

            if (definition.consistentPatterning) {
                if (jitter === 0) {
                    finalSpawnPosition = position;
                    rotation = 8 * (i / pcM1 - 0.5) ** 3;
                } else {
                    const patternPoint = (pattern ??= getPatterningShape(projCount, jitter))[i];
                    finalSpawnPosition = Vec.add(position, Vec.rotate(patternPoint, owner.rotation));
                    rotation = (patternPoint.y / jitter) ** 3;
                }
            } else {
                finalSpawnPosition = jitter === 0 ? position : randomPointInsideCircle(position, jitter);
                rotation = randomFloat(-1, 1);
            }

            rotation *= spread;

            if (!doSplinterGrouping) {
                spawn(finalSpawnPosition, rotation);
                continue;
            }

            const dev = Angle.degreesToRadians(deviation);

            for (let j = 0; j < split; j++) {
                spawn(
                    finalSpawnPosition,
                    (8 * (j / sM1 - 0.5) ** 3) * dev + rotation
                );
            }
        }

        owner.recoil.active = true;
        owner.recoil.time = owner.game.now + definition.recoilDuration;
        owner.recoil.multiplier = definition.recoilMultiplier;

        if (definition.summonAirdrop) {
            owner.game.summonAirdrop(owner.position);

            if (
                this.owner.mapPerkOrDefault(
                    PerkIds.InfiniteAmmo,
                    ({ airdropCallerLimit }) => this._shots >= airdropCallerLimit,
                    false
                )
            ) {
                owner.sendPacket(PickupPacket.create({ message: InventoryMessages.RadioOverused }));
                this.owner.inventory.destroyWeapon(this.owner.inventory.activeWeaponIndex);
                return;
            }
        }

        if (!definition.infiniteAmmo) {
            --this.ammo;
        }

        if (this.ammo <= 0) {
            this._consecutiveShots = 0;
            this._reloadTimeout = owner.game.addTimeout(
                this.reload.bind(this, true),
                definition.fireDelay
            );
            return;
        }

        if (definition.fireMode === FireMode.Burst && this._consecutiveShots >= definition.burstProperties.shotsPerBurst) {
            this._consecutiveShots = 0;
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

    override itemData(): ItemData<GunDefinition> {
        return {
            kills: this.stats.kills,
            damage: this.stats.damage,
            totalShots: this._shots
        };
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
            || this.ammo >= (this.owner.hasPerk(PerkIds.ExtendedMags) ? definition.extendedCapacity ?? definition.capacity : definition.capacity)
            || (!owner.inventory.items.hasItem(definition.ammoType) && !this.owner.hasPerk(PerkIds.InfiniteAmmo))
            || owner.action !== undefined
            || owner.activeItem !== this
            || (!skipFireDelayCheck && owner.game.now - this._lastUse < definition.fireDelay)
            || owner.downed
        ) return;

        owner.executeAction(new ReloadAction(owner, this));
    }

    override destroy(): void {
        /* eslint-disable @typescript-eslint/no-meaningless-void-operator */
        // shut the fuck up, i'm using it to turn smth into undefined
        this._reloadTimeout = void this._reloadTimeout?.kill();
        this._burstTimeout = void clearTimeout(this._burstTimeout);
        this._autoFireTimeout = void clearTimeout(this._autoFireTimeout);
    }
}
