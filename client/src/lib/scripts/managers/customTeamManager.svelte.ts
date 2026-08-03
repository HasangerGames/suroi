import { Color } from "pixi.js";
import { type CustomTeamMessage, CustomTeamMessages, type CustomTeamPlayerInfo } from "$common/typings";
import { m } from "$lib/paraglide/messages";
import { MenuUi } from "../../../routes/+page.svelte";
import { LegacyBridge } from "../utils/legacyBridge";

export const CustomTeamManager = new (class CustomTeamManager {
    socket?: WebSocket;

    teamId = $state<string>();

    isLeader = $state(false);
    ready = $state(false);

    private _autoFill = $state(false);
    get autoFill(): boolean { return this._autoFill; }
    set autoFill(autoFill: boolean) {
        this._autoFill = autoFill;
        this.sendMessage({ type: CustomTeamMessages.Settings, autoFill });
    }

    private _forceStart = $state(false);
    get forceStart(): boolean { return this._forceStart; }
    set forceStart(forceStart: boolean) {
        this._forceStart = forceStart;
        this.sendMessage({ type: CustomTeamMessages.Settings, forceStart });
    }

    players = $state<CustomTeamPlayerInfo[]>([]);

    joinTeam(): void {
        let teamId = prompt(m.msg_enter_team_code());

        // Handle dialog cancel
        if (teamId === null) return;

        // Ensure links (e.g. https://suroi.io/#abcd) are parsed correctly
        if (teamId.includes("#")) {
            teamId = teamId.split("#")[1];
        }

        if (/^[a-z0-9]{4}$/.test(teamId)) {
            this.connect(teamId);
        } else {
            alert("Invalid team code.");
        }
    }

    connect(teamId?: string): void {
        if (this.socket !== undefined) return;

        this.teamId = teamId;

        const params = new URLSearchParams();

        if (teamId !== undefined) {
            params.set("teamId", teamId);
        }

        params.set("name", LegacyBridge.getBuiltInCVar("cv_player_name"));
        params.set("skin", LegacyBridge.getBuiltInCVar("cv_loadout_skin"));

        const badge = LegacyBridge.getBuiltInCVar("cv_loadout_badge");
        if (badge) params.set("badge", badge);

        const devPass = LegacyBridge.getBuiltInCVar("dv_password");
        if (devPass) params.set("password", devPass);

        const role = LegacyBridge.getBuiltInCVar("dv_role");
        if (role) params.set("role", role);

        const nameColor = LegacyBridge.getBuiltInCVar("dv_name_color");
        if (nameColor) {
            try {
                params.set("nameColor", new Color(nameColor).toNumber().toString());
            } catch (e) {
                LegacyBridge.setBuiltInCVar("dv_name_color", "");
                console.error(e);
            }
        }

        this.socket = new WebSocket(`${window.location.origin.replace("http", "ws")}/team?${params.toString()}`);
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onerror = this.onError.bind(this);
        this.socket.onclose = this.onClose.bind(this);
    }

    onMessage(message: MessageEvent<string>): void {
        const data = JSON.parse(message.data) as CustomTeamMessage;
        switch (data.type) {
            case CustomTeamMessages.Join: {
                this.teamId = data.teamId;
                this.isLeader = data.isLeader;
                this.ready = false;
                this._autoFill = data.autoFill;
                this._forceStart = data.forceStart;
                window.location.hash = `#${this.teamId}`;
                break;
            }
            case CustomTeamMessages.Update: {
                this.players = data.players;
                this.isLeader = data.isLeader;
                this.ready = data.ready;
                // ui.createTeamPlayers.html(
                //     players.map(
                //         ({
                //             id,
                //             isLeader,
                //             ready,
                //             name,
                //             skin,
                //             badge,
                //             nameColor
                //         }: CustomTeamPlayerInfo): string => `
                //             <div class="create-team-player-container" data-id="${id}">
                //                 ${ready ? '<i class="fa-regular fa-circle-check"></i>' : ""}
                //                 ${playerIsLeader || isLeader ? `<i class="fa-solid ${isLeader ? "fa-crown" : "fa-xmark"}"></i>` : ""}
                //                 ${renderSkin(skin)}
                //                 <div class="create-team-player-name-container">
                //                     <span class="create-team-player-name"${nameColor ? ` style="color: ${new Color(nameColor).toHex()}"` : ""}>${name}</span>
                //                     ${badge ? `<img class="create-team-player-badge" draggable="false" src="./img/game/${isEmoteBadge(badge) ? "emotes" : "badges"}/${getBadgeIdString(badge)}.svg" />` : ""}
                //                 </div>
                //             </div>
                //             `
                //     ).join("")
                // );
                // $("#create-team-players .fa-xmark").off().on("click", function() {
                //     this.socket?.send(JSON.stringify({
                //         type: CustomTeamMessages.KickPlayer,
                //         playerId: parseInt($(this).parent().attr("data-id") ?? "-1")
                //     }));
                // });
                break;
            }
            case CustomTeamMessages.Settings: {
                if (data.autoFill !== undefined) {
                    this._autoFill = data.autoFill;
                }
                if (data.forceStart !== undefined) {
                    this._forceStart = data.forceStart;
                }
                if (data.gameId !== undefined) {
                    MenuUi.selectedGameId = data.gameId;
                }
                break;
            }
            case CustomTeamMessages.Started: {
                void LegacyBridge.play();
                break;
            }
        }
    }

    onError(): void {
        MenuUi.serverError = m.error_joining_team();
    }

    onClose(e: CloseEvent): void {
        // The socket is set to undefined when the Leave Team button is clicked
        // If it's not undefined, the socket was closed by other means, so show an error message
        if (this.socket !== undefined) {
            switch (e.reason) {
                case "invalid_id":
                    MenuUi.serverError = m.error_team_not_found();
                    break;
                case "full":
                    MenuUi.serverError = m.error_team_full();
                    break;
                case "kicked":
                    MenuUi.serverError = m.error_kicked_team();
                    break;
                default:
                    if (this.teamId !== undefined) {
                        MenuUi.serverError = m.error_lost_team_connection();
                    } else {
                        MenuUi.serverError = m.error_joining_team();
                    }
                    break;
            }
        }
        this.leaveTeam();
    }

    sendMessage(message: CustomTeamMessage): void {
        this.socket?.send(JSON.stringify(message));
    }

    async copyTeamLinkToClipboard(): Promise<void> {
        if (this.teamId === undefined) return;

        const link = `${window.location.origin}/#${this.teamId}`;
        try {
            await navigator.clipboard.writeText(link);
            alert(m.link_copied());
        } catch (e) {
            console.error(e);
            alert(m.link_copy_failed({ link }));
        }
    }

    leaveTeam(): void {
        this.socket?.close();
        this.socket = undefined;
        this.teamId = undefined;
        this.isLeader = false;
        this.ready = false;
        this.players.length = 0;
        window.location.hash = "";
    }
})();
