import { TeamSize } from "../../common/src/constants";
import { Config } from "./config";
import { type Player } from "./objects/player";

export class Team {
    id: number;
    leader: Player;
    players: Player[];
    kills = 0;

    constructor(id: number, leader: Player) {
        this.id = id;
        this.leader = leader;
        this.players = [leader];
    }

    setDirty(): void {
        for (const player of this.players) {
            player.dirty.teammates = true;
        }
    }
}

export const teamMode = Config.maxTeamSize > TeamSize.Solo;
