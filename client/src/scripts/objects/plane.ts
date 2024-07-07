import { GameConstants, ZIndexes } from "../../../../common/src/constants";
import { Geometry } from "../../../../common/src/utils/math";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { PIXI_SCALE } from "../utils/constants";
import { SuroiSprite } from "../utils/pixi";

export class Plane {
    readonly game: Game;

    readonly startPosition: Vector;
    readonly endPosition: Vector;
    readonly image: SuroiSprite;
    readonly sound: GameSound;

    readonly startTime = Date.now();

    static readonly maxDistanceSquared = (GameConstants.maxPosition * 2) ** 2;

    constructor(game: Game, startPosition: Vector, direction: number) {
        this.game = game;

        this.startPosition = startPosition;

        this.endPosition = Vec.add(
            this.startPosition,
            Vec.fromPolar(direction, GameConstants.maxPosition * 2)
        );

        this.image = new SuroiSprite("airdrop_plane")
            .setZIndex(ZIndexes.Gas + 1)
            .setRotation(direction)
            .setScale(4);

        this.sound = game.soundManager.play(
            "airdrop_plane",
            {
                position: startPosition,
                falloff: 0.5,
                maxRange: 256,
                dynamic: true
            }
        );

        game.camera.addObject(this.image);
    }

    update(): void {
        const position = this.sound.position = Vec.lerp(
            this.startPosition,
            this.endPosition,
            (Date.now() - this.startTime) / (GameConstants.airdrop.flyTime * 2)
        );

        this.image.setVPos(Vec.scale(position, PIXI_SCALE));

        if (Geometry.distanceSquared(position, this.startPosition) > Plane.maxDistanceSquared) {
            this.destroy();
            this.game.planes.delete(this);
        }
    }

    destroy(): void {
        this.image.destroy();
    }
}
