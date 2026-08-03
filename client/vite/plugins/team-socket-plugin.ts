import type { Plugin, ViteDevServer } from "vite";
import WebSocket, { WebSocketServer } from "ws";
import { GameConstants } from "../../../common/src/constants";
import { Badges } from "../../../common/src/definitions/badges";
import { Skins } from "../../../common/src/definitions/items/skins";
import { type CustomTeamMessage, CustomTeamMessages, type CustomTeamPlayerInfo } from "../../../common/src/typings";
import { Numeric } from "../../../common/src/utils/math";
import { removeFrom } from "../../../common/src/utils/misc";
import { randomId } from "../../../common/src/utils/random";

export class CustomTeam {
    readonly id: string;

    readonly players: CustomTeamPlayer[] = [];

    autoFill = false;
    forceStart = false;

    gameId?: string;

    keepAliveInterval?: NodeJS.Timeout;

    constructor() {
        this.id = randomId(4);

        // Send a keep alive message every minute so the WebSocket connection isn't terminated
        this.keepAliveInterval = setInterval(() => {
            this._publishMessage({ type: CustomTeamMessages.KeepAlive });
        }, 60000);
    }

    addPlayer(player: CustomTeamPlayer): void {
        this.players.push(player);
        player.sendMessage({
            type: CustomTeamMessages.Join,
            teamId: this.id,
            isLeader: player.isLeader,
            autoFill: this.autoFill,
            forceStart: this.forceStart,
            gameId: this.gameId
        });
        this._publishPlayerUpdate();
    }

    removePlayer(player: CustomTeamPlayer): void {
        removeFrom(this.players, player);

        if (!this.players.length) {
            clearInterval(this.keepAliveInterval);
            return;
        }

        this._publishPlayerUpdate();
    }

    onMessage(player: CustomTeamPlayer, message: CustomTeamMessage): void {
        if (!message) return;

        switch (message.type) {
            case CustomTeamMessages.Settings: {
                if (!player.isLeader) break; // Only leader can change settings

                if (message.autoFill !== undefined) {
                    this.autoFill = message.autoFill;
                }
                if (message.forceStart !== undefined) {
                    this.forceStart = player.ready = message.forceStart;
                    this._publishPlayerUpdate();
                }
                if (message.gameId !== undefined) {
                    this.gameId = message.gameId;
                }

                this._publishMessage({
                    type: CustomTeamMessages.Settings,
                    autoFill: this.autoFill,
                    forceStart: this.forceStart,
                    gameId: this.gameId,
                });
                break;
            }
            case CustomTeamMessages.KickPlayer: {
                if (!player.isLeader) break;

                const id = message.id;
                const toRemove = this.players[id];
                if (!toRemove || toRemove.isLeader) break;

                toRemove.socket?.close(1000, "kicked");
                this.players.splice(id, 1);
                this._publishPlayerUpdate();
                break;
            }
            case CustomTeamMessages.Start: {
                if (player.isLeader && this.forceStart) {
                    this._startGame();
                } else {
                    player.ready = !player.ready;
                    if (this.players.every(p => p.ready)) {
                        this._startGame();
                    }
                }
                this._publishPlayerUpdate();
                break;
            }
        }
    }

    private _startGame(): void {
        if (this.gameId === undefined) return;

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

        for (let id = 0, len = this.players.length; id < len; id++) {
            // Make a copy of the players array with the current player removed
            const playersCloned = players.slice();
            playersCloned.splice(id, 1);

            const player = this.players[id];
            player.sendMessage({
                type: CustomTeamMessages.Update,
                players: playersCloned,
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
    get id(): number { return this.team.players.indexOf(this); }
    get isLeader(): boolean { return this.id === 0; }
    ready = false;

    constructor(
        // readonly ip: string,
        readonly socket: WebSocket,
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

const customTeams = new Map<string, CustomTeam>();

export function teamSocket(): Plugin {
    return {
        name: "team-socket-plugin",
        configureServer(server: ViteDevServer) {
            if (!server.httpServer) {
                throw new Error("Unable to initialize team socket: HTTP server not available");
            }

            const webSocketServer = new WebSocketServer({ noServer: true });

            server.httpServer?.on("upgrade", (request, socket, head) => {
                if (!request.url?.startsWith("/team")) return;
                webSocketServer.handleUpgrade(request, socket, head, ws => {
                    webSocketServer.emit("connection", ws, request);
                });
            });

            // TODO:
            // - Validate name, skin, & badge
            // - Limit number of teams per IP

            webSocketServer.on("connection", (socket, request) => {
                if (!request.url) { // this should never happen but we handle it anyway
                    socket.close();
                    return;
                }

                // Get team
                const searchParams = new URLSearchParams(request.url.slice(request.url.indexOf("?")));
                const teamId = searchParams.get("teamId");
                let team: CustomTeam;
                if (teamId !== null) {
                    const givenTeam = customTeams?.get(teamId);
                    if (givenTeam === undefined) {
                        console.log("invalid id");
                        socket.close(1008, "invalid_id");
                        return;
                    }
                    if (givenTeam.players.length >= 4) {
                        socket.close(1008, "full");
                        return;
                    }
                    team = givenTeam;
                } else {
                    team = new CustomTeam();
                    customTeams?.set(team.id, team);
                }

                // Get name, skin, badge, & role
                // const name = punishmentMessage === "noname" ? GameConstants.player.defaultName : cleanUsername(searchParams.get("name"));
                const name = searchParams.get("name") ?? GameConstants.player.defaultName;
                let skin = searchParams.get("skin") ?? GameConstants.player.defaultSkin;
                let badge = searchParams.get("badge") ?? undefined;
                // const { role = "", nameColor } = parseRole(searchParams);
                let nameColor: number | undefined;
                try {
                    const colorString = searchParams.get("nameColor");
                    if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
                } catch { /* guess your color sucks lol */ }

                // Validate skin
                const skinDefinition = Skins.fromStringSafe(skin);
                // const rolesRequired = skinDefinition?.rolesRequired;
                if (!skinDefinition/* || (rolesRequired && !rolesRequired.includes(role))*/) {
                    skin = GameConstants.player.defaultSkin;
                }

                // Validate badge
                const badgeDefinition = badge ? Badges.fromStringSafe(badge) : undefined;
                if (!badgeDefinition/* || (badgeDefinition.roles && !badgeDefinition.roles.includes(role))*/) {
                    badge = undefined;
                }

                const player = new CustomTeamPlayer(socket, team, name, skin, badge, nameColor);
                team.addPlayer(player);

                socket.on("message", (data) => {
                    team.onMessage(player, JSON.parse(String(data)) as CustomTeamMessage);
                });

                socket.on("close", () => {
                    team.removePlayer(player);
                    if (team.players.length === 0) {
                        customTeams.delete(team.id);
                    }
                });
            });
        }
    };
}
