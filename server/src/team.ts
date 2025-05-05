import { TeamSize } from "@common/constants";
import { CustomTeamMessages, CustomTeamPlayerInfo, type CustomTeamMessage } from "@common/typings";
import { random } from "@common/utils/random";
import { WebSocket } from "uWebSockets.js";
import { MapWithParams } from "./config";
import { findGame } from "./gameManager";
import { type Player } from "./objects/player";
import { removeFrom } from "@common/utils/misc";

export class Team {
    readonly id: number;

    private readonly _players: Player[] = [];
    get players(): readonly Player[] { return this._players; }

    readonly _indexMapping = new Map<Player, number>();

    kills = 0;

    readonly autoFill: boolean;

    constructor(id: number, autoFill = true) {
        this.id = id;
        this.autoFill = autoFill;
    }

    addPlayer(player: Player): void {
        player.colorIndex = this.getNextAvailableColorIndex();
        this._indexMapping.set(player, this._players.push(player) - 1);
        this.setDirty();
    }

    removePlayer(player: Player): boolean {
        const index = this._indexMapping.get(player);
        const exists = index !== undefined;
        if (exists) {
            this._players.splice(index, 1);
            this._indexMapping.delete(player);

            /*
                [a, b, c, d, e, f] // -> player array
                [
                    a -> 0,
                    b -> 1,
                    c -> 2,
                    d -> 3,
                    e -> 4,
                    f -> 5
                ]

                remove player c

                [a, b, d, e, f]
                [
                    a -> 0,
                    b -> 1,
                    c -> 2,
                    d -> 3,
                    e -> 4,
                    f -> 5
                ]

                now we just need to refresh the mappings, but we skip 0, 1, and 2

                [a, b, d, e, f]
                [
                    a -> 0,
                    b -> 1,
                    d -> 3 - 1,
                    e -> 4 - 1,
                    f -> 5 - 1
                ]

                which gives
                [a, b, d, e, f]
                [
                    a -> 0,
                    b -> 1,
                    d -> 2,
                    e -> 3,
                    f -> 4
                ]

                which is correct

                this obviously only works with a specific configuration of the array and map (that
                being the one used in the example), but since we control the insertion of data into
                those collections, we can ensure that it always finds itself in such a configuration
                (which also just so happens to be the easiest and simplest)

                it could possibly to use a sparse array with a list of vacant indices in order to
                minimize array resizes with push and splice, but i can't be bothered to implement that
                haha
            */
            for (const [player, mapped] of this._indexMapping.entries()) { // refresh mapping
                if (mapped <= index) continue;
                this._indexMapping.set(player, mapped - 1);
                this.reassignColorIndexes();
            }
        }

        return exists;
    }

    setDirty(): void {
        for (const player of this.players) {
            player.dirty.teammates = true;
        }
    }

    // Team color indexes must be checked and updated in order not to have duplicates.
    getNextAvailableColorIndex(): number {
        const existingIndexes = this.players.map(player => player.colorIndex);
        let newIndex = 0;
        while (existingIndexes.includes(newIndex)) {
            newIndex++;
        }
        return newIndex;
    }

    reassignColorIndexes(): void {
        this.players.forEach((player, index) => {
            player.colorIndex = index;
        });
    }

    hasLivingPlayers(): boolean {
        return this.players.some(player => !player.dead && !player.disconnected);
    }

    getLivingPlayers(): Player[] {
        return this.players.filter(player => !player.dead && !player.disconnected);
    }
}

export interface CustomTeamPlayerContainer { player: CustomTeamPlayer }

export class CustomTeam {
    private static readonly _idChars = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static readonly _idCharMax = this._idChars.length - 1;

    readonly id: string;

    readonly players: CustomTeamPlayer[] = [];

    autoFill = false;
    locked = false;
    forceStart = false;

    gameID?: number;
    resetTimeout?: NodeJS.Timeout;

    // these are only used when creating games
    teamSize: TeamSize;
    map: MapWithParams;

