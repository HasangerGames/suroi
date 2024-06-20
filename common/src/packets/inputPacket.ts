import { GameConstants, InputActions } from "../constants";
import { type AmmoDefinition } from "../definitions/ammos";
import { type ArmorDefinition } from "../definitions/armors";
import { type BackpackDefinition } from "../definitions/backpacks";
import { type EmoteDefinition, Emotes } from "../definitions/emotes";
import { type HealingItemDefinition } from "../definitions/healingItems";
import { Loots } from "../definitions/loots";
import { type MapPingDefinition, MapPings, type PlayerPing } from "../definitions/mapPings";
import { type ScopeDefinition } from "../definitions/scopes";
import { type ThrowableDefinition } from "../definitions/throwables";
import { calculateEnumPacketBits, type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { type Packet } from "./packet";

const INPUT_ACTIONS_BITS = calculateEnumPacketBits(InputActions);

/**
 * {@linkcode InputAction}s requiring no additional parameter
 */
export type SimpleInputActions = Exclude<
    InputActions,
    InputActions.EquipItem
    | InputActions.DropWeapon
    | InputActions.DropItem
    | InputActions.UseItem
    | InputActions.Emote
    | InputActions.MapPing
    | InputActions.LockSlot
    | InputActions.UnlockSlot
    | InputActions.ToggleSlotLock
>;

export type InputAction = {
    readonly type: InputActions.UseItem
    readonly item: HealingItemDefinition | ScopeDefinition | ThrowableDefinition
} | {
    readonly type: InputActions.DropItem
    readonly item: HealingItemDefinition | ScopeDefinition | ThrowableDefinition | ArmorDefinition | BackpackDefinition | AmmoDefinition
} | {
    readonly type: InputActions.EquipItem | InputActions.DropWeapon | InputActions.LockSlot | InputActions.UnlockSlot | InputActions.ToggleSlotLock
    readonly slot: number
} | {
    readonly type: InputActions.Emote
    readonly emote: EmoteDefinition
} | {
    readonly type: InputActions.MapPing
    readonly ping: PlayerPing
    readonly position: Vector
} | { readonly type: SimpleInputActions };

export class InputPacket implements Packet {
    movement!: {
        up: boolean
        down: boolean
        left: boolean
        right: boolean
    };

    isMobile = false;
    mobile!: {
        moving: boolean
        angle: number
    };

    attacking!: boolean;

    turning!: boolean;
    rotation!: number;
    distanceToMouse!: number;

    actions: InputAction[] = [];

    serialize(stream: SuroiBitStream): void {
        stream.writeBoolean(this.movement.up);
        stream.writeBoolean(this.movement.down);
        stream.writeBoolean(this.movement.left);
        stream.writeBoolean(this.movement.right);

        stream.writeBoolean(this.isMobile);
        if (this.isMobile) {
            stream.writeBoolean(this.mobile.moving);
            stream.writeRotation(this.mobile.angle, 16);
        }

        stream.writeBoolean(this.attacking);

        stream.writeBoolean(this.turning);
        if (this.turning) {
            stream.writeRotation(this.rotation, 16);
            if (!this.isMobile) {
                stream.writeFloat(this.distanceToMouse, 0, GameConstants.player.maxMouseDist, 8);
            }
        }

        stream.writeArray(this.actions, 3, action => {
            stream.writeBits(action.type, INPUT_ACTIONS_BITS);

            switch (action.type) {
                case InputActions.EquipItem:
                case InputActions.DropWeapon:
                case InputActions.LockSlot:
                case InputActions.UnlockSlot:
                case InputActions.ToggleSlotLock:
                    stream.writeBits(action.slot, 2);
                    break;
                case InputActions.DropItem:
                    Loots.writeToStream(stream, action.item);
                    break;
                case InputActions.UseItem:
                    Loots.writeToStream(stream, action.item);
                    break;
                case InputActions.Emote:
                    Emotes.writeToStream(stream, action.emote);
                    break;
                case InputActions.MapPing:
                    MapPings.writeToStream(stream, action.ping);
                    stream.writePosition(action.position);
                    break;
            }
        });
    }

    deserialize(stream: SuroiBitStream): void {
        this.movement = {
            up: stream.readBoolean(),
            down: stream.readBoolean(),
            left: stream.readBoolean(),
            right: stream.readBoolean()
        };

        if (stream.readBoolean()) {
            this.isMobile = true;
            this.mobile = {
                moving: stream.readBoolean(),
                angle: stream.readRotation(16)
            };
        }

        this.attacking = stream.readBoolean();

        this.turning = stream.readBoolean();
        if (this.turning) {
            this.rotation = stream.readRotation(16);
            if (!this.isMobile) {
                this.distanceToMouse = stream.readFloat(0, GameConstants.player.maxMouseDist, 8);
            }
        }

        // Actions
        stream.readArray(this.actions, 3, () => {
            const type: InputActions = stream.readBits(INPUT_ACTIONS_BITS);

            let slot: number | undefined;
            let item: HealingItemDefinition | ScopeDefinition | ArmorDefinition | AmmoDefinition | BackpackDefinition | undefined;
            let emote: EmoteDefinition | undefined;
            let position: Vector | undefined;
            let ping: MapPingDefinition | undefined;

            switch (type) {
                case InputActions.EquipItem:
                case InputActions.DropWeapon:
                case InputActions.LockSlot:
                case InputActions.UnlockSlot:
                case InputActions.ToggleSlotLock:
                    slot = stream.readBits(2);
                    break;
                case InputActions.DropItem:
                    item = Loots.readFromStream<HealingItemDefinition | ScopeDefinition | ArmorDefinition | AmmoDefinition | BackpackDefinition>(stream);
                    break;
                case InputActions.UseItem:
                    item = Loots.readFromStream<HealingItemDefinition | ScopeDefinition>(stream);
                    break;
                case InputActions.Emote:
                    emote = Emotes.readFromStream(stream);
                    break;
                case InputActions.MapPing:
                    ping = MapPings.readFromStream(stream);
                    position = stream.readPosition();
                    break;
            }

            return { type, item, slot, emote, ping, position } as InputAction;
        });
    }

    /**
     * Compare two input packets to test if they need to be resent
     * @param that The previous input packet
     */
    didChange(that: InputPacket): boolean {
        if (this.actions.length) return true;

        for (const k in this.movement) {
            const key = k as keyof InputPacket["movement"];
            if (that.movement[key] !== this.movement[key]) return true;
        }

        for (const k in this.mobile) {
            const key = k as keyof InputPacket["mobile"];
            if (that.mobile[key] !== this.mobile[key]) return true;
        }

        for (const key of ["attacking", "turning", "rotation", "distanceToMouse"] as const) {
            if (that[key] !== this[key]) return true;
        }

        return false;
    }
}
