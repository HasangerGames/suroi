import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    readonly image = new SuroiSprite();

    private _alpha = 1;
    private _scale = 1;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.SyncedParticle]) {
        super(game, id);

        this.container.addChild(this.image);
        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.SyncedParticle], isNew = false): void {
        const full = data.full;
        if (full) {
            const { variant, definition } = full;

            this.image.setFrame(`${definition.idString}${variant !== undefined ? `_${variant}` : ""}`);
            this.container.zIndex = definition.zIndex ?? ZIndexes.ObstaclesLayer1;
        }

        console.log(data.rotation);

        this.position = data.position;
        this.rotation = data.rotation;

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
            this.container.rotation = this.rotation;
        }

        this.container.alpha = this._alpha = data.alpha ?? this._alpha;
        this.container.scale.set(this._scale = data.scale ?? this._scale);
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
