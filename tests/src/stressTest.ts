import { WebSocket, type MessageEvent } from "ws";
import { InputActions, PacketType } from "../../common/src/constants";
import { Emotes, type EmoteDefinition } from "../../common/src/definitions/emotes";
import { Loots } from "../../common/src/definitions/loots";
import { Skins } from "../../common/src/definitions/skins";
import { InputPacket, type InputAction } from "../../common/src/packets/inputPacket";
import { JoinPacket } from "../../common/src/packets/joinPacket";
import { pickRandomInArray, random, randomBoolean } from "../../common/src/utils/random";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { type Packet, PacketStream } from "../../common/src/packets/packetStream";

const config = {
    address: "127.0.0.1:8000",
    https: false,
    botCount: 79,
    joinDelay: 100
};

const skins: string[] = [];

for (const skin of Skins) {
    if (!skin.hideFromLoadout && !skin.roleRequired) skins.push(skin.idString);
}

const bots = new Set<Bot>();

let allBotsJoined = false;

let gameData: { success: boolean, address: string, gameID: number };

class Bot {
    moving = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    shootStart = false;

    interact = false;

    emotes: EmoteDefinition[];

    emote = false;

    angle = random(-Math.PI, Math.PI);
    angularSpeed = random(0, 0.1);

    distanceToMouse = 50;

    connected = false;

    disconnect = false;

    id: number;

    ws: WebSocket;

    lastInputPacket?: InputPacket;

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

        const emote = (): EmoteDefinition => pickRandomInArray(Emotes.definitions);

        this.emotes = [emote(), emote(), emote(), emote(), emote(), emote()];

        this.ws.onmessage = (message: MessageEvent): void => {
            const stream = new PacketStream(new SuroiBitStream(message.data as ArrayBuffer));
            while (true) {
                const packet = stream.readPacket();
                if (packet === undefined) break;
                this.onPacket(packet);
            }
        };
    }

    onPacket(packet: Packet): void {
        switch (packet.type) {
            case PacketType.GameOver: {
                console.log(`Bot ${this.id} ${packet.won ? "won" : "died"} | kills: ${packet.kills} | rank: ${packet.rank}`);
                this.disconnect = true;
                this.connected = false;
                this.ws.close();
                break;
            }
        }
    }

    join(): void {
        this.connected = true;

        const joinPacket = new JoinPacket();

        joinPacket.name = `BOT_${this.id}`;
        joinPacket.isMobile = false;

        joinPacket.skin = Loots.reify(pickRandomInArray(skins));
        joinPacket.emotes = this.emotes;

        const stream = new PacketStream(SuroiBitStream.alloc(joinPacket.allocBytes));
        stream.serializePacket(joinPacket);

        this.ws.send(stream.getBuffer());
    }

    sendInputs(): void {
        if (!this.connected) return;

        const inputPacket = new InputPacket();

        inputPacket.movement = {
            ...this.moving
        };
        inputPacket.attacking = this.shootStart;
        inputPacket.turning = true;
        inputPacket.rotation = this.angle;
        inputPacket.distanceToMouse = this.distanceToMouse;

        this.angle += this.angularSpeed;
        if (this.angle > Math.PI) this.angle = -Math.PI;

        let action: InputAction | undefined;
        if (this.emote) {
            this.emote = false;

            action = {
                type: InputActions.Emote,
                emote: pickRandomInArray(this.emotes)
            };
        } else if (this.interact) {
            action = { type: InputActions.Interact };
        }

        if (action) inputPacket.actions = [action];

        if (!this.lastInputPacket || inputPacket.didChange(this.lastInputPacket)) {
            const stream = new PacketStream(SuroiBitStream.alloc(inputPacket.allocBytes));
            stream.serializePacket(inputPacket);
            this.ws.send(stream.getBuffer());
            this.lastInputPacket = inputPacket;
        }
    }

    updateInputs(): void {
        this.moving = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.shootStart = randomBoolean();
        this.interact = randomBoolean();
        this.emote = randomBoolean();

        switch (random(1, 8)) {
            case 1:
                this.moving.up = true;
                break;
            case 2:
                this.moving.down = true;
                break;
            case 3:
                this.moving.left = true;
                break;
            case 4:
                this.moving.right = true;
                break;
            case 5:
                this.moving.up = true;
                this.moving.left = true;
                break;
            case 6:
                this.moving.up = true;
                this.moving.right = true;
                break;
            case 7:
                this.moving.down = true;
                this.moving.left = true;
                break;
            case 8:
                this.moving.down = true;
                this.moving.right = true;
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
