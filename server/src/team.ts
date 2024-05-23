import { type WebSocket } from "uWebSockets.js";
import { CustomTeamMessages, type CustomTeamMessage } from "../../common/src/typings";
import { random } from "../../common/src/utils/random";
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
        this._indexMapping.set(player, this._players.push(player) - 1);
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
            }
        }

        return exists;
    }

    setDirty(): void {
        for (const player of this.players) {
            player.dirty.teammates = true;
        }
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

    constructor() {
        this.id = Array.from({ length: 4 }, () => CustomTeam._idChars.charAt(random(0, CustomTeam._idCharMax))).join("");
    }

    addPlayer(player: CustomTeamPlayer): void {
        player.sendMessage({
            type: CustomTeamMessages.Join,
            id: player.id,
            teamID: this.id,
            isLeader: player.isLeader,
            autoFill: this.autoFill,
            locked: this.locked,
            players: this.players.map(p => ({
                id: p.id,
                isLeader: p.isLeader,
                name: p.name,
                skin: p.skin,
                badge: p.badge,
                nameColor: p.nameColor
            }))
        });

        this._publishMessage({
            type: CustomTeamMessages.PlayerJoin,
            id: player.id,
            isLeader: player.isLeader,
            name: player.name,
            skin: player.skin,
            badge: player.badge,
            nameColor: player.nameColor
        }, this.players.filter(p => p !== player));
    }

    removePlayer(player: CustomTeamPlayer): void {
        removeFrom(this.players, player);

        if (!this.players.length) {
            customTeams.delete(this.id);
            return;
        }

        let newLeaderID: number | undefined;
        if (player.isLeader) {
            const newLeader = this.players[0];
            newLeader.isLeader = true;
            newLeaderID = newLeader.id;
        }

        this._publishMessage({
            type: CustomTeamMessages.PlayerLeave,
            id: player.id,
            newLeaderID
        });
    }

    async onMessage(player: CustomTeamPlayer, message: CustomTeamMessage): Promise<void> {
        if (!player.isLeader) return; // Only leader can change settings or start game

        switch (message.type) {
            case CustomTeamMessages.Settings: {
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
                const result = findGame();
                if (result.success) {
                    this.gameID = result.gameID;
                    this._publishMessage({ type: CustomTeamMessages.Started });
                }
                break;
            }
        }
    }

    private _publishMessage(message: CustomTeamMessage, players: CustomTeamPlayer[] = this.players): void {
        for (const player of players) {
            player.sendMessage(message);
        }
    }
}

export class CustomTeamPlayer {
    socket!: WebSocket<CustomTeamPlayerContainer>;
    team: CustomTeam;
    id: number;
    isLeader: boolean;
    name: string;
    skin: string;
    badge?: string;
    nameColor?: number;

    constructor(
        team: CustomTeam,
        isLeader: boolean,
        name: string,
        skin: string,
        badge?: string,
        nameColor?: number
    ) {
        this.team = team;
        team.players.push(this);
        this.id = team.players.indexOf(this);
        this.isLeader = isLeader;
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
