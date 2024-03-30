import { TeamSize } from "../../common/src/constants";
import { type Vector } from "../../common/src/utils/vector";
import { Config } from "./config";
import { type Player } from "./objects/player";

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

export const teamMode = Config.maxTeamSize > TeamSize.Solo;
