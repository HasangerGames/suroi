import { TeamSize } from "../../common/src/constants";
import { type Vector } from "../../common/src/utils/vector";
import { Config } from "./config";
import { type Player } from "./objects/player";

export class Team {
    readonly id: number;

    private readonly _players: Player[] = [];
    get players(): readonly Player[] { return this._players; }

    readonly _indexMapping = new Map<Player, number>();

    spawnPoint?: Vector;

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
}

export const teamMode = Config.maxTeamSize > TeamSize.Solo;
