import { type WebSocket } from "uWebSockets.js";
import { OBJECT_ID_BITS, ObjectCategory, TICKS_PER_SECOND } from "../../common/src/constants";
import { type LootDefinition } from "../../common/src/definitions/loots";
import { distanceSquared } from "../../common/src/utils/math";
import { log } from "../../common/src/utils/misc";
import { ObjectType } from "../../common/src/utils/objectType";
import { random, randomPointInsideCircle } from "../../common/src/utils/random";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { v, type Vector } from "../../common/src/utils/vector";
import { Maps } from "./data/maps";
import { Gas } from "./gas";
import { type GunItem } from "./inventory/gunItem";
import { Map } from "./map";
import { Bullet, type DamageRecord, type ServerBulletOptions } from "./objects/bullet";
import { type Emote } from "./objects/emote";
import { Explosion } from "./objects/explosion";
import { Loot } from "./objects/loot";
import { Player } from "./objects/player";
import { GameOverPacket } from "./packets/sending/gameOverPacket";
import { JoinedPacket } from "./packets/sending/joinedPacket";
import { KillFeedPacket } from "./packets/sending/killFeedPacket";
import { MapPacket } from "./packets/sending/mapPacket";
import { UpdatePacket } from "./packets/sending/updatePacket";
import { endGame, type PlayerContainer } from "./server";
import { type GameObject } from "./types/gameObject";
import { JoinKillFeedMessage } from "./types/killFeedMessage";
import { Grid } from "./utils/grid";
import { IDAllocator } from "./utils/idAllocator";
import { removeFrom } from "./utils/misc";
import { Config, SpawnMode } from "./config";
import { type Obstacle } from "./objects/obstacle";
import { type Building } from "./objects/building";

export class Game {
    readonly _id: number;
    get id(): number { return this._id; }

    map: Map;

    /**
     * A cached map packet
     * Since the map is static, there's no reason to serialize a map packet for each player that joins the game
     */
    private readonly mapPacketStream: SuroiBitStream;

    gas: Gas;

    readonly grid: Grid;

    readonly partialDirtyObjects = new Set<GameObject>();
    readonly fullDirtyObjects = new Set<GameObject>();
    readonly deletedObjects = new Set<GameObject>();

    updateObjects = false;

    readonly minimapObjects = new Set<Obstacle | Building>();

    readonly livingPlayers: Set<Player> = new Set<Player>();
    readonly connectedPlayers: Set<Player> = new Set<Player>();
    readonly spectatablePlayers: Player[] = [];

    readonly loot: Set<Loot> = new Set<Loot>();
    readonly explosions: Set<Explosion> = new Set<Explosion>();
    readonly emotes: Set<Emote> = new Set<Emote>();

    /**
     * All bullets that currently exist
     */
    readonly bullets = new Set<Bullet>();
    /**
     * All bullets created this tick
     */
    readonly newBullets = new Set<Bullet>();

    /**
     * All kill feed messages this tick
     */
    readonly killFeedMessages = new Set<KillFeedPacket>();

    private _started = false;
    allowJoin = false;
    over = false;
    stopped = false;

    startTimeoutID?: NodeJS.Timeout;

    aliveCountDirty = false;

    /**
     * The value of `Date.now()`, as of the start of the tick.
     */
    _now = Date.now();
    get now(): number { return this._now; }

    tickTimes: number[] = [];

    tickDelta = 1000 / TICKS_PER_SECOND;

    constructor(id: number) {
        this._id = id;

        // Generate map
        this.grid = new Grid(Maps[Config.mapName].width, Maps[Config.mapName].height, 16);
        this.map = new Map(this, Config.mapName);

        const mapPacket = new MapPacket(this);
        this.mapPacketStream = SuroiBitStream.alloc(mapPacket.allocBytes);
        mapPacket.serialize(this.mapPacketStream);

        this.gas = new Gas(this);

        this.allowJoin = true;

        // Start the tick loop
        this.tick(TICKS_PER_SECOND);
    }

