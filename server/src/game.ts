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

import { Player } from "./objects/player";
import {
    Box,
    Settings,
    Vec2,
    World
} from "planck";
import { Config } from "./configuration";
import { type WebSocket } from "uWebSockets.js";
import { type PlayerContainer } from "./server";
import { UpdatePacket } from "./packets/sending/updatePacket";
import { type GameObject } from "./types/gameObject";
import { Map } from "./map";

export class Game {
    map: Map;

    world: World;

    staticObjects = new Set<GameObject>(); // A Set of all the static objects in the world
    dynamicObjects = new Set<GameObject>(); // A Set of all the dynamic (moving) objects in the world
    visibleObjects = {};
    updateObjects = false;

    partialDirtyObjects = new Set<GameObject>();
    fullDirtyObjects = new Set<GameObject>();
    deletedObjects = new Set<GameObject>();

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

        // Generate map
        this.map = new Map(this);

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

            // Second loop over players: calculate visible objects & send updates
            for (const p of this.players) {
                // Calculate visible objects
                if (p.movesSinceLastUpdate > 8 || this.updateObjects) {
                    p.updateVisibleObjects();
                }

                // Full objects
                if (this.fullDirtyObjects.size !== 0) {
                    for (const object of this.fullDirtyObjects) {
                        if (p.visibleObjects.has(object) && !p.fullDirtyObjects.has(object)) {
                            p.fullDirtyObjects.add(object);
                        }
                    }
                }

                // Partial objects
                if (this.partialDirtyObjects.size !== 0) { // && !p.fullUpdate) {
                    for (const object of this.partialDirtyObjects) {
                        if (p.visibleObjects.has(object) && !p.fullDirtyObjects.has(object)) {
                            p.partialDirtyObjects.add(object);
                        }
                    }
                }

                // Deleted objects
                if (this.deletedObjects.size !== 0) {
                    for (const object of this.deletedObjects) {
                        /* if(p.visibleObjects.includes(object) && object !== p) {
                            p.deletedObjects.add(object);
                        } */
                        if (object !== p) p.deletedObjects.add(object);
                    }
                }

                p.sendPacket(new UpdatePacket(p));
            }

            // Reset everything
            if (this.fullDirtyObjects.size !== 0) this.fullDirtyObjects = new Set<GameObject>();
            if (this.partialDirtyObjects.size !== 0) this.partialDirtyObjects = new Set<GameObject>();
            if (this.deletedObjects.size !== 0) this.deletedObjects = new Set<GameObject>();

            // Record performance and start the next tick
            // THIS TICK COUNTER IS WORKING CORRECTLY!
            // It measures the time it takes to calculate a tick, not the time between ticks.
            const tickTime = Date.now() - tickStart;
            this.tickTimes.push(tickTime);

            if (this.tickTimes.length >= 200) {
                const mspt: number = this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length;
                log(`Average ms/tick: ${mspt}`);
                log(`Server load: ${((mspt / 30) * 100).toFixed(1)}%`);
                log("===========================");
                this.tickTimes = [];
            }

            const newDelay: number = Math.max(0, 30 - tickTime);
            this.tick(newDelay);
        }, delay);
    }

    addPlayer(socket: WebSocket<PlayerContainer>): Player {
        const player = new Player(this, "Player", socket, Vec2(360, 360));
        this.players.add(player);
        this.updateObjects = true;
        player.updateVisibleObjects();
        return player;
    }

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
