import { WebSocket, type MessageEvent } from "ws";
import { GameConstants, InputActions, ObjectCategory } from "../../common/src/constants";
import { Emotes, type EmoteDefinition } from "../../common/src/definitions/emotes";
import { Loots } from "../../common/src/definitions/loots";
import { Skins, type SkinDefinition } from "../../common/src/definitions/skins";
import { GameOverPacket } from "../../common/src/packets/gameOverPacket";
import { areDifferent, PlayerInputPacket, type InputAction, type PlayerInputData } from "../../common/src/packets/inputPacket";
import { JoinPacket } from "../../common/src/packets/joinPacket";
import { type InputPacket, type OutputPacket } from "../../common/src/packets/packet";
import { PacketStream } from "../../common/src/packets/packetStream";
import { UpdatePacket } from "../../common/src/packets/updatePacket";
import { type GetGameResponse } from "../../common/src/typings";
import { Geometry, π, τ } from "../../common/src/utils/math";
import { ItemType, type ReferenceTo } from "../../common/src/utils/objectDefinitions";
import { type FullData } from "../../common/src/utils/objectsSerializations";
import { pickRandomInArray, random, randomBoolean, randomFloat, randomSign } from "../../common/src/utils/random";
import { Vec, type Vector } from "../../common/src/utils/vector";

console.log("start");

const config = {
    mainAddress: "http://127.0.0.1:8000",
    gameAddress: "ws://127.0.0.1:800<ID>",
    botCount: 79,
    joinDelay: 100,
    rejoinOnDeath: false
};

const skins: ReadonlyArray<ReferenceTo<SkinDefinition>> = Skins.definitions
    .filter(({ hideFromLoadout, rolesRequired }) => !hideFromLoadout && !rolesRequired)
    .map(({ idString }) => idString);

const emotes: EmoteDefinition[] = Emotes.definitions
    .filter(({ isTeamEmote, isWeaponEmote }) => !isTeamEmote && !isWeaponEmote);

const bots: Bot[] = [];
const objects = new Map<number, Bot | undefined>();

let allBotsJoined = false;

class Bot {
    private _moving = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    private _serverId?: number;

    readonly gameID: number;

    position = Vec.create(0, 0);

    private _shootStart = false;

    private _interact = false;

    private _swap = false;

    private _slot = -1;

    private readonly _emotes: readonly EmoteDefinition[];

    private _emote = false;

    private _angle = random(-Math.PI, Math.PI);

    private ["admin he doing it sideways"] = false;

    private readonly _angularSpeed = random(0.02, 0.1) * randomSign();

    private readonly _distanceToMouse = random(30, 80);

    private _connected = false;
    get connected(): boolean { return this._connected; }

    private _disconnected = false;
    get disconnected(): boolean { return this._disconnected; }

    private readonly _ws: WebSocket;

    private _lastInputPacket?: InputPacket<PlayerInputData>;

    constructor(readonly id: number, gameID: number) {
        this.gameID = gameID;
        this._ws = new WebSocket(`${config.gameAddress.replace("<ID>", (gameID + 1).toString())}/play`);

        this._ws.addEventListener("error", console.error);

        this._ws.addEventListener("open", this.join.bind(this));

        this._ws.addEventListener("close", () => {
            this._disconnected = true;
            this._connected = false;
        });

        this._ws.binaryType = "arraybuffer";

        this._emotes = Array.from({ length: 6 }, () => pickRandomInArray(emotes));

        this._ws.onmessage = (message: MessageEvent): void => {
            const stream = new PacketStream(message.data as ArrayBuffer);
            while (true) {
                try {
                    const packet = stream.deserializeServerPacket();
                    if (packet === undefined) break;
                    this.onPacket(packet);
                } catch (e) { console.error(e); continue; }
            }
        };
    }

    onPacket(packet: OutputPacket): void {
        const updatePosition = (data: FullData<ObjectCategory>, object: Bot, id: number): void => {
            const { position } = data as FullData<ObjectCategory.Player>;

            if (position === undefined) return;

            object.position.x = position.x;
            object.position.y = position.y;

            if (id === this._serverId) {
                this.position.x = position.x;
                this.position.y = position.y;
            }
        };

        switch (true) {
            case packet instanceof GameOverPacket: {
                const { output } = packet;
                console.log(`Bot ${this.id} ${output.won ? "won" : "died"} | kills: ${output.kills} | rank: ${output.rank}`);
                this._disconnected = true;
                this._connected = false;
                this._ws.close();
                break;
            }
            case packet instanceof UpdatePacket: {
                const { output } = packet;

                this._serverId ??= output.playerData?.id?.id;
                this._slot = output.playerData?.inventory?.activeWeaponIndex ?? this._slot;

                for (const { id } of output.newPlayers ?? []) {
                    objects.set(id, bots.find(({ _serverId }) => _serverId === id));
                }

                for (const { id, type, data } of output.fullDirtyObjects ?? []) {
                    if (type !== ObjectCategory.Player) continue;

                    const object: Bot | undefined = objects.get(id);

                    if (object === undefined) {
                        objects.set(id, bots.find(({ _serverId }) => _serverId === id));
                    } else {
                        updatePosition(data, object, id);
                    }
                }

                for (const { id, data } of output.partialDirtyObjects ?? []) {
                    const object = objects.get(id);
                    if (object === undefined) continue;

                    updatePosition(data, object, id);
                }

                for (const id of output.deletedObjects ?? []) {
                    objects.delete(id);
                }

                for (const id of output.deletedPlayers ?? []) {
                    objects.delete(id);
                }

                break;
            }
        }
    }

