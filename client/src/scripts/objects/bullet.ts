import type { Game } from "../game";

import { type ObjectCategory } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type Vector } from "../../../../common/src/utils/vector";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { distance } from "../../../../common/src/utils/math";
import { Obstacle } from "./obstacle";
import { PIXI_SCALE } from "../utils/constants";
import { BaseBullet } from "../../../../common/src/utils/baseBullet";
import { Player } from "./player";

export class Bullet extends BaseBullet {
    readonly game: Game;
    readonly image: SuroiSprite;
    readonly maxLength: number;
    trailReachedMaxLength = false;
    trailTicks = 0;

    constructor(game: Game, source: ObjectType<ObjectCategory.Loot, GunDefinition>, position: Vector, rotation: number, shooterID: number, reflectionCount: number) {
        super(position, rotation, source, shooterID, reflectionCount);

        this.game = game;

        this.image = new SuroiSprite(`${this.source.definition.ammoType}_trail.svg`)
            .setRotation(rotation - Math.PI / 2)
            .setVPos(toPixiCoords(this.position));

        this.maxLength = this.image.width;

        this.image.scale.set(0, this.definition.tracerWidth ?? 1);

        this.image.anchor.set(1, 0.5);

        this.image.alpha = (this.definition.tracerOpacity ?? 1) / (reflectionCount + 1);

        this.game.bulletsContainer.addChild(this.image);
    }

    update(delta: number): void {
        if (!this.dead) {
            const collisions = this.updateAndGetCollisions(delta, this.game.objectsSet);

            for (const collision of collisions) {
                const object = collision.object;

                if (object instanceof Obstacle || object instanceof Player) {
                    object.hitEffect(collision.intersection.point, Math.atan2(collision.intersection.normal.y, collision.intersection.normal.x));
                }

                this.damagedIDs.add(object.id);
                if (object instanceof Obstacle && (object.type.definition.noCollisions)) continue;

                this.dead = true;
                this.position = collision.intersection.point;
                break;
            }

            if (!this.trailReachedMaxLength) this.trailTicks += delta;
        } else {
            this.trailTicks -= delta;
        }

        const dist = distance(this.initialPosition, this.position);

        const fadeDist = this.definition.speed * this.trailTicks;

        const length = Math.min(Math.min(fadeDist, dist) * PIXI_SCALE, this.maxLength);

        if (length === this.maxLength) this.trailReachedMaxLength = true;

        this.image.scale.x = length / this.maxLength;

        this.image.setVPos(toPixiCoords(this.position));

        if (this.trailTicks <= 0 && this.dead) {
            this.destroy();
        }
    }

    destroy(): void {
        this.image.destroy();
        this.game.bullets.delete(this);
    }
}
