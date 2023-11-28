import { GameConstants, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { lerp } from "../../../../common/src/utils/math";
import type { ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import type { Vector } from "../../../../common/src/utils/vector";
import type { Game } from "../game";
import { GameObject } from "../types/gameObject";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import type { Sound } from "../utils/soundManager";
import { Tween } from "../utils/tween";

export class Parachute extends GameObject<ObjectCategory.Parachute> {
    override readonly type = ObjectCategory.Parachute;

    image = new SuroiSprite("airdrop_parachute");

    scaleAnim?: Tween<Vector>;

    fallSound!: Sound;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Parachute]>) {
        super(game, id);

        this.container.addChild(this.image);
        this.container.zIndex = ZIndexes.ObstaclesLayer5;

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Parachute], isNew = false): void {
        if (data.full) {
            this.position = data.full.position;
            this.container.position = toPixiCoords(this.position);
            this.fallSound = this.playSound("airdrop_fall", 1, 128, true);
        }

        const scale = lerp(0.5, 1, data.height);
        if (isNew) {
            this.container.scale.set(scale);
        } else {
            this.scaleAnim?.kill();
            this.scaleAnim = new Tween(this.game, {
                target: this.container.scale,
                to: {
                    x: scale,
                    y: scale
                },
                duration: GameConstants.tps
            });
        }

        if (data.height === 0) {
            this.playSound(this.game.map.terrainGrid.getFloor(this.position) === "water" ? "airdrop_land_water" : "airdrop_land");
        }
    }

    destroy(): void {
        super.destroy();
        this.scaleAnim?.kill();
        this.game.soundManager.stop(this.fallSound);
    }
}
