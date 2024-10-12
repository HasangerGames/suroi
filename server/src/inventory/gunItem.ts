import { AnimationType, FireMode, InventoryMessages } from "@common/constants";
import { type GunDefinition } from "@common/definitions/guns";
import { PerkIds } from "@common/definitions/perks";
import { PickupPacket } from "@common/packets";
import { Orientation } from "@common/typings";
import { type BulletOptions } from "@common/utils/baseBullet";
import { CircleHitbox, RectangleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, isStairLayer } from "@common/utils/layer";
import { Angle, Geometry, resolveStairInteraction } from "@common/utils/math";
import { type DeepMutable, type DeepRequired, type Timeout } from "@common/utils/misc";
import { ItemType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { Vec } from "@common/utils/vector";

import { type Bullet } from "../objects";
import { type Player } from "../objects/player";
import { ReloadAction } from "./action";
import { InventoryItem } from "./inventoryItem";

// ! currently a massive fucking mess

type HitRecordEntry = readonly [boolean, number];
type SingleHitRecord = HitRecordEntry[];
type GroupedHitRecord = Map<Set<Bullet>, HitRecordEntry[]>;
//                          ^^^^^^^^^^^ use the group as a key

abstract class ShotManager<RecordType = unknown> {
    protected _hits = 0;
    get hits(): number { return this._hits; }

    protected _misses = 0;
    get misses(): number { return this._misses; }

    get accuracy(): number {
        return this._misses === 0
            ? 1
            : this._hits / (this._hits + this._misses);
    }

    protected _consecutiveHits = 0;
    get consecutiveHits(): number { return this._consecutiveHits; }

    abstract get hitRecord(): Readonly<RecordType>;

    constructor(readonly owner: GunItem, oldManager?: ShotManager) {}

    // protected abstract convertFromOtherManager(oldManager: ShotManager): void {}

    abstract addShot(bullet: Bullet): void;

    registerHit(_bullet: Bullet): void {
        ++this._consecutiveHits;
        ++this._hits;
    }

    registerMiss(_bullet: Bullet): void {
        this._consecutiveHits = 0;
        ++this._misses;
    }

    destroy(): void { /* no-op */ }
}

const sequenceSymbol: unique symbol = Symbol.for("bullet sequence");
type TrackedBullet = Bullet & { [sequenceSymbol]: number };

class SingleShotManager extends ShotManager<SingleHitRecord> {
    private readonly _shotsFired = new Set<TrackedBullet>();

    private _seq = 0;

    /*
        we want to track chains of hits, so we do so by
        creating a map whose keys are the bullets' sequence
        numbers and whose values are the length of the sequence
        to which those bullets belong

        to save memory, we only actually store the endpoints of each
        sequence

        for example, consider a volley of six shots A, B, C, D, E, and F.
        (the sequence numbers have been replaced with letters to aid
        legibility)
        if all 6 shots hit, we would have:

        { A: 6, F: 6 }

        if all shots except D hit, we would have:
        { A: 3, C: 3, E: 2, F: 2 }

        the strength of this is that a miss is treated the same as an
        inconclusive shot.

        if D had in fact just been slower to hit its target (instead of
        missing it), we'd be able to query C and E, and realize that we
        need to merge the two smaller sequences into one longer one

        here's another example:
        shot B hits first. we have { B: 1 }
        shot C hits second. when registering C, we notice B, and perform a merge to get { B: 2, C: 2 }
        shot A hits third. again, we notice that B has a sequence attached to it, and perform a merge to get { A: 3, C: 3 }
        shot D misses (despawns). we ignore it and do nothing.
        shot E hits fourth. having no neighbors which belong to a sequence (neither D nor F), it creates its own group.
        we thus get { A: 3, C: 3, E: 1 }

        since a map with numeric keys is just an array,
        we end up with a sparse array
    */
    private _sequences: Record<number, number | undefined> = [];

    private readonly _hitRecord: SingleHitRecord = [];
    override get hitRecord(): Readonly<SingleHitRecord> { return this._hitRecord; };

    override addShot(bullet: Bullet): void {
        (bullet as TrackedBullet)[sequenceSymbol] = this._seq++;
        this._shotsFired.add(bullet as TrackedBullet);
        this._sequences[this._seq] = 0;
    }

    override registerHit(bullet: Bullet): void {
        super.registerHit(bullet);
        const seq = (bullet as TrackedBullet)[sequenceSymbol];
        const prev = seq - 1;
        const next = seq + 1;

        const prevCount = this._sequences[prev];
        const nextCount = this._sequences[next];

        const hasPrev = prevCount !== undefined;
        const hasNext = nextCount !== undefined;

        this._sequences[seq] = 1;
        if (hasPrev && hasNext) {
            this._sequences[seq - prevCount] = this._sequences[seq + nextCount] = prevCount + nextCount + 1;

            // perform a merge of the two sequences bordering us
            // prev is no longer needed; seq - prevCount is the new bound
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this._sequences[prev];
            // next is no longer needed; seq + nextCount is the new bound
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this._sequences[next];
        }

        if (hasPrev) {
            // augment the sequence preceding us
            // and then adjust the other bound's value
            this._sequences[seq - prevCount] = this._sequences[seq] = prevCount + 1;
            // prev is no longer needed; seq is the new bound
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this._sequences[prev];
        }

        if (hasNext) {
            // add ourselves to the sequence after us
            this._sequences[seq + nextCount] = this._sequences[seq] = nextCount + 1;
            // next is no longer needed; seq is the new bound
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this._sequences[next];
        }

        this._shotsFired.delete(bullet as TrackedBullet);
        this._hitRecord.push([true, this.owner.owner.game.now]);
    }

    override registerMiss(bullet: Bullet): void {
        super.registerMiss(bullet);
        this._shotsFired.delete(bullet as TrackedBullet);
        this._hitRecord.push([false, this.owner.owner.game.now]);
    }

    override destroy(): void {
        super.destroy();
        this._hitRecord.length = 0;
        this._shotsFired.clear();
    }
}

class GroupedShotManager extends ShotManager<GroupedHitRecord> {
    private readonly _shotsFired = new Set<Set<Bullet>>();

    private _lastGroup: Set<Bullet> | undefined;

    private readonly _hitRecord: GroupedHitRecord = new Map();
    override get hitRecord(): Readonly<GroupedHitRecord> { return this._hitRecord; };

    private readonly _bulletGroupMap = new Map<Bullet, Set<Bullet>>();

    override addShot(bullet: Bullet): void {
        if (this._lastGroup === undefined) {
            this._shotsFired.add(this._lastGroup = new Set([bullet]));
        } else {
            this._lastGroup.add(bullet);
        }

        this._bulletGroupMap.set(bullet, this._lastGroup);
    }

    closeGroup(): void {
        this._lastGroup = undefined;
    }

    private _addEntryToRecord(bullet: Bullet, entry: HitRecordEntry): void {
        const key = this._bulletGroupMap.get(bullet);

        if (key === undefined) {
            return;
        }

        let hitRecord = this._hitRecord.get(key);
        if (hitRecord === undefined) {
            this._hitRecord.set(key, hitRecord = [entry]);
        } else {
            hitRecord.push(entry);
        }
    }

    override registerHit(bullet: Bullet): void {
        super.registerHit(bullet);
        this._addEntryToRecord(bullet, [true, this.owner.owner.game.now]);
    }

    override registerMiss(bullet: Bullet): void {
        super.registerMiss(bullet);
        this._addEntryToRecord(bullet, [false, this.owner.owner.game.now]);
    }

    override destroy(): void {
        super.destroy();
        this._bulletGroupMap.clear();
        this._hitRecord.clear();
        this._shotsFired.clear();
    }
}

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

    private _shotManager: ShotManager = new SingleShotManager(this);
    private _usingGroups = false;

    get hits(): number { return this._shotManager.hits; };
    get misses(): number { return this._shotManager.misses; };
    get consecutiveHits(): number { return this._shotManager.consecutiveHits; }
    get accuracy(): number { return this._shotManager.accuracy; };

    registerHit(bullet: Bullet): void {
        this._shotManager.registerHit(bullet);

        // const hitRecord = this.hitRecord;
        // // registerHit always leaves the hitRecord non-empty
        // // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        // const now = hitRecord.at(-1)![1];

        // this.owner.ifPerkPresent(PerkIds.Recycling, ({ hitReq, accThreshold, refund, margin: marginMult }) => {
        //     const limit = hitReq - 1; // -1 cause the hit coming in doesn't need validating
        //     if (hitRecord.length < limit || this.consecutiveHits % hitReq !== 0) return;

        //     const margin = marginMult * this.definition.fireDelay;
        //     let lastTime = now;

        //     for (
        //         let off = 1, idx = hitRecord.length - off;
        //         off <= limit;
        //         off++, idx--
        //     ) {
        //         const [hit, time] = hitRecord[idx];
        //         if (!hit || lastTime - time > margin) return;
        //         lastTime = time;
        //     }

        //     this.ammo += refund;
        // });
    }

    registerMiss(bullet: Bullet): void {
        this._shotManager.registerMiss(bullet);
    }

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
        let projCount = definition.bulletCount;

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
        for (const perk of owner.perks) {
            switch (perk.idString) {
                case PerkIds.Splinter: {
                    projCount *= perk.split;
                    modifiers.damage *= perk.damageMod;
                    modifyForDamageMod(perk.damageMod);
                    modifiersModified = true;
                    break;
                }
                case PerkIds.Sabot: {
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
                        owner.hasPerk(PerkIds.HiCap)
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

        const useGroups = projCount > 1;
        if (useGroups !== this._usingGroups) {
            this._shotManager.destroy();
            this._shotManager = new ((this._usingGroups = useGroups) ? GroupedShotManager : SingleShotManager)(this);
        }

        for (let i = 0; i < projCount; i++) {
            const finalSpawnPosition = jitter ? randomPointInsideCircle(position, jitter) : position;

            this._shotManager.addShot(
                owner.game.addBullet(
                    this,
                    owner,
                    {
                        position: finalSpawnPosition,
                        rotation: owner.rotation + Math.PI / 2
                            + (
                                definition.consistentPatterning
                                    ? 8 * (i / (projCount - 1) - 0.5) ** 3
                                    : randomFloat(-1, 1)
                            ) * spread,
                        layer: isStairLayer(owner.layer) && owner.activeStair
                            ? resolveStairInteraction(
                                owner.activeStair.definition,
                                owner.activeStair.rotation as Orientation,
                                owner.activeStair.hitbox as RectangleHitbox,
                                owner.activeStair.layer,
                                finalSpawnPosition
                            )
                            : owner.layer,
                        rangeOverride,
                        modifiers: modifiersModified ? modifiers : undefined,
                        saturate,
                        thin
                    }
                )
            );
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
            || this.ammo >= (this.owner.hasPerk(PerkIds.HiCap) ? definition.extendedCapacity ?? definition.capacity : definition.capacity)
            || (!owner.inventory.items.hasItem(definition.ammoType) && !this.owner.hasPerk(PerkIds.InfiniteAmmo))
            || owner.action !== undefined
            || owner.activeItem !== this
            || (!skipFireDelayCheck && owner.game.now - this._lastUse < definition.fireDelay)
            || owner.downed
        ) return;

        owner.executeAction(new ReloadAction(owner, this));
    }

    override destroy(): void {
        this._shotManager.destroy();

        /* eslint-disable @typescript-eslint/no-meaningless-void-operator */
        // shut the fuck up, i'm using it to turn smth into undefined
        this._reloadTimeout = void this._reloadTimeout?.kill();
        this._burstTimeout = void clearTimeout(this._burstTimeout);
        this._autoFireTimeout = void clearTimeout(this._autoFireTimeout);
    }
}
