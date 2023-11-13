import { InputActions, MAX_MOUSE_DISTANCE, PacketType } from "../constants";
import { type HealingItemDefinition } from "../definitions/healingItems";
import { Loots } from "../definitions/loots";
import { type ScopeDefinition } from "../definitions/scopes";
import { type SuroiBitStream, calculateEnumPacketBits } from "../utils/suroiBitStream";
import { Packet } from "./packet";

const INPUT_ACTIONS_BITS = calculateEnumPacketBits(InputActions);

export type InputAction = {
    readonly type: InputActions.UseItem
    readonly item: HealingItemDefinition | ScopeDefinition
} | {
    readonly type: InputActions.EquipItem | InputActions.DropItem
    readonly slot: number
} | {
    readonly type: Exclude<InputActions, InputActions.EquipItem | InputActions.DropItem | InputActions.UseItem>
};

export class InputPacket extends Packet {
    override readonly allocBytes = 16;
    override readonly type = PacketType.Input;

    movement!: {
        up: boolean
        down: boolean
        left: boolean
        right: boolean
    };

    isMobile!: boolean;
    mobile!: {
        moving: boolean
        angle: number
    };

    attacking!: boolean;

    turning!: boolean;
    rotation!: number;
    distanceToMouse!: number;

    actions: InputAction[] = [];

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeBoolean(this.movement.up);
        stream.writeBoolean(this.movement.down);
        stream.writeBoolean(this.movement.left);
        stream.writeBoolean(this.movement.right);

        if (this.isMobile) {
            stream.writeBoolean(this.mobile.moving);
            stream.writeRotation(this.mobile.angle, 16);
        }

        stream.writeBoolean(this.attacking);

        stream.writeBoolean(this.turning);
        if (this.turning) {
            stream.writeRotation(this.rotation, 16);
            if (!this.isMobile) stream.writeFloat(this.distanceToMouse, 0, MAX_MOUSE_DISTANCE, 8);
        }

        stream.writeBits(this.actions.length, 3);

        for (const action of this.actions) {
            stream.writeBits(action.type, INPUT_ACTIONS_BITS);

            switch (action.type) {
                case InputActions.EquipItem:
                case InputActions.DropItem:
                    stream.writeBits(action.slot, 2);
                    break;
                case InputActions.UseItem:
                    Loots.writeToStream(stream, action.item);
                    break;
            }
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        this.movement = {
            up: stream.readBoolean(),
            down: stream.readBoolean(),
            left: stream.readBoolean(),
            right: stream.readBoolean()
        };

        if (this.isMobile) {
            this.mobile = {
                moving: stream.readBoolean(),
                angle: stream.readRotation(16)
            };
        }

        this.attacking = stream.readBoolean();

        this.turning = stream.readBoolean();
        if (this.turning) {
            this.rotation = stream.readRotation(16);
            if (!this.isMobile) this.distanceToMouse = stream.readFloat(0, MAX_MOUSE_DISTANCE, 8);
        }

        // Actions
        const length = stream.readBits(3);
        for (let i = 0; i < length; i++) {
            const type = stream.readBits(INPUT_ACTIONS_BITS);

            let slot: number | undefined;
            let item: HealingItemDefinition | ScopeDefinition | undefined;

            switch (type) {
                case InputActions.EquipItem:
                case InputActions.DropItem:
                    slot = stream.readBits(2);
                    break;
                case InputActions.UseItem:
                    item = Loots.readFromStream<HealingItemDefinition | ScopeDefinition>(stream);
                    break;
            }

            this.actions.push({ type, item, slot });
        }
    }
}
