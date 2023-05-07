import { log } from "../../common/src/utils/misc";

import { Player } from "./objects/player";
import {
    Box, Settings, Vec2, World
} from "planck";
import { Config } from "./configuration";
import { type WebSocket } from "uWebSockets.js";
import { type PlayerContainer } from "./server";
import { UpdatePacket } from "./packets/sending/updatePacket";

export class Game {
    world: World;

    players: Set<Player> = new Set<Player>();
    tickTimes: number[] = [];

    constructor() {
        this.world = new World({ gravity: Vec2(0, 0) }); // Create the Planck.js World
        Settings.maxTranslation = 5.0; // Allows bullets to travel fast

        // Create world boundaries
        this.createWorldBoundary(360, -0.25, 360, 0);
        this.createWorldBoundary(-0.25, 360, 0, 360);
        this.createWorldBoundary(360, 720.25, 360, 0);
        this.createWorldBoundary(720.25, 360, 0, 360);

        // Start the tick loop
        this.tick(30);
    }

    private createWorldBoundary(x: number, y: number, width: number, height: number): void {
        const boundary = this.world.createBody({
            type: "static",
            position: Vec2(x, y)
        });
        boundary.createFixture({ shape: Box(width, height) });
    }

    tick(delay: number): void {
        setTimeout(() => {
            const tickStart = Date.now();

            this.world.step(30);

            // First loop over players: Calculate movement
            for (const p of this.players) {
                // This system allows opposite movement keys to cancel each other out.
                let xMovement = 0; let yMovement = 0;
                if (p.movingUp) yMovement++;
                if (p.movingDown) yMovement--;
                if (p.movingLeft) xMovement--;
                if (p.movingRight) xMovement++;
                const speed: number = (xMovement !== 0 && yMovement !== 0) ? Config.diagonalSpeed : Config.movementSpeed;
                p.setVelocity(xMovement * speed, yMovement * speed);
            }

            // Second loop over players: Send updates
            for (const p of this.players) {
                p.sendPacket(new UpdatePacket(p));
            }

            // Record performance and start the next tick
            const tickTime = Date.now() - tickStart;
            this.tickTimes.push(tickTime + delay);

            if (this.tickTimes.length >= 200) {
                log(`Average ms/tick: ${30 - (this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length)}`);
                this.tickTimes = [];
            }

            const newDelay: number = Math.max(0, 30 - tickTime);
            this.tick(newDelay);
        }, delay);
    }

    addPlayer(socket: WebSocket<PlayerContainer>): Player {
        const player = new Player(this, "Player", socket, Vec2(360, 360));
        this.players.add(player);
        return player;
    }

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    removePlayer(player: Player): void {
        this.players.delete(player);
        try {
            player.socket.close();
        } catch (e) {}
    }

    _nextObjectId = -1;
    get nextObjectId(): number {
        this._nextObjectId++;
        return this._nextObjectId;
    }
}
