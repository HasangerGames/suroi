import { GameConstants, Layer, MapObjectSpawnMode, ObjectCategory, TeamSize } from "@common/constants";
import { type ExplosionDefinition } from "@common/definitions/explosions";
import { Loots, type LootDefinition } from "@common/definitions/loots";
import { MapPings, type MapPing } from "@common/definitions/mapPings";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { SyncedParticles, type SyncedParticleDefinition } from "@common/definitions/syncedParticles";
import { type JoinData } from "@common/packets/joinPacket";
import { JoinedPacket } from "@common/packets/joinedPacket";
import { PacketDataIn, PacketType } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { type PingSerialization } from "@common/packets/updatePacket";
import { CircleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Angle, Geometry, Numeric, Statistics } from "@common/utils/math";
import { Timeout } from "@common/utils/misc";
import { ItemType, type ReferenceTo, type ReifiableDef } from "@common/utils/objectDefinitions";
import { pickRandomInArray, randomPointInsideCircle, randomRotation } from "@common/utils/random";
import { SuroiByteStream } from "@common/utils/suroiByteStream";
import { Vec, type Vector } from "@common/utils/vector";

import { Bullets, type BulletDefinition } from "@common/definitions/bullets";
import type { SingleGunNarrowing } from "@common/definitions/items/guns";
import { PerkData, PerkIds, Perks } from "@common/definitions/items/perks";
import { ModeName, ModeDefinition, Modes } from "@common/definitions/modes";
import { ColorStyles, Logger, styleText } from "@common/utils/logging";
import type { WebSocket } from "uWebSockets.js";
import { Config, MapWithParams } from "./config";
import { GAME_SPAWN_WINDOW } from "./data/gasStages";
import { MapName, Maps, SpawnMode } from "./data/maps";
import { type GameData } from "./gameManager";
import { Gas } from "./gas";
import { GunItem } from "./inventory/gunItem";
import type { MeleeItem } from "./inventory/meleeItem";
import { ThrowableItem } from "./inventory/throwableItem";
import { GameMap } from "./map";
import { Bullet, type DamageRecord, type ServerBulletOptions } from "./objects/bullet";
import { type Emote } from "./objects/emote";
import { Explosion } from "./objects/explosion";
import { type BaseGameObject, type GameObject } from "./objects/gameObject";
import { Loot, type ItemData } from "./objects/loot";
import { Parachute } from "./objects/parachute";
import { Player, type PlayerSocketData } from "./objects/player";
import { Projectile, ProjectileParams } from "./objects/projectile";
import { SyncedParticle } from "./objects/syncedParticle";
import { PluginManager } from "./pluginManager";
import { Team } from "./team";
import { Grid } from "./utils/grid";
import { IDAllocator } from "./utils/idAllocator";
import { Cache, getAllLoots, getSpawnableLoots, ItemRegistry } from "./utils/lootHelpers";
import { cleanUsername, modeFromMap } from "./utils/misc";
import { removeFrom } from "@common/utils/misc";

export class Game implements GameData {
    public readonly id: number;

    readonly map: GameMap;
    readonly gas: Gas;
    readonly grid: Grid;
    readonly pluginManager = new PluginManager(this);

    readonly modeName: ModeName;
    readonly mode: ModeDefinition;

    readonly partialDirtyObjects = new Set<BaseGameObject>();
    readonly fullDirtyObjects = new Set<BaseGameObject>();

    updateObjects = false;

    readonly livingPlayers = new Set<Player>();
    readonly connectedPlayers = new Set<Player>();
    readonly spectatablePlayers: Player[] = [];
    /**
     * New players created this tick
     */
    readonly newPlayers: Player[] = [];
    /**
    * Players deleted this tick
    */
    readonly deletedPlayers: number[] = [];

    /**
     * Packets created this tick that will be sent to all players
     */
    readonly packets: PacketDataIn[] = [];

    readonly teamSize: TeamSize;

    readonly teamMode: boolean;

    readonly teams = new (class SetArray<T> extends Set<T> {
        private _valueCache?: T[];
        get valueArray(): T[] {
            return this._valueCache ??= Array.from(super.values());
        }

        add(value: T): this {
            super.add(value);
            this._valueCache = undefined;
            return this;
        }

        delete(value: T): boolean {
            const ret = super.delete(value);
            this._valueCache = undefined;
            return ret;
        }

        clear(): void {
            super.clear();
            this._valueCache = undefined;
        }

        values(): IterableIterator<T> {
            const iterator = this.values();
            this._valueCache ??= Array.from(iterator);

            return iterator;
        }
    })<Team>();

    private _nextTeamID = -1;
    get nextTeamID(): number { return ++this._nextTeamID; }

    readonly customTeams: globalThis.Map<string, Team> = new globalThis.Map<string, Team>();

    readonly explosions: Explosion[] = [];
    readonly emotes: Emote[] = [];

