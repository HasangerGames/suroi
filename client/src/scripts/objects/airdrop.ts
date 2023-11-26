import { v, vAdd, vClone, type Vector, vMul } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";
import { type Game } from "../game";
import { lerp, vLerp } from "../../../../common/src/utils/math";
import { PIXI_SCALE } from "../utils/constants";
import { Ping } from "../rendering/minimap";
import { AIRDROP_FALL_TIME, AIRDROP_TOTAL_TIME, ZIndexes } from "../../../../common/src/constants";
import { type Sound } from "../utils/soundManager";

export class Airdrop {
    game: Game;

    startTime: number;

    position: Vector;

    plane: {
        startPosition: Vector
        endPosition: Vector
        image: SuroiSprite
        sound: Sound
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

        const startPosition = vAdd(this.position, v(Math.cos(direction + Math.PI) * 1620, Math.sin(direction + Math.PI) * 1620));
        const endPosition = vAdd(this.position, v(Math.cos(direction) * 1620, Math.sin(direction) * 1620));
        this.plane = {
            startPosition,
            endPosition,
            image: new SuroiSprite("airdrop_plane")
                .setZIndex(ZIndexes.Gas + 1)
                .setRotation(direction),
            sound: game.soundManager.play("airdrop_plane", startPosition, 0.5, 256, true)
        };

        this.parachute = {
            deployed: false,
            deployTime: -1,
            image: new SuroiSprite("airdrop_parachute")
                .setVPos(vMul(position, PIXI_SCALE))
                .setZIndex(ZIndexes.ObstaclesLayer5)
                .setVisible(false)
        };

        game.camera.addObject(this.plane.image, this.parachute.image);
    }

    update(): void {
        const now = Date.now();
        const timeElapsed = now - this.startTime;

        const position = this.plane.sound.position = vLerp(this.plane.startPosition, this.plane.endPosition, timeElapsed / AIRDROP_TOTAL_TIME);
        this.plane.image.setVPos(vMul(position, PIXI_SCALE));

        if (timeElapsed >= AIRDROP_TOTAL_TIME / 2) {
            if (!this.parachute.deployed) {
                this.parachute.deployed = true;
                this.parachute.deployTime = now;

                this.game.map.pings.add(new Ping(this.position));
                this.game.soundManager.play("airdrop_ping");

                this.parachute.image.setVisible(true);
                this.game.soundManager.play("airdrop_fall", this.position, 1, 256, true);
            }
            const parachuteTimeElapsed = now - this.parachute.deployTime;
            this.parachute.image.setScale(lerp(1, 0.5, parachuteTimeElapsed / AIRDROP_FALL_TIME));

            if (parachuteTimeElapsed >= AIRDROP_FALL_TIME) {
                this.game.soundManager.play(this.game.map.terrainGrid.getFloor(this.position) === "water" ? "airdrop_land_water" : "airdrop_land", this.position);
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
