import { WebSocket, type MessageEvent } from "ws";
import { INPUT_ACTIONS_BITS, InputActions, PacketType } from "../../common/src/constants";
import { Emotes } from "../../common/src/definitions/emotes";
import { Skins } from "../../common/src/definitions/skins";
import { pickRandomInArray, random, randomBoolean } from "../../common/src/utils/random";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";

const config = {
    address: "127.0.0.1:8000",
    https: false,
    botCount: 79,
    joinDelay: 100
};

const skins: string[] = [];

for (const skin of Skins) {
    if (!skin.notInLoadout && !skin.roleRequired) skins.push(skin.idString);
}

const bots = new Set<Bot>();

let allBotsJoined = false;

let gameData: { success: boolean, address: string, gameID: number };

class Bot {
    movingUp = false;
    movingDown = false;
    movingLeft = false;
    movingRight = false;
    shootStart = false;
    interact = false;
    emote = false;
    angle = random(-Math.PI, Math.PI);
    angularSpeed = random(0, 0.1);

    connected = false;

    disconnect = false;

    id: number;

    ws: WebSocket;

    constructor(id: number) {
        this.id = id;
        this.ws = new WebSocket(`ws${config.https ? "s" : ""}://${config.address}/play?gameID=${gameData.gameID}`);

        this.ws.addEventListener("error", console.error);

        this.ws.addEventListener("open", this.join.bind(this));

        this.ws.addEventListener("close", () => {
            this.disconnect = true;
            this.connected = false;
        });

        this.ws.binaryType = "arraybuffer";

        this.ws.onmessage = (message: MessageEvent): void => {
            const stream = new SuroiBitStream(message.data as ArrayBuffer);
            switch (stream.readPacketType()) {
                case PacketType.GameOver: {
                    const won = stream.readBoolean();
                    console.log(`Bot ${id} ${won ? "won" : "died"}`);
                    this.disconnect = true;
                    this.connected = false;
                    this.ws.close();
                }
            }
        };
    }

    join(): void {
        this.connected = true;
        const stream = SuroiBitStream.alloc(24);
        stream.writePacketType(PacketType.Join);
        stream.writePlayerName(`BOT_${this.id}`);
        stream.writeBoolean(false); // is mobile
        // loadout
        const skin = skins[random(0, skins.length)];
        const emote = (): number => Emotes.idStringToNumber[pickRandomInArray(Emotes.definitions).idString];
        stream.writeUint8(Skins.findIndex(s => s.idString === skin));
        stream.writeUint8(emote());
        stream.writeUint8(emote());
        stream.writeUint8(emote());
        stream.writeUint8(emote());
        this.ws.send(stream.buffer.slice(0, Math.ceil(stream.index / 8)));
    }

    sendInputs(): void {
        if (!this.connected) return;

        const stream = SuroiBitStream.alloc(128);
        stream.writePacketType(PacketType.Input);
        stream.writeBoolean(this.movingUp);
        stream.writeBoolean(this.movingDown);
        stream.writeBoolean(this.movingLeft);
        stream.writeBoolean(this.movingRight);

        stream.writeBoolean(this.shootStart);
        stream.writeBoolean(true); // rotating
        stream.writeRotation(this.angle, 16);
        this.angle += this.angularSpeed;
        if (this.angle > Math.PI) this.angle = -Math.PI;

        let action: InputActions | undefined;
        if (this.emote) {
            this.emote = false;
            switch (random(0, 3)) {
                case 0:
                    action = InputActions.TopEmoteSlot;
                    break;
                case 1:
                    action = InputActions.RightEmoteSlot;
                    break;
                case 2:
                    action = InputActions.BottomEmoteSlot;
                    break;
                case 3:
                    action = InputActions.LeftEmoteSlot;
                    break;
            }
        } else if (this.interact) {
            action = InputActions.Interact;
        }
        stream.writeBits(action ?? InputActions.None, INPUT_ACTIONS_BITS);
        this.ws.send(stream.buffer.slice(0, Math.ceil(stream.index / 8)));
    }

    updateInputs(): void {
        this.movingUp = false;
        this.movingDown = false;
        this.movingLeft = false;
        this.movingRight = false;

        this.shootStart = randomBoolean();
        this.interact = randomBoolean();
        this.emote = randomBoolean();

        switch (random(1, 8)) {
            case 1:
                this.movingUp = true;
                break;
            case 2:
                this.movingDown = true;
                break;
            case 3:
                this.movingLeft = true;
                break;
            case 4:
                this.movingRight = true;
                break;
            case 5:
                this.movingUp = true;
                this.movingLeft = true;
                break;
            case 6:
                this.movingUp = true;
                this.movingRight = true;
                break;
            case 7:
                this.movingDown = true;
                this.movingLeft = true;
                break;
            case 8:
                this.movingDown = true;
                this.movingRight = true;
                break;
        }
    }
}

void (async() => {
    gameData = await (await fetch(`http${config.https ? "s" : ""}://${config.address}/api/getGame`)).json();

    if (!gameData.success) {
        console.error("Failed to fetch game");
        process.exit();
    }

    for (let i = 1; i <= config.botCount; i++) {
        setTimeout(() => {
            bots.add(new Bot(i));
            if (i === config.botCount) allBotsJoined = true;
        }, i * config.joinDelay);
    }
})();

setInterval(() => {
    for (const bot of bots) {
        if (Math.random() < 0.02) bot.updateInputs();

        bot.sendInputs();

        if (bot.disconnect) {
            bots.delete(bot);
        }
    }

    if (bots.size === 0 && allBotsJoined) {
        console.log("All bots died or disconnected, exiting.");
        process.exit();
    }
}, 30);
