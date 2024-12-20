import { AnimationType, Layer } from "@common/constants";
import { PerkData, PerkIds } from "@common/definitions/perks";
import { type ThrowableDefinition } from "@common/definitions/throwables";
import { Numeric } from "@common/utils/math";
import { type Timeout } from "@common/utils/misc";
import { ItemType, type ReifiableDef } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";
import { type Game } from "../game";
import { type ItemData } from "../objects/loot";
import { type Player } from "../objects/player";
import { type ThrowableProjectile } from "../objects/throwableProj";
import { CountableInventoryItem } from "./inventoryItem";

export class ThrowableItem extends CountableInventoryItem<ThrowableDefinition> {
    declare readonly category: ItemType.Throwable;

    count: number;

    private _activeHandler?: GrenadeHandler;

    constructor(definition: ReifiableDef<ThrowableDefinition>, owner: Player, data?: ItemData<ThrowableDefinition>, count = 1) {
        super(definition, owner);

        this.count = count;

        if (this.category !== ItemType.Throwable) {
            throw new TypeError(`Attempted to create a Throwable object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }

        if (data) {
            this.stats.kills = data.kills;
            this.stats.damage = data.damage;
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

    override itemData(): ItemData<ThrowableDefinition> {
        return {
            kills: this.stats.kills,
            damage: this.stats.damage
        };
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
        const { explosion } = this.definition.detonation;

        const particles = (this.owner.halloweenThrowableSkin && this.definition.detonation.spookyParticles) ? this.definition.detonation.spookyParticles : this.definition.detonation.particles;

        const referencePosition = Vec.clone(this._projectile?.position ?? this.parent.owner.position);
        const game = this.game;

        if (explosion !== undefined) {
            game.addExplosion(
                explosion,
                referencePosition,
                this.parent.owner,
                this._projectile?.layer ?? this.parent.owner.layer,
                this.parent,
                (this._projectile?.halloweenSkin ?? false) ? PerkData[PerkIds.PlumpkinBomb].damageMod : 1
            );
        }

        if (particles !== undefined) {
            game.addSyncedParticles(particles, referencePosition, this._projectile ? this._projectile.layer : Layer.Ground);
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

        if (this.definition.cookable && !this.definition.c4) {
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

        if (!this.definition.c4) {
            this._timer ??= this.game.addTimeout(
                () => {
                    this.destroy();
                    this._detonate();
                },
                this.definition.fuseTime
            );
        }

        const projectile = this._projectile = this.game.addProjectile(
            definition,
            Vec.add(
                this.owner.position,
                Vec.rotate(definition.animation.cook.rightFist, this.owner.rotation)
            ),
            this.parent.owner.layer,
            this.parent
        );

        if (!this.definition.c4) {
            projectile.velocity = Vec.add(
                Vec.fromPolar(
                    this.owner.rotation,
                    soft
                        ? 0
                        : Numeric.min(
                            definition.maxThrowDistance * this.owner.mapPerkOrDefault(PerkIds.DemoExpert, ({ rangeMod }) => rangeMod, 1),
                            0.9 * this.owner.distanceToMouse
                        //  ^^^ Grenades will consistently undershoot the mouse by 10% in order to make long-range shots harder
                        //      while not really affecting close-range shots
                        ) / 985
                        //  ^^^ Heuristics says that dividing desired range by this number makes the grenade travel roughly that distance
                ),
                this.owner.movementVector
            );
        }
    }

    destroy(): void {
        this._cookStart = undefined;
        this._timer?.kill();

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this._projectile && this.game.removeProjectile(this._projectile);
    }
}
