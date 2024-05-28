import { TeamSize } from "../../../common/src/constants";
import { Config } from "../config";
import { Game } from "../game";

/**
 * Attached to a Game instance
 * 
 * Handles auth and stats for the game
 */
export default class AuthServer {
    gameId?: string
    
    // Non null is asserted in server.ts
    private readonly _apiKey = process.env.AUTH_SERVER_API_KEY!;

    constructor(public game: Game) {
    }

    async startGame() {
        if (!Config.authServer) return;

        // Notify auth server
        const res = await fetch(`${Config.authServer.address}/game`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Api-Key": this._apiKey
            },
            body: JSON.stringify({
                createdAt: new Date(this.game.startedTime),
                mode: TeamSize[this.game.maxTeamSize],
                region: process.env.REGION
            })
        });

        if (res.status !== 200) {
            throw new Error("Failed to start game on auth server");
        }

        const data = await res.json();

        this.gameId = data.gameId;
    }

    async fetchUser(token: string) {
        if (!Config.authServer) return;
        
        // Fetch user
        const res = await fetch(`${Config.authServer.address}/auth/server/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Api-Key": this._apiKey,
            },
            body: JSON.stringify({
                cookie: token
            })
        });

        if (res.status !== 200) return null;

        const data = await res.json()
        return {
            id: data.user.id,
            role: data.user.role,
        }
    }
}

