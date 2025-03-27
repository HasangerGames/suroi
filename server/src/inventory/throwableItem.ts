import { AnimationType, GameConstants } from "@common/constants";
import { PerkIds } from "@common/definitions/items/perks";
import { type ThrowableDefinition } from "@common/definitions/items/throwables";
import { Numeric } from "@common/utils/math";
import { ItemType, type ReifiableDef } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";
import { type ItemData } from "../objects/loot";
import { type Player } from "../objects/player";
import { CountableInventoryItem } from "./inventoryItem";
import { Timeout } from "@common/utils/misc";

export class ThrowableItem extends CountableInventoryItem.derive(ItemType.Throwable) {
    count: number;

    private _cookStart?: number;
    private _throwTimer?: Timeout;

    private _cooking = false;

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
            || this !== owner.activeItem
        ) {
            return;
        }

        if (owner.game.pluginManager.emit("inv_item_use", this) !== undefined) {
            return;
        }

        this._lastUse = owner.game.now;
        owner.animation = AnimationType.ThrowableCook;
        owner.setPartialDirty();

        owner.action?.cancel();

        this._cook();
    }

    override stopUse(): void {
        this._throw();
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

    private _cook(): void {
        if (this._cooking) return;
        this._cooking = true;

        const owner = this.owner;
        const game = owner.game;

        const recoil = owner.recoil;
        recoil.active = true;
        recoil.multiplier = this.definition.cookSpeedMultiplier;
        recoil.time = Infinity;

        if (this.definition.cookable) {
            this._throwTimer = game.addTimeout(
                () => {
                    recoil.active = false;
                    this._throw(true);
                },
                this.definition.fuseTime
            );
        }

        this._cookStart = game.now;
    }

    private _throw(soft = false): void {
        if (!this._cooking) return;
        this._cooking = false;

        this._throwTimer?.kill();
        this._throwTimer = undefined;

        const definition = this.definition;
        const owner = this.owner;
        const game = owner.game;

        owner.dirty.weapons = true;

        if (!owner.dead) {
            owner.inventory.removeThrowable(this.definition, false, 1);
        }

        owner.animation = AnimationType.ThrowableThrow;
        owner.setPartialDirty();

        owner.recoil.active = false;

        const speed = soft
            ? 0
            : Numeric.min(
                definition.physics.maxThrowDistance * owner.mapPerkOrDefault(PerkIds.DemoExpert, ({ rangeMod }) => rangeMod, 1),
                owner.distanceToMouse
            ) * GameConstants.projectiles.distanceToMouseMultiplier;

        const time = this.definition.cookable ? (game.now - (this._cookStart ?? 0)) : 0;

        const projectile = game.addProjectile({
            definition,
            position: Vec.add(
                owner.position,
                Vec.rotate(definition.animation.cook.rightFist, owner.rotation)
            ),
            layer: owner.layer,
            owner: owner,
            source: this,
            velocity: Vec.add(
                Vec.fromPolar(owner.rotation, speed),
                owner.movementVector
            ),
            height: this.definition.physics.initialHeight,
            fuseTime: this.definition.fuseTime - time
        });

        if (definition.c4) {
            owner.c4s.add(projectile);
            owner.dirty.activeC4s = true;
        }
    }
}