    tick(delay: number): void {
        setTimeout((): void => {
            this._now = Date.now();

            if (this.stopped) return;

            // Update loots
            for (const loot of this.loot) {
                loot.update();
            }

            // Update bullets
            let records: DamageRecord[] = [];
            for (const bullet of this.bullets) {
                records = records.concat(bullet.update());

                if (bullet.dead) this.bullets.delete(bullet);
            }

            // Do the damage after updating all bullets
            // This is to make sure bullets that hit the same object on the same tick will die so they don't de-sync with the client
            // Example: a shotgun insta killing a crate, in the client all bullets will hit the crate
            // while on the server, without this, some bullets won't because the first bullets will kill the crate
            for (const { object, damage, source, weapon, position } of records) {
                object.damage(damage, source, weapon, position);
            }

            // Handle explosions
            for (const explosion of this.explosions) {
                explosion.explode();
            }

            // Update gas
            this.gas.tick();

            // First loop over players: Movement, animations, & actions
            for (const player of this.livingPlayers) {
                player.update();
            }

            // Second loop over players: calculate visible objects & send updates
            for (const player of this.connectedPlayers) {
                if (!player.joined) continue;

                // Calculate visible objects
                player.ticksSinceLastUpdate++;
                if (player.ticksSinceLastUpdate > 8 || this.updateObjects) player.updateVisibleObjects();

                // Full objects
                if (this.fullDirtyObjects.size !== 0) {
                    for (const object of this.fullDirtyObjects) {
                        if (player.visibleObjects.has(object)) {
                            player.fullDirtyObjects.add(object);
                        }
                    }
                }

                // Partial objects
                if (this.partialDirtyObjects.size !== 0) {
                    for (const object of this.partialDirtyObjects) {
                        if (player.visibleObjects.has(object) && !player.fullDirtyObjects.has(object)) {
                            player.partialDirtyObjects.add(object);
                        }
                    }
                }

                // Deleted objects
                if (this.deletedObjects.size !== 0) {
                    for (const object of this.deletedObjects) {
                        if (player.visibleObjects.has(object) && object !== player) {
                            player.deletedObjects.add(object);
                        }
                    }
                }

                // Emotes
                if (this.emotes.size !== 0) {
                    for (const emote of this.emotes) {
                        if (player.visibleObjects.has(emote.player)) {
                            player.emotes.add(emote);
                        }
                    }
                }

                for (const message of this.killFeedMessages) player.sendPacket(message);
                if (player.spectating === undefined) {
                    const updatePacket = new UpdatePacket(player);
                    const updateStream = SuroiBitStream.alloc(updatePacket.allocBytes);
                    updatePacket.serialize(updateStream);
                    player.sendData(updateStream);
                    for (const spectator of player.spectators) {
                        spectator.sendData(updateStream);
                    }
                }
            }

            // Reset everything
            this.fullDirtyObjects.clear();
            this.partialDirtyObjects.clear();
            this.deletedObjects.clear();
            this.newBullets.clear();
            this.explosions.clear();
            this.emotes.clear();
            this.killFeedMessages.clear();
            this.aliveCountDirty = false;
            this.gas.dirty = false;
            this.gas.percentageDirty = false;
            this.updateObjects = false;

            // Winning logic
            if (this._started && this.aliveCount < 2 && !this.over) {
                // Send game over packet to the last man standing
                if (this.aliveCount === 1) {
                    const lastManStanding = [...this.livingPlayers][0];
                    lastManStanding.movement.up = false;
                    lastManStanding.movement.down = false;
                    lastManStanding.movement.left = false;
                    lastManStanding.movement.right = false;
                    lastManStanding.attacking = false;
                    lastManStanding.sendPacket(new GameOverPacket(lastManStanding, true));
                }

                // End the game in 1 second
                this.allowJoin = false;
                this.over = true;
                setTimeout(() => endGame(this._id), 1000);
            }

            // Record performance and start the next tick
            // THIS TICK COUNTER IS WORKING CORRECTLY!
            // It measures the time it takes to calculate a tick, not the time between ticks.
            const tickTime = Date.now() - this.now;
            this.tickTimes.push(tickTime);

            if (this.tickTimes.length >= 200) {
                const mspt = this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length;

                log(`Game #${this._id} | Avg ms/tick: ${mspt.toFixed(2)} | Load: ${((mspt / TICKS_PER_SECOND) * 100).toFixed(1)}%`);
                this.tickTimes = [];
            }

            this.tick(Math.max(0, TICKS_PER_SECOND - tickTime));
        }, delay);
    }

