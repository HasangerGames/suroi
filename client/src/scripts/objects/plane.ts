import { vAdd, type Vector, vMul } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";
import { type Game } from "../game";
import { distanceSquared, vLerp, velFromAngle } from "../../../../common/src/utils/math";
import { PIXI_SCALE } from "../utils/constants";
import { GameConstants, ZIndexes } from "../../../../common/src/constants";
import type { GameSound } from "../utils/soundManager";

export class Plane {
    game: Game;

    startPosition: Vector;
    endPosition: Vector;
    image: SuroiSprite;
    sound: GameSound;

    startTime = Date.now();

    static maxDistance = (GameConstants.maxPosition * 2) ** 2;

    constructor(game: Game, startPosition: Vector, direction: number) {
        this.game = game;

        this.startPosition = startPosition;

        this.endPosition = vAdd(
            this.startPosition,
            velFromAngle(direction, GameConstants.maxPosition * 2)
        );

        this.image = new SuroiSprite("airdrop_plane")
            .setZIndex(ZIndexes.Gas + 1)
            .setRotation(direction)
            .setScale(2);

        this.sound = game.soundManager.play("airdrop_plane", {
            position: startPosition,
            fallOff: 0.5,
            maxRange: 256,
            dynamic: true
        });

        game.camera.addObject(this.image);
    }

    update(): void {
        const now = Date.now();
        const timeElapsed = now - this.startTime;

        const position = this.sound.position = vLerp(
            this.startPosition,
            this.endPosition,
            timeElapsed / (GameConstants.airdrop.flyTime * 2)
        );

        this.image.setVPos(vMul(position, PIXI_SCALE));

        if (distanceSquared(position, this.startPosition) > Plane.maxDistance) {
            this.destroy();
            this.game.planes.delete(this);
        }
    }

    destroy(): void {
        this.image.destroy();
    }
}
