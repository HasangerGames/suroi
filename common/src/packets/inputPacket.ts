import { GameConstants, InputActions } from "../constants";
import { type AmmoDefinition } from "../definitions/ammos";
import { type ArmorDefinition } from "../definitions/armors";
import { type BackpackDefinition } from "../definitions/backpacks";
import { type EmoteDefinition, Emotes } from "../definitions/emotes";
import { type HealingItemDefinition } from "../definitions/healingItems";
import { Loots } from "../definitions/loots";
import { type MapPingDefinition, MapPings, type PlayerPing } from "../definitions/mapPings";
import { PerkDefinition } from "../definitions/perks";
import { type ScopeDefinition } from "../definitions/scopes";
import { type ThrowableDefinition } from "../definitions/throwables";
import { type DeepMutable } from "../utils/misc";
import { calculateEnumPacketBits } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { createPacket, type InputPacket } from "./packet";

const INPUT_ACTIONS_BITS = calculateEnumPacketBits(InputActions);

/**
 * {@linkcode InputAction}s requiring no additional parameter
 */
export type SimpleInputActions = Exclude<
    InputActions,
    | InputActions.EquipItem
    | InputActions.DropWeapon
    | InputActions.DropItem
    | InputActions.UseItem
    | InputActions.Emote
    | InputActions.MapPing
    | InputActions.LockSlot
    | InputActions.UnlockSlot
    | InputActions.ToggleSlotLock
>;

export type InputAction =
    | {
        readonly type: InputActions.UseItem
        readonly item: HealingItemDefinition | ScopeDefinition | ThrowableDefinition
    }
    | {
        readonly type: InputActions.DropItem
        readonly item: HealingItemDefinition | ScopeDefinition | ThrowableDefinition | ArmorDefinition | BackpackDefinition | AmmoDefinition | PerkDefinition
    }
    | {
        readonly type: InputActions.EquipItem | InputActions.DropWeapon | InputActions.LockSlot | InputActions.UnlockSlot | InputActions.ToggleSlotLock
        readonly slot: number
    }
    | {
        readonly type: InputActions.Emote
        readonly emote: EmoteDefinition
    }
    | {
        readonly type: InputActions.MapPing
        readonly ping: PlayerPing
        readonly position: Vector
    }
    | { readonly type: SimpleInputActions };

export type PlayerInputData = {
    readonly movement: {
        readonly up: boolean
        readonly down: boolean
        readonly left: boolean
        readonly right: boolean
    }
    readonly attacking: boolean
    readonly actions: readonly InputAction[]
} & ({
    readonly isMobile: false
} | {
    readonly isMobile: true
    readonly mobile: {
        readonly moving: boolean
        readonly angle: number
    }
}) & ({
    readonly turning: false
} | (
    {
        readonly turning: true
        readonly rotation: number
    } & ({
        readonly isMobile: false
        readonly distanceToMouse: number
    } | {
        readonly isMobile: true
    })
));

export type WithMobile = PlayerInputData & { readonly isMobile: true };
export type NoMobile = PlayerInputData & { readonly isMobile: false };

export const PlayerInputPacket = createPacket("PlayerInputPacket")<PlayerInputData>({
    serialize(stream, data) {
        const { movement, isMobile, turning } = data;

        stream.writeBoolean(movement.up);
        stream.writeBoolean(movement.down);
        stream.writeBoolean(movement.left);
        stream.writeBoolean(movement.right);

        stream.writeBoolean(isMobile);
        if (isMobile) {
            stream.writeBoolean(data.mobile.moving);
            stream.writeRotation(data.mobile.angle, 16);
        }

        stream.writeBoolean(data.attacking);

        stream.writeBoolean(turning);
        if (turning) {
            stream.writeRotation(data.rotation, 16);
            if (!isMobile) {
                stream.writeFloat(data.distanceToMouse, 0, GameConstants.player.maxMouseDist, 16);
            }
        }

        stream.writeArray(data.actions, 3, action => {
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
    },
    deserialize(stream) {
        const data = {
            movement: {
                up: stream.readBoolean(),
                down: stream.readBoolean(),
                left: stream.readBoolean(),
                right: stream.readBoolean()
            }
        } as DeepMutable<PlayerInputData>;

        if (data.isMobile = stream.readBoolean()) {
            (data as DeepMutable<WithMobile>).mobile = {
                moving: stream.readBoolean(),
                angle: stream.readRotation(16)
            };
        }

        data.attacking = stream.readBoolean();

        if (data.turning = stream.readBoolean()) {
            data.rotation = stream.readRotation(16);
            if (!data.isMobile) {
                data.distanceToMouse = stream.readFloat(0, GameConstants.player.maxMouseDist, 16);
            }
        }

        // Actions
        stream.readArray(data.actions = [], 3, () => {
            const type: InputActions = stream.readBits(INPUT_ACTIONS_BITS);

            let slot: number | undefined;
            let item: HealingItemDefinition | ScopeDefinition | ArmorDefinition | AmmoDefinition | BackpackDefinition | PerkDefinition | undefined;
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
                    item = Loots.readFromStream<HealingItemDefinition | ScopeDefinition | ArmorDefinition | AmmoDefinition | BackpackDefinition | PerkDefinition>(stream);
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

        return data;
    }
});

/**
* Compare two input packets to test if the information needs to be resent
* @param newPacket The new packet to potentially sent
* @param oldPacket The old packet (usually the last sent one) to compare against
*/
export function areDifferent(newPacket: InputPacket<PlayerInputData> | PlayerInputData, oldPacket: InputPacket<PlayerInputData> | PlayerInputData): boolean {
    const newData = newPacket instanceof PlayerInputPacket ? newPacket.input : newPacket as PlayerInputData;
    const oldData = oldPacket instanceof PlayerInputPacket ? oldPacket.input : oldPacket as PlayerInputData;

    if (newData.actions.length) return true;

    for (const k in newData.movement) {
        const key = k as keyof PlayerInputData["movement"];
        if (oldData.movement[key] !== newData.movement[key]) return true;
    }

    if (newData.isMobile !== oldData.isMobile) return true;

    if (newData.isMobile) {
        for (const k in newData.mobile) {
            const key = k as keyof WithMobile["mobile"];
            if ((oldData as WithMobile).mobile[key] !== newData.mobile[key]) return true;
        }
    }

    // allow arbitrary unsafe indexing
    for (const key of ["attacking", "turning", "rotation", "distanceToMouse"] as ReadonlyArray<keyof PlayerInputData>) {
        if (oldData[key] !== newData[key]) return true;
    }

    return false;
}
