/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { log } from "../../common/src/utils/misc";

import { Player } from "../../common/src/objects/player";

export class Game {
    tickTimes: number[] = [];

    players: Set<Player> = new Set<Player>();

    tick(delay: number): void {
        setTimeout(() => {
            const tickStart = Date.now();

            // Record performance and start the next tick
            const tickTime = Date.now() - tickStart;
            this.tickTimes.push(tickTime + delay);

            if (this.tickTimes.length >= 200) {
                log(`Average ms/tick: ${this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length}`);
                this.tickTimes = [];
            }

            const newDelay: number = Math.max(0, 50 - tickTime);
            this.tick(newDelay);
        }, delay);
    }

    addPlayer(): Player {
        const player = new Player();
        this.players.add(player);

        return player;
    }

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    removePlayer(player: Player): void {}
}
