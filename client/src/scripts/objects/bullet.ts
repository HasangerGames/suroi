import type { Game } from "../game";

import { type ObjectCategory } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type Vector, vAdd, v, vClone, vMul } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";
import { distance } from "../../../../common/src/utils/math";

export class Bullet {
    game: Game;
    image: SuroiSprite;

    source: ObjectType<ObjectCategory.Loot, GunDefinition>;

    initialPosition: Vector;
    position: Vector;
    finalPosition: Vector;

    maxLength: number;

    tracerLength: number;

    speed: Vector;

    id: number;

    dead = false;

    trailTicks = 0;

    constructor(game: Game, id: number, source: ObjectType<ObjectCategory.Loot, GunDefinition>, position: Vector, rotation: number) {
        this.game = game;

        this.id = id;

        this.source = source;
        const ballistics = this.source.definition.ballistics;

        this.initialPosition = position;

        this.position = vClone(this.initialPosition);

        this.speed = vMul(v(Math.sin(rotation), -Math.cos(rotation)), ballistics.speed);

        const maxDist = ballistics.maxDistance;

        this.finalPosition = vAdd(this.initialPosition, vMul(this.speed, maxDist));

        this.image = new SuroiSprite(`${this.source.definition.ammoType}_trail.svg`)
            .setRotation(rotation - Math.PI / 2).setDepth(3)
            .setPos(this.initialPosition.x * 20, this.initialPosition.y * 20);

        this.tracerLength = this.source.definition.ballistics.tracerLength ?? 1;

        this.maxLength = this.image.width * (this.tracerLength);

        this.image.scale.set(0, ballistics.tracerWidth ?? 1);

        this.image.anchor.set(1, 0.5);

        this.image.alpha = ballistics.tracerOpacity?.start ?? 1;

        this.game.camera.container.addChild(this.image);
    }

    update(delta: number): void {
        if (this.dead) this.trailTicks -= delta;
        else {
            this.trailTicks += delta;
            this.position = vAdd(this.position, vMul(this.speed, delta));
        }

        const fadeDist = distance(this.initialPosition, vAdd(this.initialPosition, vMul(this.speed, this.trailTicks)));

        const length = Math.min(fadeDist * 20 * this.tracerLength, this.maxLength);

        const scale = length / this.maxLength;

        this.image.scale.x = scale;

        this.image.setPos(this.position.x * 20, this.position.y * 20);

        const dist = distance(this.initialPosition, this.position);

        if (dist > this.source.definition.ballistics.maxDistance) {
            this.dead = true;
        }

        if (this.trailTicks <= 0 && this.dead) {
            this.destroy();
        }
    }

    destroy(): void {
        this.image.destroy();
        this.game.bullets.delete(this.id);
    }
}
