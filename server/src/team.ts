import { TeamSize } from "../../common/src/constants";
import { random } from "../../common/src/utils/random";
import { type Vector } from "../../common/src/utils/vector";
import { Config } from "./config";
import { type Player } from "./objects/player";
import { type WebSocket } from "uWebSockets.js";
import { removeFrom } from "./utils/misc";
import { type CustomTeamMessage, CustomTeamMessageType } from "../../common/src/team";
import { customTeams, findGame } from "./server";

export const teamMode = Config.maxTeamSize > TeamSize.Solo;

export class Team {
    id: number;

    players: Player[] = [];

    spawnPoint?: Vector;

    kills = 0;

    autoFill: boolean;

    constructor(id: number, autoFill = true) {
        this.id = id;
        this.autoFill = autoFill;
    }

    setDirty(): void {
        for (const player of this.players) {
            player.dirty.teammates = true;
        }
    }
}

export class CustomTeam {
    private static readonly _idChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static readonly _idCharMax = this._idChars.length - 1;

    id: string;

    players: CustomTeamPlayer[] = [];

    autoFill = false;
    locked = false;

    constructor() {
        this.id = Array.from({ length: 4 }, () => CustomTeam._idChars.charAt(random(0, CustomTeam._idCharMax))).join("");
    }

    addPlayer(player: CustomTeamPlayer): void {
        player.sendMessage({
            type: CustomTeamMessageType.Join,
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
            type: CustomTeamMessageType.PlayerJoin,
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

        const newLeaderID = player.isLeader ? this.players[0].id : undefined;

        this._publishMessage({
            type: CustomTeamMessageType.PlayerLeave,
            id: player.id,
            newLeaderID
        });
    }

    onMessage(player: CustomTeamPlayer, message: CustomTeamMessage): void {
        switch (message.type) {
            case CustomTeamMessageType.Settings: {
                if (!player.isLeader) break; // Only leader can change settings

                if (message.autoFill !== undefined) this.autoFill = message.autoFill;
                if (message.locked !== undefined) this.locked = message.locked;

                this._publishMessage({
                    type: CustomTeamMessageType.Settings,
                    autoFill: this.autoFill,
                    locked: this.locked
                });
                break;
            }
            case CustomTeamMessageType.Start: {
                const result = findGame();
                if (result.success) {
                    this._publishMessage({
                        type: CustomTeamMessageType.Started,
                        gameID: result.gameID
                    });
                }
                break;
            }
        }
    }

    private _publishMessage(message: CustomTeamMessage, players?: CustomTeamPlayer[]): void {
        for (const player of players ?? this.players) {
            player.sendMessage(message);
        }
    }
}

export interface CustomTeamPlayerContainer { player: CustomTeamPlayer }

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
