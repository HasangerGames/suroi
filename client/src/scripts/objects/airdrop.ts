import { v, vAdd, vClone, type Vector, vMul } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";
import { type Game } from "../game";
import { lerp, vLerp } from "../../../../common/src/utils/math";
import { PIXI_SCALE } from "../utils/constants";
import { Ping } from "../rendering/minimap";

const PLANE_TIME = 2000;
const FALL_TIME = 8000;

export class Airdrop {
    game: Game;

    startTime: number;

    position: Vector;

    plane: {
        startPosition: Vector
        endPosition: Vector
        image: SuroiSprite
    };

    parachute: {
        deployed: boolean
        deployTime: number
        image: SuroiSprite
    };

    constructor(game: Game, position: Vector, direction: number) {
        this.game = game;
        this.startTime = Date.now();

        this.position = vClone(position);
        position = vMul(position, PIXI_SCALE);

        this.plane = {
            startPosition: vAdd(position, v(Math.cos(direction + Math.PI) * 50000, Math.sin(direction + Math.PI) * 50000)),
            endPosition: vAdd(position, v(Math.cos(direction) * 50000, Math.sin(direction) * 50000)),
            image: new SuroiSprite("airdrop_plane")
                .setZIndex(98)
                .setRotation(direction)
        };

        this.parachute = {
            deployed: false,
            deployTime: -1,
            image: new SuroiSprite("airdrop_parachute")
                .setVPos(position)
                .setZIndex(97)
                .setVisible(false)
        };

        game.camera.addObject(this.plane.image, this.parachute.image);
    }

    update(): void {
        const now = Date.now();
        const timeElapsed = now - this.startTime;

        this.plane.image.setVPos(vLerp(this.plane.startPosition, this.plane.endPosition, timeElapsed / PLANE_TIME));

        if (timeElapsed >= PLANE_TIME / 2) {
            if (!this.parachute.deployed) {
                this.parachute.deployed = true;
                this.parachute.deployTime = now;

                this.game.map.pings.add(new Ping(this.position));
                this.game.soundManager.play("airdrop_ping");

                this.parachute.image.setVisible(true);
                this.game.soundManager.play("airdrop_fall", this.position);
            }
            const parachuteTimeElapsed = now - this.parachute.deployTime;
            this.parachute.image.setScale(lerp(1, 0.5, parachuteTimeElapsed / FALL_TIME));

            if (parachuteTimeElapsed >= FALL_TIME) {
                this.game.soundManager.play("airdrop_land", this.position);
                this.destroy();
                this.game.airdrops.delete(this);
            }
        }
    }

    destroy(): void {
        this.plane.image.destroy();
        this.parachute.image.destroy();
    }
}
