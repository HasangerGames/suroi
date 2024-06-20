import { AnimationType } from "../../../common/src/constants";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { type Timeout } from "../../../common/src/utils/misc";
import { ItemType, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
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

        if (
            (!skipAttackCheck && !owner.attacking)
            || owner.dead
            || owner.downed
            || owner.disconnected
            || this !== this.owner.activeItem
            || this._activeHandler
        ) {
            return;
        }

        this._lastUse = owner.game.now;
        owner.animation = AnimationType.ThrowableCook;
        owner.setPartialDirty();

        owner.action?.cancel();

        this._activeHandler = new GrenadeHandler(this.definition, this.owner.game, this, () => this._detachHandler());
        this._activeHandler.cook();
    }

    override stopUse(): void {
        this._activeHandler?.throw(!this.isActive);
    }

    private _detachHandler(): void {
        this._activeHandler = undefined;
    }

    override useItem(): void {
        super._bufferAttack(
            this.definition.fireDelay,
            this._useItemNoDelayCheck.bind(this, true)
        );
    }
}

class GrenadeHandler {
    private _cookStart?: number;
    private _thrown = false;
    private _scheduledThrow?: Timeout;
    private _timer?: Timeout;
    private _projectile?: ThrowableProjectile;

    readonly owner: Player;

    constructor(
        readonly definition: ThrowableDefinition,
        readonly game: Game,
        readonly parent: ThrowableItem,
        readonly detach: () => void
    ) {
        this.owner = this.parent.owner;
    }

    private _detonate(): void {
        const { explosion, particles } = this.definition.detonation;

        const referencePosition = Vec.clone(this._projectile?.position ?? this.parent.owner.position);
        const game = this.game;

        if (explosion !== undefined) {
            game.addExplosion(
                explosion,
                referencePosition,
                this.parent.owner
            );
        }

        if (particles !== undefined) {
            game.addSyncedParticles(particles, referencePosition);
        }
    }

    private _resetAnimAndRemoveFromInv(): void {
        const owner = this.owner;

        owner.dirty.weapons = true;

        if (!owner.dead) {
            owner.inventory.removeThrowable(this.definition, false, 1);
        }

        owner.animation = AnimationType.ThrowableThrow;
        owner.setPartialDirty();
    }

    cook(): void {
        if (this._cookStart !== undefined || this._thrown || this._scheduledThrow) return;

        const owner = this.parent.owner;
        const recoil = owner.recoil;
        recoil.active = true;
        recoil.multiplier = this.definition.cookSpeedMultiplier;
        recoil.time = Infinity;

        if (this.definition.cookable) {
            this._timer = this.game.addTimeout(
                () => {
                    if (!this._thrown) {
                        this.detach();
                        recoil.active = false;
                        this._resetAnimAndRemoveFromInv();
                    }

                    this.destroy();
                    this._detonate();
                },
                this.definition.fuseTime
            );
        }

        this._cookStart = this.game.now;
    }

    throw(soft = false): void {
        if (this._cookStart === undefined || this._thrown) return;

        if (this._scheduledThrow) {
            if (soft) {
                this._scheduledThrow.kill();
                this._throwInternal(true);
            }

            return;
        }

        const cookTimeLeft = this.definition.cookTime - this.game.now + this._cookStart;
        if (cookTimeLeft > 0) {
            this._scheduledThrow = this.game.addTimeout(
                () => {
                    this._throwInternal(soft);
                },
                cookTimeLeft
            );
            return;
        }

        this._throwInternal(soft);
    }

    private _throwInternal(soft = false): void {
        this.detach();

        const definition = this.definition;

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

        const projectile = this._projectile = this.game.addProjectile(
            definition,
            Vec.add(
                this.owner.position,
                Vec.rotate(definition.animation.cook.rightFist, this.owner.rotation)
            ),
            this.parent
        );

        /**
         * Heuristics says that dividing desired range by this number makes the grenade travel roughly that distance
         *
         * For most ranges, the error is below 0.1%, and it behaves itself acceptably at different tickrates (low tickrates
         * go slightly further, high tickrates go very very slightly less far)
         *
         * At very close range (the range most people would call "dropping at one's feet"), this prediction loses accuracy,
         * but it's not a big deal because the affected range is when the desired distance is < 1 unit, and the largest
         * error is of about 0.8%
         */
        const superStrangeMysteryConstant = 2.79 * Math.log(1.6) / 1000;

        projectile.velocity = Vec.add(
            Vec.fromPolar(
                this.owner.rotation,
                soft
                    ? 0
                    : Math.min(
                        definition.maxThrowDistance,
                        this.owner.distanceToMouse
                    ) * superStrangeMysteryConstant
            ),
            this.owner.movementVector
        );
    }

    destroy(): void {
        this._cookStart = undefined;
        this._timer?.kill();
        this._projectile && this.game.removeProjectile(this._projectile);
    }
}
