import { ObjectCategory } from "../../../../common/src/constants";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.SyncedParticle]) {
        super(game, id);

        this.updateFromData(data, true);
    }

    updateFromData(data: ObjectsNetData[ObjectCategory.SyncedParticle], isNew: boolean): void {
        throw new Error("Method not implemented.");
    }
}
