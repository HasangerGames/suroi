import { KillFeedMessageType } from "../../../common/src/constants";
import { type ObjectType } from "../../../common/src/utils/objectType";

export abstract class KillFeedMessage {
    readonly abstract type: KillFeedMessageType;
}

export class JoinKillFeedMessage extends KillFeedMessage {
    override readonly type = KillFeedMessageType.Join;
    readonly name: string;
    readonly joined: boolean;

    constructor(name: string, joined: boolean) {
        super();
        this.name = name;
        this.joined = joined;
    }
}

export class KillKillFeedMessage extends KillFeedMessage {
    override readonly type = KillFeedMessageType.Kill;
    readonly killedName: string;
    readonly killedByName: string;
    readonly weaponUsed?: ObjectType;

    constructor(killedName: string, killedByName: string, weaponUsed?: ObjectType) {
        super();
        this.killedName = killedName;
        this.killedByName = killedByName;
        this.weaponUsed = weaponUsed;
    }
}
