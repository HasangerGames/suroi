import { GameConstants, ObjectCategory, ZIndexes } from "../../../../common/src/constants.js";
import { lerp } from "../../../../common/src/utils/math.js";
import type { ObjectsNetData } from "../../../../common/src/utils/objectsSerializations.js";
import { randomFloat, randomPointInsideCircle } from "../../../../common/src/utils/random.js";
import { FloorTypes } from "../../../../common/src/utils/terrain.js";
import { v, type Vector } from "../../../../common/src/utils/vector.js";
import type { Game } from "../game.js";
import { GameObject } from "./gameObject.js";
import { SuroiSprite, toPixiCoords } from "../utils/pixi.js";
import type { GameSound } from "../utils/soundManager.js";
import { Tween } from "../utils/tween.js";

export class Parachute extends GameObject<ObjectCategory.Parachute> {
    override readonly type = ObjectCategory.Parachute;

    image = new SuroiSprite("airdrop_parachute");

    scaleAnim?: Tween<Vector>;

    fallSound!: GameSound;

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
            this.fallSound = this.playSound("airdrop_fall", {
                fallOff: 1,
                maxRange: 128,
                dynamic: true
            });
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
            this.playSound(this.game.map.terrain.getFloor(this.position) === "water" ? "airdrop_land_water" : "airdrop_land");

            const floor = this.game.map.terrain.getFloor(this.position);

            if (FloorTypes[floor].particles) {
                this.game.particleManager.spawnParticles(6, () => ({
                    frames: "ripple_particle",
                    zIndex: ZIndexes.Ground,
                    position: randomPointInsideCircle(this.position, 6),
                    lifetime: 1000,
                    speed: v(0, 0),
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
        this.scaleAnim?.kill();
        this.fallSound?.stop();
    }
}
