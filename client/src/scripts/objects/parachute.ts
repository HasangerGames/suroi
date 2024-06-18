import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { Numeric } from "../../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomFloat, randomPointInsideCircle } from "../../../../common/src/utils/random";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";

export class Parachute extends GameObject<ObjectCategory.Parachute> {
    override readonly type = ObjectCategory.Parachute;

    private readonly image = new SuroiSprite("airdrop_parachute");

    private scaleAnim?: Tween<Vector>;

    private fallSound?: GameSound;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Parachute]) {
        super(game, id);

        this.container.addChild(this.image);
        this.container.zIndex = ZIndexes.ObstaclesLayer5;

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Parachute], isNew = false): void {
        if (data.full) {
            this.position = data.full.position;
            this.container.position = toPixiCoords(this.position);
            this.fallSound = this.playSound(
                "airdrop_fall",
                {
                    falloff: 1,
                    maxRange: 128,
                    dynamic: true
                }
            );
        }

        const scale = Numeric.lerp(0.5, 1, data.height);
        if (isNew) {
            this.container.scale.set(scale);
        } else {
            this.scaleAnim?.kill();
            this.scaleAnim = this.game.addTween({
                target: this.container.scale,
                to: {
                    x: scale,
                    y: scale
                },
                duration: this.game.serverDt,
                onComplete: () => {
                    this.scaleAnim = undefined;
                }
            });
        }

        if (data.height === 0) {
            this.playSound(this.game.map.terrain.getFloor(this.position) === "water" ? "airdrop_land_water" : "airdrop_land");

            const floor = this.game.map.terrain.getFloor(this.position);

            if (FloorTypes[floor].particles) {
                this.game.particleManager.spawnParticles(6, () => ({
                    frames: "ripple_particle",
                    zIndex: ZIndexes.Ground,
                    position: randomPointInsideCircle(this.position, 6),
                    lifetime: 1000,
                    speed: Vec.create(0, 0),
                    scale: {
                        start: randomFloat(0.45, 0.55),
                        end: randomFloat(2.95, 3.05)
                    },
                    alpha: {
                        start: randomFloat(0.55, 0.65),
                        end: 0
                    }
                }));
            }
        }
    }

    destroy(): void {
        super.destroy();

        this.image.destroy();
        this.scaleAnim?.kill();
        this.fallSound?.stop();
    }
}
