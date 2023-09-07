import { KillFeedMessageType } from "../../../common/src/constants";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { GunItem } from "../inventory/gunItem";
import { MeleeItem } from "../inventory/meleeItem";
import { type Player } from "../objects/player";

export abstract class KillFeedMessage {
    readonly abstract type: KillFeedMessageType;
}

export class JoinKillFeedMessage extends KillFeedMessage {
    override readonly type = KillFeedMessageType.Join;
    readonly player: Player;
    readonly joined: boolean;

    constructor(player: Player, joined: boolean) {
        super();
        this.player = player;
        this.joined = joined;
    }
}

export class KillKillFeedMessage extends KillFeedMessage {
    override readonly type = KillFeedMessageType.Kill;
    readonly killed: Player;
    readonly killedBy?: Player | "gas";
    readonly weaponUsed?: GunItem | MeleeItem | ObjectType;
    readonly kills: number;

    constructor(killed: Player, killedBy?: Player | "gas", weaponUsed?: GunItem | MeleeItem | ObjectType) {
        super();
        this.killed = killed;
        this.killedBy = killedBy;
        this.weaponUsed = weaponUsed;
        this.kills = (weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem) && weaponUsed.definition.killstreak === true ? weaponUsed.stats.kills : 0;
    }
}
