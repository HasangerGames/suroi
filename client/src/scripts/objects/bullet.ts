import { BloomFilter } from "pixi-filters";
import { Color } from "pixi.js";
import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { BaseBullet, type BulletOptions } from "../../../../common/src/utils/baseBullet";
import { Geometry } from "../../../../common/src/utils/math";
import { random, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { Vec } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Obstacle } from "./obstacle";
import { type Player } from "./player";

export class Bullet extends BaseBullet {
    readonly game: Game;
    readonly image: SuroiSprite;
    readonly maxLength: number;
    readonly tracerLength: number;

    private _trailReachedMaxLength = false;
    private _trailTicks = 0;

    private _lastParticleTrail = Date.now();

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
        if (this.game.console.getBuiltInCVar("cv_cooler_graphics")) {
            this.image.filters = new BloomFilter({
                strength: 5
            });
        }

        if (!tracerStats.particle) this.image.anchor.set(1, 0.5);

        const white = 0xFFFFFF;
        const color = new Color(
            tracerStats.color === -1
                ? random(0, white)
                : tracerStats.color ?? white
        );
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

        this.particleTrail();

        if (this._trailTicks <= 0 && this.dead) {
            this.destroy();
        }
    }

    particleTrail(): void {
        if (!this.definition.trail) return;
        if (!this.game.console.getBuiltInCVar("cv_cooler_graphics")) return;
        if (Date.now() - this._lastParticleTrail < this.definition.trail.interval) return;

        const trail = this.definition.trail;
        this.game.particleManager.spawnParticles(
            trail.amount ?? 1,
            () => ({
                frames: trail.frame,
                speed: Vec.fromPolar(
                    randomRotation(),
                    randomFloat(trail.spreadSpeed.min, trail.spreadSpeed.max)
                ),
                position: this.position,
                lifetime: random(trail.lifetime.min, trail.lifetime.max),
                zIndex: ZIndexes.Bullets - 1,
                scale: randomFloat(trail.scale.min, trail.scale.max),
                alpha: {
                    start: randomFloat(trail.alpha.min, trail.alpha.max),
                    end: 0
                },
                tint: trail.tint === -1
                    ? new Color({ h: random(0, 6) * 60, s: 60, l: 70 }).toNumber()
                    : trail.tint
            })
        );

        this._lastParticleTrail = Date.now();
    }

    destroy(): void {
        this.image.destroy();
        this.game.bullets.delete(this);
    }
}
