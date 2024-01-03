import { AnimationType } from "../../../common/src/constants";
import { SyncedParticles } from "../../../common/src/definitions/syncedParticles";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { EaseFunctions } from "../../../common/src/utils/math";
import { type Timeout } from "../../../common/src/utils/misc";
import { ItemType, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { randomFloat, randomRotation } from "../../../common/src/utils/random";
import { Vec } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type Player } from "../objects/player";
import { type ThrowableProjectile } from "../objects/throwableProj";
import { CountableInventoryItem } from "./inventoryItem";

export class ThrowableItem extends CountableInventoryItem<ThrowableDefinition> {
    declare readonly category: ItemType.Throwable;

    count: number;

    private _activeHandler?: GrenadeHandler;

    constructor(definition: ReifiableDef<ThrowableDefinition>, owner: Player, count = 1) {
        super(definition, owner);

        this.count = count;

        if (this.category !== ItemType.Throwable) {
            throw new TypeError(`Attempted to create a Throwable object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }
    }

    private _useItemNoDelayCheck(skipAttackCheck: boolean): void {
        const owner = this.owner;

        this._lastUse = owner.game.now;
        owner.animation.type = AnimationType.ThrowableCook;
        owner.animation.seq = !this.owner.animation.seq;
        owner.game.partialDirtyObjects.add(owner);

        if (
            (!skipAttackCheck && !owner.attacking) ||
            owner.dead ||
            owner.disconnected ||
            this !== this.owner.activeItem
        ) {
            return;
        }

        owner.action?.cancel();

        this._activeHandler = new GrenadeHandler(this.definition, this.owner.game, this);
        this._activeHandler.cook();
    }

    override stopUse(): void {
        this._activeHandler?.throw(!this.isActive);
        this._activeHandler = undefined;
    }

    override useItem(): void {
        super._bufferAttack(
            this.definition.fireDelay ?? 250,
            this._useItemNoDelayCheck.bind(this, true)
        );
    }
}

class GrenadeHandler {
    private _cooking = false;
    private _thrown = false;
    private _timer?: Timeout;
    private _projectile?: ThrowableProjectile;

    readonly owner: Player;

    constructor(
        readonly definition: ThrowableDefinition,
        readonly game: Game,
        readonly parent: ThrowableItem
    ) {
        this.owner = this.parent.owner;
    }

    private _detonate(): void {
        const { explosion, particles } = this.definition.detonation;

        if (explosion !== undefined) {
            this.game.addExplosion(
                explosion,
                this._projectile?.position ?? this.parent.owner.position,
                this.parent.owner
            );
        }

        if (particles !== undefined) {
            const particleDef = SyncedParticles.fromString(particles.type);
            const referencePosition = this._projectile?.position ?? this.parent.owner.position;
            const spawnInterval = particles.spawnInterval ?? 0;

            for (let i = 0, count = particles.count; i < count; i++) {
                const target = Vec.add(
                    Vec.fromPolar(
                        randomRotation(),
                        randomFloat(0, particles.spawnRadius)
                    ),
                    referencePosition
                );

                const particle = this.game.addSyncedParticle(
                    particleDef,
                    referencePosition
                );

                if (spawnInterval) {
                    particle.setTarget(target, spawnInterval, EaseFunctions.circOut);
                } else {
                    particle._position = target;
                }
            }
        }
    }

    private _resetAnimAndRemoveFromInv(): void {
        const owner = this.owner;

        owner.dirty.weapons = true;

        if (!owner.dead) {
            owner.inventory.removeThrowable(this.definition, false, 1);
        }

        const animation = owner.animation;

        animation.type = AnimationType.ThrowableThrow;
        animation.seq = !animation.seq;
        owner.game.partialDirtyObjects.add(owner);
    }

    cook(): void {
        const owner = this.parent.owner;
        const recoil = owner.recoil;
        recoil.active = true;
        recoil.multiplier = this.definition.cookSpeedMultiplier;
        recoil.time = Infinity;

        if (this.definition.cookable) {
            this._timer = this.game.addTimeout(
                () => {
                    if (!this._thrown) {
                        recoil.active = false;
                        this._resetAnimAndRemoveFromInv();
                    }

                    this.destroy();
                    this._detonate();
                },
                this.definition.fuseTime
            );
        }

        this._cooking = true;
    }

    throw(soft = false): void {
        if (!this._cooking || this._thrown) { return; }
        this.parent.owner.recoil.active = false;
        this._thrown = true;

        this._resetAnimAndRemoveFromInv();

        this._timer ??= this.game.addTimeout(
            () => {
                this.destroy();
                this._detonate();
            },
            this.definition.fuseTime
        );

        const definition = this.definition;
        const rightFist = definition.animation.cook.rightFist;
        const projectile = this._projectile = this.game.addProjectile(
            definition,
            Vec.add(
                this.owner.position,
                Vec.rotate(rightFist, this.owner.rotation)
            ),
            this.parent
        );

        /**
         * Heuristics says that dividing desired range by this number makes the grenade travel roughly that distance
         *
         * For most ranges, the error is below 0.1%, and it behaves itself acceptably at different tickrates (low tickrates
         * go slightly further, high tickrates go very very slightly less far)
         *
         * At very close range (the range most people would call "dropping at one's feet"), this prediction loses accuracy, but
         * it's not a big deal because the affected range is when the desired distance is < 0.6 units
         */
        const superStrangeMysteryConstant = 787.245;

        projectile.velocity = Vec.add(
            Vec.fromPolar(
                this.owner.rotation,
                soft
                    ? 0
                    : Math.min(
                        definition.maxThrowDistance,
                        this.owner.distanceToMouse
                    ) / superStrangeMysteryConstant
            ),
            this.owner.movementVector
        );
    }

    destroy(): void {
        this._cooking = false;
        this._timer?.kill();
        this._projectile && this.game.removeProjectile(this._projectile);
    }
}
