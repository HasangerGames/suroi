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
        const owner = this.owner;
        owner.animation.type = AnimationType.ThrowableThrow;
        owner.animation.seq = !this.owner.animation.seq;
        owner.game.partialDirtyObjects.add(owner);

        this._activeHandler?.throw(!this.isActive);
        this._activeHandler = undefined;
    }

    override useItem(): void {
        super._bufferAttack(
            this.definition.fireDelay ?? 150,
            this._useItemNoDelayCheck.bind(this, true)
        );
    }
}

class GrenadeHandler {
    private _cooking = false;
    private _thrown = false;
    private _timer?: Timeout;
    private _projectile?: ThrowableProjectile;

    constructor(
        readonly definition: ThrowableDefinition,
        readonly game: Game,
        readonly parent: ThrowableItem
    ) {}

    private _removeFromInventory(): void {
        const owner = this.parent.owner;
        owner.dirty.weapons = true;
        owner.inventory.removeThrowable(this.definition, false, 1);
    }

    private _detonate(): void {
        this.parent.owner.recoil.active = false;

        const explosion = this.definition.detonation.explosion;

        if (explosion !== undefined) {
            this.game.addExplosion(
                explosion,
                this._projectile?.position ?? this.parent.owner.position,
                this.parent.owner
            );
        }
    }

    cook(): void {
        const recoil = this.parent.owner.recoil;
        recoil.active = true;
        recoil.multiplier = this.definition.cookSpeedMultiplier;
        recoil.time = Infinity;

        if (this.definition.cookable) {
            this._timer = this.game.addTimeout(
                () => {
                    if (!this._thrown) {
                        this._removeFromInventory();
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

        const owner = this.parent.owner;

        this._timer ??= this.game.addTimeout(
            () => {
                this.destroy();
                this._detonate();
            },
            this.definition.fuseTime
        );

        const definition = this.definition;
        const projectile = this._projectile = this.game.addProjectile(definition, owner.position, this.parent);

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

        projectile.velocity = Vec.fromPolar(
            owner.rotation,
            soft
                ? 0
                : Math.min(
                    definition.maxThrowDistance,
                    owner.distanceToMouse
                ) / superStrangeMysteryConstant
        );

        this._removeFromInventory();
    }

    destroy(): void {
        this._cooking = false;
        this._timer?.kill();
        this._projectile && this.game.removeProjectile(this._projectile);
    }
}
