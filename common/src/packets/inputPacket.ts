import { GameConstants, InputActions } from "../constants";
import { type AmmoDefinition } from "../definitions/ammos";
import { type ArmorDefinition } from "../definitions/armors";
import { type BackpackDefinition } from "../definitions/backpacks";
import { type EmoteDefinition } from "../definitions/emotes";
import { type HealingItemDefinition } from "../definitions/healingItems";
import { Loots, type WeaponDefinition } from "../definitions/loots";
import { type MapPingDefinition, MapPings, type PlayerPing } from "../definitions/mapPings";
import { type PerkDefinition } from "../definitions/perks";
import { type ScopeDefinition } from "../definitions/scopes";
import { type ThrowableDefinition } from "../definitions/throwables";
import { GlobalRegistrar } from "../utils/definitionRegistry";
import { type DeepMutable, type SDeepMutable } from "../utils/misc";
import { type Vector } from "../utils/vector";
import { createPacket, type InputPacket } from "./packet";

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

export type AllowedEmoteSources = EmoteDefinition | AmmoDefinition | HealingItemDefinition | WeaponDefinition;

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
        readonly emote: AllowedEmoteSources
    }
    | {
        readonly type: InputActions.MapPing
        readonly ping: PlayerPing
        readonly position: Vector
    }
    | { readonly type: SimpleInputActions };

type MobileMixin = {
    readonly isMobile: false
    readonly mobile?: undefined
} | {
    readonly isMobile: true
    readonly mobile: {
        readonly moving: boolean
        readonly angle: number
    }
};

type TurningMixin = {
    readonly turning: false
    readonly rotation?: undefined
} | ({
    readonly turning: true
    readonly rotation: number
} & ({
    readonly isMobile: false
    readonly distanceToMouse: number
} | {
    readonly isMobile: true
    readonly distanceToMouse?: undefined
}));

export type PlayerInputData = {
    readonly movement: {
        readonly up: boolean
        readonly down: boolean
        readonly left: boolean
        readonly right: boolean
    }
    readonly attacking: boolean
    readonly actions: readonly InputAction[]
} & MobileMixin & TurningMixin;

export type WithMobile = PlayerInputData & { readonly isMobile: true };
export type NoMobile = PlayerInputData & { readonly isMobile: false };

export const PlayerInputPacket = createPacket("PlayerInputPacket")<PlayerInputData>({
    serialize(stream, data) {
        const { movement, isMobile, turning } = data;

        stream.writeBooleanGroup(
            movement.up,
            movement.down,
            movement.left,
            movement.right,
            isMobile,
            data.mobile?.moving,
            turning,
            data.attacking
        );

        if (isMobile) {
            stream.writeRotation2(data.mobile.angle);
        }

        if (turning) {
            stream.writeRotation2(data.rotation);
            if (!isMobile) {
                stream.writeFloat(data.distanceToMouse, 0, GameConstants.player.maxMouseDist, 2);
            }
        }

        stream.writeArray(data.actions, action => {
            if ("slot" in action) {
                // slot is 2 bits, InputActions is 4
                // move the slot info to the MSB and leave
                // the enum member as the LSB for compatibility
                // with the other branch
                stream.writeUint8(action.type + (action.slot << 6));
            } else {
                stream.writeUint8(action.type);
            }

            switch (action.type) {
                case InputActions.EquipItem:
                case InputActions.DropWeapon:
                case InputActions.LockSlot:
                case InputActions.UnlockSlot:
                case InputActions.ToggleSlotLock:
                    // already handled above
                    break;
                case InputActions.DropItem:
                    Loots.writeToStream(stream, action.item);
                    break;
                case InputActions.UseItem:
                    Loots.writeToStream(stream, action.item);
                    break;
                case InputActions.Emote:
                    GlobalRegistrar.writeToStream(stream, action.emote);
                    break;
                case InputActions.MapPing:
                    MapPings.writeToStream(stream, action.ping);
                    stream.writePosition(action.position);
                    break;
            }
        }, 1);
    },
    deserialize(stream) {
        const [
            up,
            down,
            left,
            right,
            isMobile,
            moving,
            turning,
            attacking
        ] = stream.readBooleanGroup();

        const data = {
            movement: {
                up,
                down,
                left,
                right
            },
            isMobile,
            attacking,
            turning
        } as SDeepMutable<PlayerInputData>;

        if (isMobile) {
            (data as DeepMutable<WithMobile>).mobile = {
                moving,
                angle: stream.readRotation2()
            };
        }

        if (turning) {
            data.rotation = stream.readRotation2();
            if (!isMobile) {
                (
                    data as DeepMutable<NoMobile & { turning: true }>
                ).distanceToMouse = stream.readFloat(0, GameConstants.player.maxMouseDist, 2);
            }
        }

        // Actions
        data.actions = stream.readArray(() => {
            const data = stream.readUint8();
            // hiMask = 2 msb, type = 4 lsb
            const [hiMask, type] = [data & 0b1100_0000, (data & 15) as InputActions];

            let slot: number | undefined;
            let item: HealingItemDefinition | ScopeDefinition | ArmorDefinition | AmmoDefinition | BackpackDefinition | PerkDefinition | undefined;
            let emote: AllowedEmoteSources | undefined;
            let position: Vector | undefined;
            let ping: MapPingDefinition | undefined;

            switch (type) {
                case InputActions.EquipItem:
                case InputActions.DropWeapon:
                case InputActions.LockSlot:
                case InputActions.UnlockSlot:
                case InputActions.ToggleSlotLock:
                    slot = hiMask >> 6;
                    break;
                case InputActions.DropItem:
                    item = Loots.readFromStream<
                        HealingItemDefinition |
                        ScopeDefinition |
                        ArmorDefinition |
                        AmmoDefinition |
                        BackpackDefinition |
                        PerkDefinition
                    >(stream);
                    break;
                case InputActions.UseItem:
                    item = Loots.readFromStream<HealingItemDefinition | ScopeDefinition>(stream);
                    break;
                case InputActions.Emote:
                    emote = GlobalRegistrar.readFromStream<AllowedEmoteSources>(stream);
                    break;
                case InputActions.MapPing:
                    ping = MapPings.readFromStream(stream);
                    position = stream.readPosition();
                    break;
            }

            return { type, item, slot, emote, ping, position } as InputAction;
        }, 1);

        return data;
    }
});

/**
* Compare two input packets to test if the information needs to be resent
* @param newPacket The new packet to potentially sent
* @param oldPacket The old packet (usually the last sent one) to compare against
*/
export function areDifferent(
    newPacket: InputPacket<PlayerInputData> | PlayerInputData,
    oldPacket: InputPacket<PlayerInputData> | PlayerInputData
): boolean {
    const newData = newPacket instanceof PlayerInputPacket ? newPacket.input : newPacket as PlayerInputData;
    const oldData = oldPacket instanceof PlayerInputPacket ? oldPacket.input : oldPacket as PlayerInputData;

    if (newData.actions.length > 0) return true;

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
