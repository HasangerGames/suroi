import { log } from "../../common/src/utils/misc";

import { Player } from "../../common/src/objects/player";

export class Game {
    tickTimes: number[] = [];
    players: Set<Player>;

    tick (delay: number): void {
        setTimeout(() => {
            const tickStart = Date.now();

            // Record performance and start the next tick
            const tickTime = Date.now() - tickStart;
            this.tickTimes.push(tickTime + delay);

            if (this.tickTimes.length >= 200) {
                log(`Average ms/tick: ${this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length}`);
                this.tickTimes = [];
            }

            const newDelay: number = Math.max(0, 30 - tickTime);
            this.tick(newDelay);
        }, delay);
    }

    addPlayer (): Player {
        const player = new Player();
        this.players.add(player);
        return player;
    }

    removePlayer (player: Player): void {}
}