    /**
     * All bullets that currently exist
     */
    readonly bullets = new Set<Bullet>();
    /**
     * All bullets created this tick
     */
    readonly newBullets: Bullet[] = [];

    /**
     * All airdrops
     */
    readonly airdrops: Airdrop[] = [];

    /**
     * All planes this tick
     */
    readonly planes: Array<{
        readonly position: Vector
        readonly direction: number
    }> = [];

    /**
     * All map pings this tick
     */
    readonly mapPings: PingSerialization[] = [];

    killLeader: Player | undefined;
    killLeaderDirty = false;

    private readonly _spawnableItemTypeCache = [] as Cache;

    private _spawnableLoots: ItemRegistry | undefined;
    get spawnableLoots(): ItemRegistry {
        return this._spawnableLoots ??= getSpawnableLoots(this.modeName, this.map.mapDef, this._spawnableItemTypeCache);
    }

    private readonly _allItemsTypeCache = [] as Cache;

    private _allLoots: ItemRegistry | undefined;
    get allLoots(): ItemRegistry {
        return this._allLoots ??= getAllLoots(this._allItemsTypeCache);
    }

    private readonly _timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay = 0): Timeout {
        const timeout = new Timeout(callback, this.now + delay);
        this._timeouts.add(timeout);
        return timeout;
    }

    private _started = false;

    // #region GameData interface members

    startedTime = Number.MAX_VALUE; // Default of Number.MAX_VALUE makes it so games that haven't started yet are joined first
    allowJoin = false;
    over = false;
    stopped = false;

    get aliveCount(): number {
        return this.livingPlayers.size;
    }

    aliveCountDirty = false;

    // #endregion

    startTimeout?: Timeout;

    /**
     * The value of `Date.now()`, as of the start of the tick.
     */
    private _now = Date.now();
    get now(): number { return this._now; }

    private readonly idealDt = 1000 / Config.tps;

    /**
     * Game Tick delta time
     */
    private _dt = this.idealDt;
    get dt(): number { return this._dt; }

    private readonly _tickTimes: number[] = [];

    private readonly _idAllocator = new IDAllocator(16);

    private readonly _start = this._now;
    get start(): number { return this._start; }

    /**
     * **Warning**: This is a getter _with side effects_! Make
     * sure to either use the id returned by this getter or
     * to return it.
     */
    get nextObjectID(): number {
        return this._idAllocator.takeNext();
    }

    constructor(id: number, teamSize: TeamSize, map: MapWithParams) {
        this.id = id;
        this.teamSize = teamSize;
        this.teamMode = this.teamSize > TeamSize.Solo;
        this.updateGameData({
            aliveCount: 0,
            allowJoin: false,
            over: false,
            stopped: false,
            startedTime: Number.MAX_VALUE // Makes it so games that haven't started yet are joined first
        });

        this.mode = Modes[this.modeName = modeFromMap(map)];

        this.pluginManager.loadPlugins();

        const { width, height } = Maps[map.split(":")[0] as MapName];
        this.grid = new Grid(this, width, height);
        this.map = new GameMap(this, map);
        this.gas = new Gas(this);

        this.setGameData({ allowJoin: true });

        this.pluginManager.emit("game_created", this);
        this.log(`Created in ${Date.now() - this._start} ms`);

        // Start the tick loop
        this.tick();
    }

    log(...message: unknown[]): void {
        Logger.log(styleText(`[Game ${this.id}]`, ColorStyles.foreground.green.normal), ...message);
    }

    warn(...message: unknown[]): void {
        Logger.log(styleText(`[Game ${this.id}] [WARNING]`, ColorStyles.foreground.yellow.normal), ...message);
    }

    error(...message: unknown[]): void {
        Logger.log(styleText(`[Game ${this.id}] [ERROR]`, ColorStyles.foreground.red.normal), ...message);
    }

    onMessage(player: Player | undefined, message: ArrayBuffer): void {
        if (!player) return;

        const packetStream = new PacketStream(new SuroiByteStream(message));
        while (true) {
            const packet = packetStream.deserialize();
            if (packet === undefined) break;

            switch (packet.type) {
                case PacketType.Join:
                    this.activatePlayer(player, packet);
                    break;
                case PacketType.Input:
                    // Ignore input packets from players that haven't finished joining, dead players, or if the game is over
                    if (!player.joined || player.dead || this.over) break;
                    player.processInputs(packet);
                    break;
                case PacketType.Spectate:
                    player.spectate(packet);
                    break;
            }
        }
    }

    tick(): void {
        const now = Date.now();
        this._dt = now - this._now;
        this._now = now;

        // execute timeouts
        for (const timeout of this._timeouts) {
            if (timeout.killed) {
                this._timeouts.delete(timeout);
                continue;
            }

            if (this.now > timeout.end) {
                timeout.callback();
                this._timeouts.delete(timeout);
            }
        }

        for (const loot of this.grid.pool.getCategory(ObjectCategory.Loot)) {
            loot.update();
        }

        for (const parachute of this.grid.pool.getCategory(ObjectCategory.Parachute)) {
            parachute.update();
        }

        for (const projectile of this.grid.pool.getCategory(ObjectCategory.Projectile)) {
            projectile.update();
        }

        for (const syncedParticle of this.grid.pool.getCategory(ObjectCategory.SyncedParticle)) {
            syncedParticle.update();
        }

        // Update bullets
        let records: DamageRecord[] = [];
        for (const bullet of this.bullets) {
            records = records.concat(bullet.update());

            if (bullet.dead) {
                if (!bullet.reflected) {
                    const { onHitExplosion } = bullet.definition;
                    if (onHitExplosion) {
                        this.addExplosion(
                            onHitExplosion,
                            bullet.position,
                            bullet.shooter,
                            bullet.layer,
                            bullet.sourceGun instanceof GunItem ? bullet.sourceGun : undefined
                        );
                    }
                }
                this.bullets.delete(bullet);
            }
        }

        /*
            Do the damage after updating all bullets
            This is to make sure bullets hitting the same object on the same tick will all die so
            they don't de-sync with the client

            Example: a shotgun insta-killing a crate—on the client all bullets will hit the crate,
            while on the server, the usual approach of dealing damage on-update would cause some
            bullets to pass through unhindered since the crate would have been destroyed by the
            first pellets.
        */
        for (const { object, damage, source, weapon, position } of records) {
            object.damage({
                amount: damage,
                source,
                weaponUsed: weapon,
                position: position
            });

            const { onHitProjectile, enemySpeedMultiplier, removePerk } = weapon.definition.ballistics;

            if (
                onHitProjectile
                && !(
                    "definition" in object
                    && (object.definition.noCollisions || object.definition.noBulletCollision)
                )
            ) {
                const proj = this.addProjectile({
                    owner: source,
                    position,
                    definition: onHitProjectile,
                    height: 0,
                    velocity: Vec.create(0, 0),
                    layer: object.layer,
                    rotation: randomRotation()
                });

                if (object.isPlayer) {
                    (object.stuckProjectiles ??= new Map()).set(proj, Angle.betweenPoints(position, object.position) - object.rotation);
                }
            }

            if (
                enemySpeedMultiplier
                && object.isPlayer
                && source.isPlayer
                && (!this.teamMode || object.teamID !== source.teamID || object.id === source.id)
            ) {
                object.effectSpeedMultiplier = enemySpeedMultiplier.multiplier;
                object.effectSpeedTimeout?.kill();
                object.effectSpeedTimeout = this.addTimeout(() => object.effectSpeedMultiplier = 1, enemySpeedMultiplier.duration);
            }

            if (object.isPlayer && removePerk) {
                object.perks.removeItem(Perks.fromString(removePerk));
                if (removePerk === PerkIds.Infected) { // evil
                    const immunity = PerkData[PerkIds.Immunity];
                    object.perks.addItem(immunity);
                    object.immunityTimeout?.kill();
                    object.immunityTimeout = this.addTimeout(() => object.perks.removeItem(immunity), immunity.duration);
                    object.setDirty();
                }
            }
        }

        // Handle explosions
        for (const explosion of this.explosions) {
            explosion.explode();
        }

        // Update gas
        this.gas.tick();

        // First loop over players: movement, animations, & actions
        for (const player of this.livingPlayers) {
            player.update();
        }

        // Serialize dirty objects
        for (const partialObject of this.partialDirtyObjects) {
            if (this.fullDirtyObjects.has(partialObject)) continue;
            partialObject.serializePartial();
        }
        for (const fullObject of this.fullDirtyObjects) {
            fullObject.serializeFull();
        }

        // Second loop over players: calculate visible objects & send updates
        for (const player of this.connectedPlayers) {
            player.secondUpdate();
        }

        // Third loop over players: clean up after all packets have been sent
        for (const player of this.connectedPlayers) {
            player.postPacket();
        }

        // Reset everything
        this.fullDirtyObjects.clear();
        this.partialDirtyObjects.clear();
        this.newBullets.length = 0;
        this.explosions.length = 0;
        this.emotes.length = 0;
        this.newPlayers.length = 0;
        this.deletedPlayers.length = 0;
        this.packets.length = 0;
        this.planes.length = 0;
        this.mapPings.length = 0;
        this.killLeaderDirty = false;
        this.aliveCountDirty = false;
        this.gas.dirty = false;
        this.gas.completionRatioDirty = false;
        this.updateObjects = false;

        // Winning logic
        if (
            this._started
            && !this.over
            && !Config.startImmediately
            && (
                this.teamMode
                    ? this.aliveCount <= (this.teamSize as number) && new Set([...this.livingPlayers].map(p => p.teamID)).size <= 1
                    : this.aliveCount <= 1
            )
        ) {
            for (const player of this.livingPlayers) {
                const { movement } = player;
                movement.up = movement.down = movement.left = movement.right = false;
                player.attacking = false;
                player.sendEmote(player.loadout.emotes[4]);
                player.sendGameOverPacket(true);
                this.pluginManager.emit("player_did_win", player);
            }

            this.pluginManager.emit("game_end", this);

            this.setGameData({ allowJoin: false, over: true });

            // End the game in 1 second
            this.addTimeout(() => {
                for (const player of this.connectedPlayers) {
                    player.disconnect("Game ended");
                }
                this.setGameData({ stopped: true });
                this.log("Ended");
            }, 1000);
        }

        // Record performance and start the next tick
        // THIS TICK COUNTER IS WORKING CORRECTLY!
        // It measures the time it takes to calculate a tick, not the time between ticks.
        const tickTime = Date.now() - now;
        this._tickTimes.push(tickTime);

        if (this._tickTimes.length >= 200) {
            const mspt = Statistics.average(this._tickTimes);
            const stddev = Statistics.stddev(this._tickTimes);
            this.log(`ms/tick: ${mspt.toFixed(2)} ± ${stddev.toFixed(2)} | Load: ${((mspt / this.idealDt) * 100).toFixed(1)}%`);
            this._tickTimes.length = 0;
        }

        this.pluginManager.emit("game_tick", this);

        if (!this.stopped) {
            setTimeout(this.tick.bind(this), this.idealDt - (Date.now() - now));
        }
    }

    setGameData(data: Partial<Omit<GameData, "aliveCount">>): void {
        for (const [key, value] of Object.entries(data)) {
            // HACK this is kinda really fkin dumb, i dunno why this isn't working
            this[key as keyof typeof data] = value as never;
        }
        this.updateGameData(data);
    }

    updateGameData(data: Partial<GameData>): void {
        process.send?.(data);
    }

    kill(): void {
        for (const player of this.connectedPlayers) {
            player.disconnect("Server killed");
        }

        this.setGameData({
            allowJoin: false,
            over: true,
            stopped: true
        });

        this.log("Killed");
    }

    updateKillLeader(player: Player): void {
        const killLeader = this.killLeader;

        if (
            player.kills > (killLeader?.kills ?? (GameConstants.player.killLeaderMinKills - 1))
            && !player.dead
            && player !== killLeader
        ) {
            this.killLeader = player;
            this.killLeaderDirty = true;
        } else if (player === killLeader) {
            this.killLeaderDirty = true;
        }
    }

    findNewKillLeader(): void {
        let mostKills = GameConstants.player.killLeaderMinKills - 1;
        let newKillLeader: Player | undefined;
        for (const player of this.livingPlayers) {
            if (player.kills > mostKills) {
                mostKills = player.kills;
                newKillLeader = player;
            } else if (player.kills === mostKills) { // multiple players with the same kills means no leader
                newKillLeader = undefined;
            }
        }
        this.killLeader = newKillLeader;
        this.killLeaderDirty = true;
    }

    addPlayer(socket?: WebSocket<PlayerSocketData>): Player | undefined {
        const rejectedBy = this.pluginManager.emit("player_will_connect");
        if (rejectedBy) {
            socket?.end(1000, `Connection rejected by server plugin '${rejectedBy.constructor.name}'`);
            return;
        }

        let spawnPosition = Vec.create(this.map.width / 2, this.map.height / 2);
        let spawnLayer;

        let team: Team | undefined;
        if (this.teamMode) {
            const { teamID, autoFill } = socket?.getUserData() ?? {};

            if (teamID) {
                team = this.customTeams.get(teamID);

                if (
                    !team // team doesn't exist
                    || (team.players.length && !team.hasLivingPlayers()) // team isn't empty but has no living players
                    || team.players.length >= (this.teamSize as number) // team is full
                ) {
                    this.teams.add(team = new Team(this.nextTeamID, autoFill));
                    this.customTeams.set(teamID, team);
                }
            } else {
                const vacantTeams = this.teams.valueArray.filter(
                    team =>
                        team.autoFill
                        && team.players.length < (this.teamSize as number)
                        && team.hasLivingPlayers()
                );
                if (vacantTeams.length) {
                    team = pickRandomInArray(vacantTeams);
                } else {
                    this.teams.add(team = new Team(this.nextTeamID));
                }
            }
        }

        const spawnOptions = Config.spawn.mode === SpawnMode.Default
            ? this.map.mapDef.spawn ?? { mode: SpawnMode.Normal }
            : Config.spawn;
        switch (spawnOptions.mode) {
            case SpawnMode.Normal: {
                const hitbox = new CircleHitbox(5);
                const gasPosition = this.gas.newPosition;
                const gasRadius = this.gas.newRadius ** 2;
                const teamPosition = this.teamMode
                    // teamMode should guarantee the `team` object's existence
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    ? pickRandomInArray(team!.getLivingPlayers())?.position
                    : undefined;

                let foundPosition = false;
                const maxTries = 200;
                const spawnDistance = 160;
                const distanceInterval = 20;
                const reduceDistanceAmount = 10;
                for (let tries = 0; !foundPosition && tries < maxTries; tries++) {
                    const position = this.map.getRandomPosition(
                        hitbox,
                        {
                            maxAttempts: 500,
                            spawnMode: MapObjectSpawnMode.GrassAndSand,
                            getPosition: this.teamMode && teamPosition
                                ? () => randomPointInsideCircle(teamPosition, 20, 10)
                                : undefined,
                            collides: position => Geometry.distanceSquared(position, gasPosition) >= gasRadius
                        }
                    );

                    // Break if the above code couldn't find a valid position, as it's unlikely that subsequent loops will
                    if (!position) break;
                    spawnPosition = position;

                    const minSpawnDist = Numeric.clamp(spawnDistance - (Math.floor(tries / distanceInterval) * reduceDistanceAmount), 0, spawnDistance);

                    foundPosition = true;
                    const radiusHitbox = new CircleHitbox(minSpawnDist, spawnPosition);
                    for (const object of this.grid.intersectsHitbox(radiusHitbox)) {
                        if (
                            object.isPlayer
                            && !object.dead
                            // teamMode should guarantee the `team` object's existence
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            && (!this.teamMode || !team!.players.includes(object))
                        ) {
                            foundPosition = false;
                        }
                    }
                }

                // Spawn on top of a random teammate if a valid position couldn't be found
                if (!foundPosition && teamPosition) spawnPosition = teamPosition;

                break;
            }
            case SpawnMode.Radius: {
                const [x, y, layer] = spawnOptions.position;
                spawnPosition = randomPointInsideCircle(
                    Vec.create(x, y),
                    spawnOptions.radius
                );
                spawnLayer = layer ?? Layer.Ground;
                break;
            }
            case SpawnMode.Fixed: {
                const [x, y, layer] = spawnOptions.position;
                spawnPosition = Vec.create(x, y);
                spawnLayer = layer ?? Layer.Ground;
                break;
            }
            case SpawnMode.Center: {
                // no-op; this is the default
                break;
            }
        }

        // Player is added to the players array when a JoinPacket is received from the client
        const player = new Player(this, socket, spawnPosition, spawnLayer, team);
        this.pluginManager.emit("player_did_connect", player);
        return player;
    }

    // Called when a JoinPacket is sent by the client
    activatePlayer(player: Player, packet: JoinData): void {
        if (player.joined) return;
        const rejectedBy = this.pluginManager.emit("player_will_join", { player, joinPacket: packet });
        if (rejectedBy) {
            player.disconnect(`Connection rejected by server plugin '${rejectedBy.constructor.name}'`);
            return;
        }

        if (packet.protocolVersion !== GameConstants.protocolVersion) {
            player.disconnect(`Invalid game version (expected ${GameConstants.protocolVersion}, was ${packet.protocolVersion})`);
            return;
        }

        player.name = cleanUsername(packet.name);

        player.isMobile = packet.isMobile;
        const skin = packet.skin;
        if (
            skin.itemType === ItemType.Skin
            && !skin.hideFromLoadout
            && (
                skin.rolesRequired === undefined
                || (skin.rolesRequired.includes as (_?: string) => boolean)(player.role)
            )
        ) {
            player.loadout.skin = skin;
        }

        const badge = packet.badge;
        if (!badge?.roles?.length || (player.role !== undefined && badge.roles.includes(player.role))) {
            player.loadout.badge = badge;
        }
        player.loadout.emotes = packet.emotes;

        this.livingPlayers.add(player);
        this.spectatablePlayers.push(player);
        this.connectedPlayers.add(player);
        this.newPlayers.push(player);
        this.grid.addObject(player);
        player.setDirty();
        this.aliveCountDirty = true;
        this.updateObjects = true;
        this.updateGameData({ aliveCount: this.aliveCount });

        player.joined = true;

        player.sendPacket(
            JoinedPacket.create(
                {
                    teamSize: this.teamSize,
                    teamID: player.teamID ?? 0,
                    emotes: player.loadout.emotes
                }
            )
        );

        player.sendData(this.map.buffer);

        this.addTimeout(() => { player.disableInvulnerability(); }, 5000);

        if (
            (this.teamMode ? this.teams.size : this.aliveCount) > (Config.startImmediately ? 0 : 1)
            && !this._started
            && this.startTimeout === undefined
        ) {
            this.startTimeout = this.addTimeout(() => {
                this._started = true;
                this.setGameData({ startedTime: this.now });
                this.gas.advanceGasStage();
            }, 3000);

            this.addTimeout(() => {
                this.log("Preventing new players from joining");
                this.setGameData({ allowJoin: false });
            }, GAME_SPAWN_WINDOW * 1000);
        }

        this.log(`"${player.name}" joined`);
        // Access log to store usernames for this connection
        if (Config.apiServer) {
            const username = player.name;
            if (username) {
                fetch(
                    `${Config.apiServer.url}/accesslog/${player.ip || "none"}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "api-key": Config.apiServer.apiKey || "none"
                        },
                        body: JSON.stringify({ username })
                    }
                ).catch(console.error);
            }
        }
        this.pluginManager.emit("player_did_join", { player, joinPacket: packet });
    }

    removePlayer(player: Player, reason?: string): void {
        if (player.disconnected) return;
        player.disconnected = true;
        this.aliveCountDirty = true;
        this.connectedPlayers.delete(player);

        this.log(`"${player.name}" left`);

        if (player === this.killLeader) {
            this.findNewKillLeader();
        }

        if (player.canDespawn) {
            this.livingPlayers.delete(player);
            this.removeObject(player);
            this.deletedPlayers.push(player.id);
            removeFrom(this.spectatablePlayers, player);
            this.updateGameData({ aliveCount: this.aliveCount });

            if (this.teamMode) {
                const team = player.team;
                if (team) {
                    team.removePlayer(player);

                    if (!team.players.length) this.teams.delete(team);
                }
                player.teamWipe();
                player.beingRevivedBy?.action?.cancel();
            }
        } else {
            player.rotation = 0;
            player.movement.up = player.movement.down = player.movement.left = player.movement.right = false;
            player.attacking = false;
            player.setPartialDirty();

            if (this.teamMode && this.now - player.joinTime < 10000) {
                player.team?.removePlayer(player);
            }
        }

        if (player.spectating !== undefined) {
            player.spectating.spectators.delete(player);
        }

        if (this.aliveCount < 2) {
            this.startTimeout?.kill();
            this.startTimeout = undefined;
        }

        try {
            if (reason) {
                player.socket?.end(1000, reason);
            } else {
                player.socket?.close();
            }
        } catch {
            // not a really big deal if we can't close the socket (when does this ever fail?)
        }
        this.pluginManager.emit("player_disconnect", player);
    }

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // ! The implementation signature is the correct signature, but due to some TS strangeness,
    // ! ReifiableDef<Def> has been expanded out into Def | ReferenceTo<Def> (as per its definition),
    // ! and each constituent of the union has been given an overload. This doesn't actually change
    // ! which calls succeed and which ones don't, but without it, the inference for Def breaks.
    // ! Indeed, for some reason, directly using the implementation signature causes TS to infer
    // ! the generic Def as never for calls resembling addLoot(SomeSchema.fromString("some_string"), …)
    // !
    // ! For anyone reading this, try removing the two overloads, and test if the code
    // ! this.addLoot(HealingItems.fromString("cola"), Vec.create(0, 0), Layer.Ground) does two things:
    // ! a) it does not raise type errors
    // ! b) Def is inferred as HealingItemDefinition
    addLoot<Def extends LootDefinition = LootDefinition>(
        definition: Def,
        position: Vector,
        layer: Layer,
        opts?: { readonly count?: number, readonly pushVel?: number, readonly jitterSpawn?: boolean, readonly data?: ItemData<Def> }
    ): Loot<Def> | undefined;
    addLoot<Def extends LootDefinition = LootDefinition>(
        // eslint-disable-next-line @typescript-eslint/unified-signatures
        definition: ReferenceTo<Def>,
        position: Vector,
        layer: Layer,
        opts?: { readonly count?: number, readonly pushVel?: number, readonly jitterSpawn?: boolean, readonly data?: ItemData<Def> }
    ): Loot<Def> | undefined;
    // ! and for any calling code using ReifiableDef, we gotta support that too
    // ! yes, this is a duplicate of the implementation signature
    addLoot<Def extends LootDefinition = LootDefinition>(
        // eslint-disable-next-line @typescript-eslint/unified-signatures
        definition: ReifiableDef<Def>,
        position: Vector,
        layer: Layer,
        opts?: { readonly count?: number, readonly pushVel?: number, readonly jitterSpawn?: boolean, readonly data?: ItemData<Def> }
    ): Loot<Def> | undefined;
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    /**
     * Adds a `Loot` item to the game world
     * @param definition The type of loot to add. Prefer passing `LootDefinition` if possible
     * @param position The position to spawn this loot at
     * @param count Optionally define an amount of this loot (note that this does not equate spawning
     * that many `Loot` objects, but rather how many the singular `Loot` object will contain)
     * @returns The created loot object
     */
    addLoot<Def extends LootDefinition = LootDefinition>(
        definition: ReifiableDef<Def>,
        position: Vector,
        layer: Layer,
        { count, pushVel, jitterSpawn = true, data }: {
            readonly count?: number
            readonly pushVel?: number
            /**
             * Whether to add a random offset to the given position
             */
            readonly jitterSpawn?: boolean
            readonly data?: ItemData<Def>
        } = {}
    ): Loot<Def> | undefined {
        const args = {
            position,
            layer,
            count,
            pushVel,
            jitterSpawn,
            data
        };

        definition = Loots.reify<Def>(definition);

        if (
            this.pluginManager.emit(
                "loot_will_generate",
                {
                    definition,
                    ...args
                }
            )
        ) return;

        const loot = new Loot<Def>(
            this,
            definition,
            jitterSpawn
                ? Vec.add(
                    position,
                    randomPointInsideCircle(Vec.create(0, 0), GameConstants.lootSpawnMaxJitter)
                )
                : position,
            layer,
            {
                count,
                pushVel,
                data
            }
        );
        this.grid.addObject(loot);

        this.pluginManager.emit(
            "loot_did_generate",
            { loot, ...args }
        );

        return loot;
    }

    removeLoot(loot: Loot): void {
        loot.dead = true;
        this.removeObject(loot);
    }

    addBullet(
        source: GunItem | Explosion,
        shooter: GameObject,
        options: Omit<ServerBulletOptions, "idString"> & { readonly idString?: ReferenceTo<BulletDefinition> }
    ): Bullet | undefined {
        const reference = source instanceof GunItem && source.definition.isDual
            ? Loots.fromString<SingleGunNarrowing>(source.definition.singleVariant)
            : source.definition;

        const idString = options.idString ?? `${reference.idString}_bullet`;

        const def = Bullets.fromString(idString);
        let range = def.range * (options.modifiers?.range ?? 1);
        if (def.allowRangeOverride && options.rangeOverride !== undefined) {
            range = Numeric.clamp(options.rangeOverride, 0, range);
        }

        if (range <= 0) return;

        const bullet = new Bullet(
            this,
            source,
            shooter,
            {
                ...options,
                idString
            }
        );

        this.bullets.add(bullet);
        this.newBullets.push(bullet);

        return bullet;
    }

    addExplosion(
        type: ReifiableDef<ExplosionDefinition>,
        position: Vector,
        source: GameObject,
        layer: Layer,
        weapon?: GunItem | MeleeItem | ThrowableItem,
        damageMod = 1,
        objectsToIgnore?: Set<GameObject>
    ): Explosion {
        const explosion = new Explosion(this, type, position, source, layer, weapon, damageMod, objectsToIgnore);
        this.explosions.push(explosion);
        return explosion;
    }

    addProjectile(params: ProjectileParams): Projectile {
        const projectile = new Projectile(
            this,
            params
        );
        this.grid.addObject(projectile);
        return projectile;
    }

    removeProjectile(projectile: Projectile): void {
        projectile.destroy();
        this.removeObject(projectile);
    }

    addSyncedParticle(
        definition: ReifiableDef<SyncedParticleDefinition>,
        position: Vector,
        endPosition?: Vector,
        layer: Layer | number = 0,
        creatorID?: number
    ): SyncedParticle {
        const syncedParticle = new SyncedParticle(this, SyncedParticles.reify(definition), position, endPosition, layer, creatorID);
        this.grid.addObject(syncedParticle);
        return syncedParticle;
    }

    removeSyncedParticle(syncedParticle: SyncedParticle): void {
        this.removeObject(syncedParticle);
        syncedParticle.dead = true;
    }

    addSyncedParticles(def: ReifiableDef<SyncedParticleDefinition>, position: Vector, layer: Layer | number): void {
        const { idString, spawner, velocity: { duration } } = SyncedParticles.reify(def);
        if (!spawner) {
            throw new Error("Attempted to spawn synced particles without a spawner");
        }
        const { count, radius, staggering } = spawner;

        const spawnParticles = (amount = 1): void => {
            for (let i = 0; i++ < amount; i++) {
                const endPosition = randomPointInsideCircle(position, radius);
                if (duration) {
                    this.addSyncedParticle(idString, position, endPosition, layer);
                } else {
                    this.addSyncedParticle(idString, endPosition, undefined, layer);
                }
            }
        };

        if (staggering) {
            const { delay, initialAmount = 0 } = staggering;
            spawnParticles(initialAmount);

            for (let i = initialAmount, j = 1; i < count; i++, j++) {
                this.addTimeout(() => spawnParticles(1), j * delay);
            }
        } else {
            spawnParticles(count);
        }
    }

    /**
     * Delete an object and give the id back to the allocator
     * @param object The object to delete
     */
    removeObject(object: GameObject): void {
        this.grid.removeObject(object);
        this._idAllocator.give(object.id);
        this.updateObjects = true;
    }

    summonAirdrop(position: Vector): void {
        if (this.pluginManager.emit("airdrop_will_summon", { position })) return;

        const paddingFactor = 1.25;

        const crateDef = Obstacles.fromString("airdrop_crate_locked");
        const crateHitbox = (crateDef.spawnHitbox ?? crateDef.hitbox).clone();
        let thisHitbox = crateHitbox.clone();

        let collided = true;
        let attempts = 0;
        let randomInt: number | undefined;

        while (collided) {
            if (attempts === 500) {
                switch (true) {
                    case position.x < this.map.height / 2 && position.y < this.map.height / 2:
                        randomInt = [1, 2, 3][Math.floor(Math.random() * 3)];
                        break;
                    case position.x > this.map.height / 2 && position.y < this.map.height / 2:
                        randomInt = [1, 4, 5][Math.floor(Math.random() * 3)];
                        break;
                    case position.x < this.map.height / 2 && position.y > this.map.height / 2:
                        randomInt = [3, 6, 7][Math.floor(Math.random() * 3)];
                        break;
                    case position.x > this.map.height / 2 && position.y > this.map.height / 2:
                        randomInt = [4, 6, 8][Math.floor(Math.random() * 3)];
                        break;
                }
            }

            if (randomInt !== undefined) {
                const distance = crateHitbox.toRectangle().max.x * 2 * paddingFactor;

                switch (randomInt) {
                    case 1:
                        position.y = position.y + distance;
                        break;
                    case 2:
                        position.x = position.x + distance;
                        position.y = position.y + distance;
                        break;
                    case 3:
                        position.x = position.x + distance;
                        break;
                    case 4:
                        position.x = position.x - distance;
                        break;
                    case 5:
                        position.x = position.x - distance;
                        position.y = position.y + distance;
                        break;
                    case 6:
                        position.y = position.y - distance;
                        break;
                    case 7:
                        position.y = position.y - distance;
                        position.x = position.x + distance;
                        break;
                    case 8:
                        position.y = position.y - distance;
                        position.x = position.x - distance;
                        break;
                }
            }

            attempts++;
            collided = false;

            for (const airdrop of this.airdrops) {
                thisHitbox = crateHitbox.transform(position);
                const thatHitbox = (airdrop.type.spawnHitbox ?? airdrop.type.hitbox).transform(airdrop.position);
                thatHitbox.scale(paddingFactor);

                if (Vec.equals(thisHitbox.getCenter(), thatHitbox.getCenter())) {
                    /*
                        when dealing with airdrops exactly superimposed, the normal collision
                        method makes them line up all in one direction; ideally, we'd want them
                        to scatter around the original point. to influence the collider, we'll
                        nudge one of the hitboxes
                    */
                    thisHitbox = thisHitbox.transform(Vec.fromPolar(randomRotation(), 0.01));
                }

                if (thisHitbox.collidesWith(thatHitbox)) {
                    collided = true;
                    if (attempts >= 500) continue;
                    thisHitbox.resolveCollision(thatHitbox);
                }
                position = thisHitbox.getCenter();
            }

            thisHitbox = crateHitbox.transform(position);

            {
                const padded = thisHitbox.clone();
                padded.scale(paddingFactor);
                for (const object of this.grid.intersectsHitbox(padded, Layer.Ground)) {
                    let hitbox: Hitbox;
                    if (
                        object.isObstacle
                        && !object.dead
                        && object.definition.indestructible
                        && ((hitbox = object.spawnHitbox.clone()).scale(paddingFactor), hitbox.collidesWith(thisHitbox))
                    ) {
                        collided = true;
                        if (attempts >= 500) continue;
                        thisHitbox.resolveCollision(object.spawnHitbox);
                    }
                    position = thisHitbox.getCenter();
                }
            }

            thisHitbox = crateHitbox.transform(position);

            {
                const padded = thisHitbox.clone();
                padded.scale(paddingFactor);
                // second loop, buildings
                for (const object of this.grid.intersectsHitbox(thisHitbox, Layer.Ground)) {
                    if (
                        object.isBuilding
                        && object.scopeHitbox
                        && object.definition.wallsToDestroy === undefined
                    ) {
                        const hitbox = object.scopeHitbox.clone();
                        hitbox.scale(paddingFactor);
                        if (!thisHitbox.collidesWith(hitbox)) continue;
                        collided = true;
                        if (attempts >= 500) continue;
                        thisHitbox.resolveCollision(object.scopeHitbox);
                    }
                    position = thisHitbox.getCenter();
                }
            }

            thisHitbox = crateHitbox.transform(position);

            const { min, max } = thisHitbox.toRectangle();
            const width = max.x - min.x;
            const height = max.y - min.y;
            position.x = Numeric.clamp(position.x, width, this.map.width - width);
            position.y = Numeric.clamp(position.y, height, this.map.height - height);
        }

        const direction = randomRotation();

        const planePos = Vec.add(
            position,
            Vec.fromPolar(direction, -GameConstants.maxPosition)
        );

        const airdrop = { position, type: crateDef };

        this.airdrops.push(airdrop);

        this.planes.push({ position: planePos, direction });

        this.addTimeout(() => {
            const parachute = new Parachute(this, position, airdrop);
            this.grid.addObject(parachute);
            this.mapPings.push({
                definition: MapPings.fromString<MapPing>("airdrop_ping"),
                position
            });
        }, GameConstants.airdrop.flyTime);

        this.pluginManager.emit("airdrop_did_summon", { airdrop, position });
    }
}

export interface Airdrop {
    readonly position: Vector
    readonly type: ObstacleDefinition
}