    constructor(teamSize: TeamSize, map: MapWithParams) {
        this.id = Array.from({ length: 4 }, () => CustomTeam._idChars.charAt(random(0, CustomTeam._idCharMax))).join("");
        this.teamSize = teamSize;
        this.map = map;
    }

    addPlayer(player: CustomTeamPlayer): void {
        this.players.push(player);
        player.sendMessage({
            type: CustomTeamMessages.Join,
            teamID: this.id,
            isLeader: player.isLeader,
            autoFill: this.autoFill,
            locked: this.locked,
            forceStart: this.forceStart
        });
        this._publishPlayerUpdate();
    }

    removePlayer(player: CustomTeamPlayer): void {
        removeFrom(this.players, player);

        if (!this.players.length) {
            clearTimeout(this.resetTimeout);
            return;
        }

        this._publishPlayerUpdate();
    }

    async onMessage(player: CustomTeamPlayer, message: CustomTeamMessage): Promise<void> {
        if (!message) return;

        switch (message.type) {
            case CustomTeamMessages.Settings: {
                if (!player.isLeader) break; // Only leader can change settings

                if (message.autoFill !== undefined) this.autoFill = message.autoFill;
                if (message.locked !== undefined) this.locked = message.locked;
                if (message.forceStart !== undefined) {
                    this.forceStart = player.ready = message.forceStart;
                    this._publishPlayerUpdate();
                }

                this._publishMessage({
                    type: CustomTeamMessages.Settings,
                    autoFill: this.autoFill,
                    locked: this.locked,
                    forceStart: this.forceStart
                });
                break;
            }
            case CustomTeamMessages.KickPlayer: {
                if (!player.isLeader) break;

                const id = message.playerId;
                const toRemove = this.players[id];
                if (!toRemove || toRemove.isLeader) break;

                toRemove.socket?.end(1000, "kicked");
                this.players.splice(id, 1);
                this._publishPlayerUpdate();
                break;
            }
            case CustomTeamMessages.Start: {
                if (player.isLeader && this.forceStart) {
                    await this._startGame();
                } else {
                    player.ready = !player.ready;
                    if (this.players.every(p => p.ready)) {
                        await this._startGame();
                    }
                }
                this._publishPlayerUpdate();
                break;
            }
        }
    }

    private async _startGame(): Promise<void> {
        const result = await findGame(this.teamSize, this.map);
        if (result === undefined) return;

        this.gameID = result;
        clearTimeout(this.resetTimeout);
        this.resetTimeout = setTimeout(() => this.gameID = undefined, 10000);

        for (const player of this.players) {
            player.ready = false;
        }

        this._publishMessage({ type: CustomTeamMessages.Started });
    }

    private _publishPlayerUpdate(): void {
        const players: CustomTeamPlayerInfo[] = [];
        for (let id = 0, len = this.players.length; id < len; id++) {
            const p = this.players[id];
            players.push({
                id,
                isLeader: p.isLeader,
                ready: p.ready,
                name: p.name,
                skin: p.skin,
                badge: p.badge,
                nameColor: p.nameColor
            });
        }

        for (const player of this.players) {
            player.sendMessage({
                type: CustomTeamMessages.Update,
                players,
                isLeader: player.isLeader,
                ready: player.ready,
                forceStart: this.forceStart
            });
        }
    }

    private _publishMessage(message: CustomTeamMessage): void {
        for (const player of this.players) {
            player.sendMessage(message);
        }
    }
}

export class CustomTeamPlayer {
    get id(): number { return this.team.players.indexOf(this); }
    get isLeader(): boolean { return this.id === 0; }
    socket?: WebSocket<CustomTeamPlayerContainer>;
    ready = false;

    constructor(
        readonly ip: string,
        readonly team: CustomTeam,
        readonly name: string,
        readonly skin: string,
        readonly badge?: string,
        readonly nameColor?: number
    ) {}

    sendMessage(message: CustomTeamMessage): void {
        this.socket?.send(JSON.stringify(message));
    }
}
