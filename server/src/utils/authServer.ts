import { TeamSize } from "@common/constants";
import { Config } from "../config";
import { Game } from "../game";

/**
 * Attached to a Game instance
 *
 * Handles auth and stats for the game
 */
export class AuthServer {
    private _gameId?: string;

    // Non null is asserted in server.ts
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    private readonly _apiKey = process.env.AUTH_SERVER_API_KEY!;

    constructor(public readonly game: Game) {}

    async startGame(): Promise<void> {
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

        this._gameId = (
            await res.json() as { readonly gameId: string }
            //              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ unsafe
        ).gameId;
    }

    async fetchUser(token: string): Promise<{ readonly id: number, readonly role: string } | undefined | null> {
        if (!Config.authServer) return;

        // Fetch user
        const res = await fetch(`${Config.authServer.address}/auth/server/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Api-Key": this._apiKey
            },
            body: JSON.stringify({
                cookie: token
            })
        });

        if (res.status !== 200) return null;

        const data = await res.json() as {
            readonly user: {
                readonly id: number
                readonly role: string
            }
        };

        return {
            id: data.user.id,
            role: data.user.role
        };
    }
}
