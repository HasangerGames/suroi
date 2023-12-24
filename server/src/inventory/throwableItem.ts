import { AnimationType } from "../../../common/src/constants";
import { type ThrowableDefinition } from "../../../common/src/definitions/throwables";
import { ItemType, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type Player } from "../objects/player";
import { CountableInventoryItem } from "./inventoryItem";

export class ThrowableItem extends CountableInventoryItem<ThrowableDefinition> {
    declare readonly category: ItemType.Throwable;

    count: number;

    constructor(definition: ReifiableDef<ThrowableDefinition>, owner: Player, count = 1) {
        super(definition, owner);

        this.count = count;

        if (this.category !== ItemType.Throwable) {
            throw new TypeError(`Attempted to create a Throwable object based on a definition for a non-gun object (Received a ${this.category as unknown as string} definition)`);
        }
    }

    private _useItemNoDelayCheck(skipAttackCheck: boolean): void {
        const owner = this.owner;
        // const definition = this.definition;

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
        owner.dirty.weapons = true;

        console.log("cook");
    }

    override stopUse(): void {
        console.log("yeet");
        this.owner.animation.type = AnimationType.ThrowableThrow;
        this.owner.animation.seq = !this.owner.animation.seq;
        this.owner.game.partialDirtyObjects.add(this.owner);
    }

    override useItem(): void {
        super._bufferAttack(
            this.definition.fireDelay ?? 150,
            this._useItemNoDelayCheck.bind(this, true)
        );
    }
}
