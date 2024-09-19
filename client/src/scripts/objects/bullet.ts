import { BloomFilter } from "pixi-filters";
import { Color, Container, Graphics, Rectangle, ScissorMask } from "pixi.js";
import { Layer, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { BaseBullet, type BulletOptions } from "../../../../common/src/utils/baseBullet";
import type { RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { adjacentOrEqualLayer, equalLayer, getEffectiveZIndex, isVisibleFromLayer } from "../../../../common/src/utils/layer";
import { Geometry, resolveStairInteraction } from "../../../../common/src/utils/math";
import { random, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { Vec } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import type { Building } from "./building";
import { type Obstacle } from "./obstacle";
import { type Player } from "./player";

export class Bullet extends BaseBullet {
    readonly game: Game;
    private readonly _image: SuroiSprite;
    readonly maxLength: number;
    readonly tracerLength: number;

    private _trailReachedMaxLength = false;
    private _trailTicks = 0;

    private _lastParticleTrail = Date.now();

    constructor(game: Game, options: BulletOptions) {
        super(options);

        this.game = game;

        const tracerStats = this.definition.tracer;

        this._image = new SuroiSprite(tracerStats.image)
            .setRotation(this.rotation - Math.PI / 2)
            .setVPos(toPixiCoords(this.position));

        this.tracerLength = tracerStats.length;
        this.maxLength = this._image.width * this.tracerLength;
        this._image.scale.y = tracerStats.width;
        this._image.alpha = tracerStats.opacity / (this.reflectionCount + 1);
        if (this.game.console.getBuiltInCVar("cv_cooler_graphics")) {
            this._image.filters = new BloomFilter({
                strength: 5
            });
        }

        if (!tracerStats.particle) this._image.anchor.set(1, 0.5);

        const white = 0xFFFFFF;
        const color = new Color(
            tracerStats.color === -1
                ? random(0, white)
                : tracerStats.color ?? white
        );
        if (MODE.bulletTrailAdjust) color.multiply(MODE.bulletTrailAdjust);

        this._image.tint = new Color(color);
        this.setLayer(this._layer);

        this.game.camera.addObject(this._image);
    }

    update(delta: number): void {
        const oldLayer = this._layer;
        if (!this.dead) {
            const collisions = this.updateAndGetCollisions(delta, this.game.objects);

            for (const collision of collisions) {
                const object = collision.object;

                const { isObstacle, isPlayer, isBuilding } = object;

                if (
                    (
                        isPlayer || (isObstacle && !object.definition.isStair) || isBuilding
                    ) && equalLayer(object.layer, this._layer)
                ) {
                    (object as Obstacle | Player | Building).hitEffect(
                        collision.intersection.point,
                        Math.atan2(collision.intersection.normal.y, collision.intersection.normal.x)
                    );
                }

                if (!object.isObstacle || !object.definition.isStair) {
                    this.damagedIDs.add(object.id);
                }

                if (object.isObstacle) {
                    const definition = object.definition;
                    if (
                        (this.definition.penetration.obstacles && !definition.impenetrable)
                        || definition.noBulletCollision
                        || definition.noCollisions
                        || !(definition.spanAdjacentLayers || definition.isStair ? adjacentOrEqualLayer : equalLayer)(object.layer, this._layer)
                    ) continue;

                    if (definition.isStair) {
                        this.setLayer(
                            resolveStairInteraction(
                                definition,
                                (object as Obstacle).orientation,
                                object.hitbox as RectangleHitbox,
                                object.layer,
                                this.position
                            )
                        );
                        continue;
                    }
                } else if (
                    (isPlayer && this.definition.penetration.players)
                    || (
                        isBuilding && (
                            object.definition.noBulletCollision
                            || !(object.definition.spanAllLayers || (object.definition.spanAdjacentLayers ? adjacentOrEqualLayer : equalLayer)(object.layer, this._layer))
                        )
                    )
                ) continue;

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
            this._image.scale.set(1 + (traveledDistance / this.maxDistance));
            this._image.alpha = 2 * this.definition.speed * this._trailTicks / this.maxDistance;

            this._trailReachedMaxLength ||= this._image.alpha >= 1;
        } else {
            const length = Math.min(
                Math.min(
                    this.definition.speed * this._trailTicks,
                    traveledDistance
                ) * PIXI_SCALE,
                this.maxLength
            );
            this._image.width = length;

            this._trailReachedMaxLength ||= length >= this.maxLength;
        }

        this._image.setVPos(toPixiCoords(this.position));

        const graphics = new Graphics();
        let hasMask = false;
        for (const building of this.game.objects.getCategory(ObjectCategory.Building)) {
            if (!building.definition.bulletMask) continue;
            const hitbox = building.definition.bulletMask.transform(building.position, 1, building.orientation);
            if (!hitbox.isPointInside(this.position)) continue;
            hasMask = true;
            const { min, max } = hitbox;
            graphics
                .beginPath()
                .rect(
                    min.x * PIXI_SCALE,
                    min.y * PIXI_SCALE,
                    (max.x - min.x) * PIXI_SCALE,
                    (max.y - min.y) * PIXI_SCALE
                )
                .closePath()
                .fill(0xffffff);
            graphics.alpha = 0;
            this.game.camera.container.addChild(graphics);
        }
        this._image.mask = hasMask ? graphics : null;

        this.particleTrail();

        if (this._trailTicks <= 0 && this.dead) {
            this.destroy();
        } else if (this._layer === oldLayer) {
            this.updateVisibility();
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
                zIndex: getEffectiveZIndex(ZIndexes.Bullets - 1, this._layer, this.game.layer),
                scale: randomFloat(trail.scale.min, trail.scale.max),
                alpha: {
                    start: randomFloat(trail.alpha.min, trail.alpha.max),
                    end: 0
                },
                layer: this._layer,
                tint: trail.tint === -1
                    ? new Color({ h: random(0, 6) * 60, s: 60, l: 70 }).toNumber()
                    : trail.tint
            })
        );

        this._lastParticleTrail = Date.now();
    }

    private setLayer(layer: number): void {
        this._layer = layer;
        this.updateVisibility();
        this._image.zIndex = getEffectiveZIndex(this.definition.tracer.zIndex, this._layer, this.game.layer);
    }

    private updateVisibility(): void {
        if (!this.game.activePlayer) return;

        this._image.visible = isVisibleFromLayer(
            this.game.activePlayer.layer,
            this,
            [...this.game.objects],
            hitbox => hitbox.intersectsLine(this._oldPosition, this.position) !== null
        );
    }

    destroy(): void {
        this._image.destroy();
        this.game.bullets.delete(this);
    }
}
