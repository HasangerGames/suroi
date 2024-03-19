import { Color } from "pixi.js";
import { BaseBullet, type BulletOptions } from "../../../../common/src/utils/baseBullet";
import { Geometry } from "../../../../common/src/utils/math";
import { type Game } from "../game";
import { MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Obstacle } from "./obstacle";
import { type Player } from "./player";
import { ObjectCategory } from "../../../../common/src/constants";

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

        this.image = new SuroiSprite(tracerStats.image)
            .setRotation(this.rotation - Math.PI / 2)
            .setVPos(toPixiCoords(this.position));

        this.tracerLength = tracerStats.length;
        this.maxLength = this.image.width * this.tracerLength;
        this.image.scale.y = tracerStats.width;
        this.image.alpha = tracerStats.opacity / (this.reflectionCount + 1);

        if (!tracerStats.particle) this.image.anchor.set(1, 0.5);

        const color = new Color(tracerStats.color ?? 0xffffff);
        if (MODE.bulletTrailAdjust) color.multiply(MODE.bulletTrailAdjust);

        this.image.tint = color;
        this.image.zIndex = tracerStats.zIndex;

        this.game.camera.addObject(this.image);
    }

    update(delta: number): void {
        if (!this.dead) {
            const collisions = this.updateAndGetCollisions(delta, this.game.objects);

            for (const collision of collisions) {
                const object = collision.object;

                const isObstacle = object.type === ObjectCategory.Obstacle;
                const isPlayer = object.type === ObjectCategory.Player;
                if (isObstacle || isPlayer) {
                    (object as Obstacle | Player).hitEffect(collision.intersection.point, Math.atan2(collision.intersection.normal.y, collision.intersection.normal.x));
                }

                this.damagedIDs.add(object.id);

                if (isObstacle) {
                    if (this.definition.penetration.obstacles && !object.definition.impenetrable) continue;
                    if (object.definition.noBulletCollision || object.definition.noCollisions) continue;
                }
                if (this.definition.penetration.players && isPlayer) continue;

                this.dead = true;
                this.position = collision.intersection.point;
                break;
            }
        }

        if (!this.dead && !this._trailReachedMaxLength) {
            this._trailTicks += delta;
        } else if (this.dead || this.definition.tracer.particle) {
            this._trailTicks -= delta;
        }

        const traveledDistance = Geometry.distance(this.initialPosition, this.position);

        if (this.definition.tracer.particle) {
            this.image.scale.set(1 + (traveledDistance / this.maxDistance));
            this.image.alpha = 2 * this.definition.speed * this._trailTicks / this.maxDistance;

            this._trailReachedMaxLength ||= this.image.alpha >= 1;
        } else {
            const length = Math.min(
                Math.min(
                    this.definition.speed * this._trailTicks,
                    traveledDistance
                ) * PIXI_SCALE,
                this.maxLength
            );
            this.image.width = length;

            this._trailReachedMaxLength ||= length >= this.maxLength;
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