    private readonly _stream = new PacketStream(new ArrayBuffer(1024));

    join(): void {
        this._connected = true;

        const name = `BOT_${this.id}`;
        console.log(`${name} connected to game ${this.gameID}`);

        this.sendPacket(
            JoinPacket.create({
                name,
                isMobile: false,
                skin: Loots.reify(pickRandomInArray(skins)),
                emotes: this._emotes
            })
        );
    }

    sendPacket(packet: InputPacket): void {
        this._stream.stream.index = 0;
        this._stream.serializeClientPacket(packet);

        this._ws.send(this._stream.getBuffer());
    }

    private _dontCommitGrenadeSuicideTimer?: NodeJS.Timeout;
    private _grenadeSuicidePrevention = false;

    sendInputs(): void {
        if (!this._connected) return;

        let target: Vector | undefined;
        let aimhax = false;
        if (
            this["admin he doing it sideways"]
            && (
                target = [...objects.entries()]
                    .filter((([id, bot]) => id !== this._serverId && bot !== undefined && !bot._disconnected && bot._connected) as (entry: [number, Bot | undefined]) => entry is [number, Bot])
                    .sort(
                        ([, a], [, b]) => Geometry.distanceSquared(this.position, a.position) - Geometry.distanceSquared(this.position, b.position)
                    )[0]?.[1].position
            )
        ) {
            const diff = Vec.sub(target, this.position);
            aimhax = !Number.isNaN(this._angle = Math.atan2(diff.y, diff.x));
        } else {
            this._angle += this._angularSpeed;
        }

        if (this._angle > π) this._angle -= τ;

        const actions: InputAction[] = [];
        if (this._emote) {
            this._emote = false;

            actions.push({
                type: InputActions.Emote,
                emote: pickRandomInArray(this._emotes)
            });
        }

        if (this._interact) {
            actions.push({ type: InputActions.Interact });
        }

        if (this._swap) {
            this._swap = false;
            const slot = aimhax ? random(0, 1) : random(0, GameConstants.player.maxWeapons - 1);
            actions.push({ type: InputActions.EquipItem, slot });

            if (GameConstants.player.inventorySlotTypings[slot] === ItemType.Throwable && this._shootStart) {
                this._dontCommitGrenadeSuicideTimer ??= setTimeout(() => {
                    this._grenadeSuicidePrevention = true;
                    this._dontCommitGrenadeSuicideTimer = undefined;
                }, randomFloat(0, 4000));
            }
        } else if (aimhax && this._slot >= 2) {
            actions.push({ type: InputActions.EquipItem, slot: random(0, 1) });
        }

        const inputPacket = PlayerInputPacket.create({
            movement: { ...this._moving },
            attacking: (this._shootStart || aimhax) && !this._grenadeSuicidePrevention,
            isMobile: false,
            turning: true,
            rotation: this._angle,
            distanceToMouse: this._distanceToMouse,
            actions: actions
        });

        if (!this._lastInputPacket || areDifferent(inputPacket, this._lastInputPacket)) {
            this.sendPacket(inputPacket);
            this._lastInputPacket = inputPacket;
        }

        if (this._grenadeSuicidePrevention) this._grenadeSuicidePrevention = false;
    }

    updateInputs(): void {
        this._moving = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this._shootStart = randomBoolean();
        this._interact = randomBoolean();
        this._swap = randomBoolean();
        this._emote = randomBoolean();
        this["admin he doing it sideways"] = randomBoolean();

        switch (random(1, 8)) {
            case 1:
                this._moving.up = true;
                break;
            case 2:
                this._moving.down = true;
                break;
            case 3:
                this._moving.left = true;
                break;
            case 4:
                this._moving.right = true;
                break;
            case 5:
                this._moving.up = true;
                this._moving.left = true;
                break;
            case 6:
                this._moving.up = true;
                this._moving.right = true;
                break;
            case 7:
                this._moving.down = true;
                this._moving.left = true;
                break;
            case 8:
                this._moving.down = true;
                this._moving.right = true;
                break;
        }
    }
}

const createBot = async(id: number): Promise<Bot> => {
    const gameData = await (await fetch(`${config.mainAddress}/api/getGame`)).json() as GetGameResponse;

    if (!gameData.success) {
        throw new Error("Error finding game.");
    }

    return new Bot(id, gameData.gameID);
};

void (async() => {
    const { botCount, joinDelay } = config;
    console.log("scheduling joins");

    for (let i = 1; i <= botCount; i++) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async() => {
            bots.push(await createBot(i));
            if (i === botCount) allBotsJoined = true;
            if (i === 1) console.log("here we go");
        }, i * joinDelay);
    }
})();

console.log("setting up loop");
// eslint-disable-next-line @typescript-eslint/no-misused-promises
setInterval(async() => {
    for (const bot of bots) {
        if (Math.random() < 0.02) bot.updateInputs();

        bot.sendInputs();

        if (bot.disconnected) {
            const index = bots.indexOf(bot);
            if (index === -1) continue;

            if (config.rejoinOnDeath) {
                bots[index] = await createBot(index + 1);
            } else {
                bots.splice(index, 1);
            }
        }
    }

    if (bots.length === 0 && allBotsJoined) {
        console.log("All bots died or disconnected, exiting.");
        process.exit();
    }
}, 30);
