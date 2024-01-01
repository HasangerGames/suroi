import { ObjectCategory } from "../../../common/src/constants";
import { type SyncedParticleDefinition } from "../../../common/src/definitions/syncedParticles";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { BaseGameObject } from "./gameObject";

export class SyncedParticle extends BaseGameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    alpha = 1;
    alphaActive = false;

    scale = 1;
    scaleActive = false;

    readonly definition: SyncedParticleDefinition;

    constructor(game: Game, definition: SyncedParticleDefinition, position: Vector) {
        super(game, position);
        this.definition = definition;
    }

    override damage(amount: number, source?: unknown): void {}

    override get data(): FullData<ObjectCategory.SyncedParticle> {
        const data: FullData<ObjectCategory.SyncedParticle> = {
            position: this.position,
            rotation: this.rotation,
            full: {
                definition: this.definition
            }
        };

        if (this.alphaActive) data.alpha = this.alpha;
        if (this.scaleActive) data.scale = this.scale;

        return data;
    }
}
