import { BaseBullet, type BulletOptions } from "../../../../common/src/utils/baseBullet";
import { distance } from "../../../../common/src/utils/math";
import { type Game } from "../game";
import { BULLET_COLORS, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

export class Bullet extends BaseBullet {
    readonly game: Game;
    readonly image: SuroiSprite;
    readonly maxLength: number;
    readonly tracerLength: number;
    trailReachedMaxLength = false;
    trailTicks = 0;

    constructor(game: Game, options: BulletOptions) {
        super(options);

        this.game = game;

        this.image = new SuroiSprite(this.definition.tracerImage ?? "base_trail")
            .setRotation(this.rotation - Math.PI / 2)
            .setVPos(toPixiCoords(this.position));

        this.tracerLength = this.definition.tracerLength ?? 1;
        this.maxLength = this.image.width * this.tracerLength;
        this.image.scale.set(0, this.definition.tracerWidth ?? 1);
        this.image.anchor.set(1, 0.5);
        this.image.alpha = (this.definition.tracerOpacity ?? 1) / (this.reflectionCount + 1);

        let tint = 0xffffff;

        const source = this.source;
        if (
            "ammoType" in source &&
            source.ammoType in BULLET_COLORS
        ) {
            tint = BULLET_COLORS[source.ammoType];
        }

        if (this.definition.shrapnel) tint = BULLET_COLORS.shrapnel;
        if (this.definition.tracerColor) tint = this.definition.tracerColor;

        this.image.tint = tint;

        this.game.bulletsContainer.addChild(this.image);
    }

    update(delta: number): void {
        if (!this.dead) {
            const collisions = this.updateAndGetCollisions(delta, this.game.objects);

            for (const collision of collisions) {
                const object = collision.object;

                if (object instanceof Obstacle || object instanceof Player) {
                    object.hitEffect(collision.intersection.point, Math.atan2(collision.intersection.normal.y, collision.intersection.normal.x));
                }

                this.damagedIDs.add(object.id);

                if (object instanceof Obstacle) {
                    if (
                        (this.definition.penetration?.obstacles && !object.definition.impenetrable) ??
                        object.definition.noCollisions
                    ) continue;
                }
                if (this.definition.penetration?.players && object instanceof Player) continue;

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

        this.image.width = length;

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