    addPlayer(socket: WebSocket<PlayerContainer>): Player {
        let spawnPosition = v(0, 0);
        switch (Config.spawn.mode) {
            case SpawnMode.Random: {
                let foundPosition = false;
                while (!foundPosition) {
                    spawnPosition = this.map.getRandomPositionFor(ObjectType.categoryOnly(ObjectCategory.Player));
                    if (!(distanceSquared(spawnPosition, this.gas.currentPosition) >= this.gas.newRadius ** 2)) foundPosition = true;
                }
                break;
            }
            case SpawnMode.Fixed: {
                spawnPosition = Config.spawn.position;
                break;
            }
            case SpawnMode.Center: {
                spawnPosition = v(Maps[Config.mapName].width / 2, Maps[Config.mapName].height / 2);
                break;
            }
            case SpawnMode.Radius: {
                spawnPosition = randomPointInsideCircle(Config.spawn.position, Config.spawn.radius);
                break;
            }
        }

        // Player is added to the players array when a JoinPacket is received from the client
        return new Player(this, socket, spawnPosition);
    }

    // Called when a JoinPacket is sent by the client
    activatePlayer(player: Player): void {
        this.livingPlayers.add(player);
        this.spectatablePlayers.push(player);
        this.connectedPlayers.add(player);
        this.grid.addObject(player);
        this.fullDirtyObjects.add(player);
        this.aliveCountDirty = true;
        this.killFeedMessages.add(new KillFeedPacket(player, new JoinKillFeedMessage(player, true)));

        player.joined = true;
        player.sendPacket(new JoinedPacket(player));
        player.sendData(this.mapPacketStream);

        setTimeout(() => { player.disableInvulnerability(); }, 5000);

        if (this.aliveCount > 1 && !this._started && this.startTimeoutID === undefined) {
            this.startTimeoutID = setTimeout(() => {
                this._started = true;
                this.gas.advanceGas();
            }, 5000);
        }

        log(`Game #${this.id} | "${player.name}" joined`);
    }

    removePlayer(player: Player): void {
        player.disconnected = true;
        this.aliveCountDirty = true;
        if (!player.dead) {
            this.killFeedMessages.add(new KillFeedPacket(player, new JoinKillFeedMessage(player, false)));
        }
        this.connectedPlayers.delete(player);
        // TODO Make it possible to spectate disconnected players
        // (currently not possible because update packets aren't sent to disconnected players)
        removeFrom(this.spectatablePlayers, player);
        if (player.canDespawn) {
            this.livingPlayers.delete(player);
            this.removeObject(player);
        } else {
            player.rotation = 0;
            player.movement.up = player.movement.down = player.movement.left = player.movement.right = false;
            player.attacking = false;
            this.partialDirtyObjects.add(player);
        }
        if (this.aliveCount > 0 && player.spectators.size > 0) {
            if (this.spectatablePlayers.length > 1) {
                const randomPlayer = this.spectatablePlayers[random(0, this.spectatablePlayers.length - 1)];
                for (const spectator of player.spectators) {
                    spectator.spectate(randomPlayer);
                }
            }
            player.spectators = new Set<Player>();
        }
        if (player.spectating !== undefined) {
            player.spectating.spectators.delete(player);
        }
        if (this.aliveCount < 2) {
            clearTimeout(this.startTimeoutID);
            this.startTimeoutID = undefined;
        }
        try {
            player.socket.close();
        } catch (e) { }
    }

    addLoot(type: ObjectType<ObjectCategory.Loot, LootDefinition>, position: Vector, count?: number): Loot {
        const loot = new Loot(this, type, position, count);
        this.loot.add(loot);
        this.grid.addObject(loot);
        return loot;
    }

    removeLoot(loot: Loot): void {
        loot.dead = true;
        this.loot.delete(loot);
        this.removeObject(loot);
    }

    addBullet(source: GunItem | Explosion, shooter: GameObject, options: ServerBulletOptions): Bullet {
        const bullet = new Bullet(
            this,
            source,
            shooter,
            options
        );
        this.bullets.add(bullet);
        this.newBullets.add(bullet);

        return bullet;
    }

    addExplosion(type: string, position: Vector, source: GameObject): Explosion {
        const explosion = new Explosion(this, ObjectType.fromString(ObjectCategory.Explosion, type), position, source);
        this.explosions.add(explosion);
        return explosion;
    }

    /**
     * Delete an object and give the id back to the allocator
     * @param object The object to delete
     */
    removeObject(object: GameObject): void {
        this.grid.removeObject(object);
        this.idAllocator.give(object.id);
        this.updateObjects = true;
    }

    get aliveCount(): number {
        return this.livingPlayers.size;
    }

    idAllocator = new IDAllocator(OBJECT_ID_BITS);

    get nextObjectID(): number {
        return this.idAllocator.takeNext();
    }
}
