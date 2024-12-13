import { CustomTeamMessages, type CustomTeamMessage } from "@common/typings";
import { random } from "@common/utils/random";
import { type WebSocket } from "uWebSockets.js";
import { findGame } from "./gameManager";
import { type Player } from "./objects/player";
import { customTeams } from "./server";
import { removeFrom } from "./utils/misc";

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

export class CustomTeam {
    private static readonly _idChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static readonly _idCharMax = this._idChars.length - 1;

    readonly id: string;

    readonly players: CustomTeamPlayer[] = [];

    autoFill = false;
    locked = false;

    gameID?: number;
    resetTimeout?: NodeJS.Timeout;

    constructor() {
        this.id = Array.from({ length: 4 }, () => CustomTeam._idChars.charAt(random(0, CustomTeam._idCharMax))).join("");
    }

    addPlayer(player: CustomTeamPlayer): void {
        player.sendMessage({
            type: CustomTeamMessages.Join,
            teamID: this.id,
            isLeader: player.isLeader,
            autoFill: this.autoFill,
            locked: this.locked
        });

        this._publishPlayerUpdate();
    }

    removePlayer(player: CustomTeamPlayer): void {
        removeFrom(this.players, player);

        if (!this.players.length) {
            clearTimeout(this.resetTimeout);
            customTeams.delete(this.id);
            return;
        }

        this._publishPlayerUpdate();
    }

    async onMessage(player: CustomTeamPlayer, message: CustomTeamMessage): Promise<void> {
        switch (message.type) {
            case CustomTeamMessages.Settings: {
                if (!player.isLeader) break; // Only leader can change settings

                if (message.autoFill !== undefined) this.autoFill = message.autoFill;
                if (message.locked !== undefined) this.locked = message.locked;

                this._publishMessage({
                    type: CustomTeamMessages.Settings,
                    autoFill: this.autoFill,
                    locked: this.locked
                });
                break;
            }
            case CustomTeamMessages.Start: {
                if (player.isLeader) {
                    const result = await findGame();
                    if (result.success) {
                        this.gameID = result.gameID;
                        clearTimeout(this.resetTimeout);
                        this.resetTimeout = setTimeout(() => this.gameID = undefined, 10000);

                        for (const player of this.players) {
                            player.ready = false;
                        }

                        this._publishMessage({ type: CustomTeamMessages.Started });
                        this._publishPlayerUpdate();
                    }
                } else {
                    player.ready = true;
                    this._publishPlayerUpdate();
                }
                break;
            }
        }
    }

    private _publishPlayerUpdate(): void {
        const players = this.players.map(p => ({
            isLeader: p.isLeader,
            ready: p.ready,
            name: p.name,
            skin: p.skin,
            badge: p.badge,
            nameColor: p.nameColor
        }));

        for (const player of this.players) {
            player.sendMessage({
                type: CustomTeamMessages.Update,
                players,
                isLeader: player.isLeader,
                ready: player.ready
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
    socket!: WebSocket<CustomTeamPlayerContainer>;
    team: CustomTeam;
    get id(): number { return this.team.players.indexOf(this); }
    get isLeader(): boolean { return this.id === 0; }
    ready: boolean;
    name: string;
    skin: string;
    badge?: string;
    nameColor?: number;

    constructor(
        team: CustomTeam,
        name: string,
        skin: string,
        badge?: string,
        nameColor?: number
    ) {
        this.team = team;
        team.players.push(this);
        this.ready = false;
        this.name = name;
        this.skin = skin;
        this.badge = badge;
        this.nameColor = nameColor;
    }

    sendMessage(message: CustomTeamMessage): void {
        this.socket.send(JSON.stringify(message));
    }
}

export interface CustomTeamPlayerContainer { player: CustomTeamPlayer }
