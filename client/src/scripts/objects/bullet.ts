import { Color } from "pixi.js";
import { BaseBullet, type BulletOptions } from "../../../../common/src/utils/baseBullet";
import { distance } from "../../../../common/src/utils/math";
import { type Game } from "../game";
import { MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { Obstacle } from "./obstacle";
import { Player } from "./player";
import { ZIndexes } from "../../../../common/src/constants";

export class Bullet extends BaseBullet {
    readonly game: Game;
    readonly image: SuroiSprite;
    readonly maxLength: number;
    readonly tracerLength: number;
    private _trailReachedMaxLength = false;
    private _trailTicks = 0;

    constructor(game: Game, options: BulletOptions) {
        super(options);

        this.game = game;

        const tracerStats = this.definition.tracer;

        this.image = new SuroiSprite(tracerStats?.image ?? "base_trail")
            .setRotation(this.rotation - Math.PI / 2)
            .setVPos(toPixiCoords(this.position));

        this.tracerLength = tracerStats?.length ?? 1;
        this.maxLength = this.image.width * this.tracerLength;
        this.image.scale.y = tracerStats?.width ?? 1;
        if (!this.definition.tracer?.particle) this.image.anchor.set(1, 0.5);
        this.image.alpha = (tracerStats?.opacity ?? 1) / (this.reflectionCount + 1);

        const color = new Color(this.definition.tracer?.color ?? 0xffffff);
        if (MODE.bulletTrailAdjust) color.multiply(MODE.bulletTrailAdjust);
        this.image.tint = color;

        this.image.zIndex = this.definition.tracer?.zIndex ?? ZIndexes.Bullets;

        this.game.camera.addObject(this.image);
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
                this._trailReachedMaxLength = true;
                this.position = collision.intersection.point;
                break;
            }
        }

        if (!this._trailReachedMaxLength) this._trailTicks += delta;
        else if (this.dead || this.definition.tracer?.particle) this._trailTicks -= delta;

        const dist = distance(this.initialPosition, this.position);

        if (this.definition.tracer?.particle) {
            this.image.scale.set(1 + (dist / this.maxDistance));
            this.image.alpha = (this.definition.speed * this._trailTicks) / (this.maxDistance / 2);
            if (this.image.alpha >= 1) this._trailReachedMaxLength = true;
        } else {
            this.image.width = Math.min(
                Math.min(
                    this.definition.speed * this._trailTicks,
                    dist
                ) * PIXI_SCALE,
                this.maxLength
            );
            if (this.image.width === this.maxLength) this._trailReachedMaxLength = true;
        }

        this.image.setVPos(toPixiCoords(this.position));

        if (this._trailTicks <= 0 && this.dead) {
            this.destroy();
        }
    }

    destroy(): void {
        this.image.destroy();
        this.game.bullets.delete(this);
    }
}
