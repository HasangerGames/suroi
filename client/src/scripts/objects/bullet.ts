import { Layer, ObjectCategory, ZIndexes } from "@common/constants";
import { BaseBullet, type BulletOptions } from "@common/utils/baseBullet";
import { RectangleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, getEffectiveZIndex, isVisibleFromLayer } from "@common/utils/layer";
import { Geometry, Numeric, resolveStairInteraction } from "@common/utils/math";
import { random, randomFloat, randomRotation } from "@common/utils/random";
import { Vec } from "@common/utils/vector";
import { colord } from "colord";
import { BloomFilter } from "pixi-filters";
import { Color } from "pixi.js";
import { type Game } from "../game";
import { MODE, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import type { Building } from "./building";
import { type Obstacle } from "./obstacle";
import { type Player } from "./player";

const white = 0xFFFFFF;

export class Bullet extends BaseBullet {
    readonly game: Game;
    private readonly _image: SuroiSprite;
    readonly maxLength: number;
    readonly tracerLength: number;

    private _trailReachedMaxLength = false;
    private _trailTicks = 0;

    private _lastParticleTrail = Date.now();
    private _playBulletWhiz: boolean;

    constructor(game: Game, options: BulletOptions) {
        super(options);

        this.game = game;

        const tracerStats = this.definition.tracer;

        this._image = new SuroiSprite(tracerStats.image)
            .setRotation(this.rotation - Math.PI / 2)
            .setVPos(toPixiCoords(this.position));

        const mods = options.modifiers;
        const tracerMods = mods?.tracer;

        this.tracerLength = tracerStats.length * (tracerMods?.length ?? 1);
        this.maxLength = this._image.width * this.tracerLength;
        this._image.scale.y = tracerStats.width * (tracerMods?.width ?? 1) * (this.thin ? 0.5 : 1);
        this._image.alpha = tracerStats.opacity * (tracerMods?.opacity ?? 1) / (this.reflectionCount + 1);

        if (this.game.console.getBuiltInCVar("cv_cooler_graphics")) {
            this._image.filters = new BloomFilter({
                strength: 5
            });
        }

        if (!tracerStats.particle) this._image.anchor.set(1, 0.5);

        const color = new Color(
            tracerStats.color === -1
                ? random(0, white)
                : tracerStats.color ?? white
        );
        if (MODE.bulletTrailAdjust) color.multiply(MODE.bulletTrailAdjust);
        if (this.saturate) {
            const hsl = colord(color.toRgbaString()).saturate(50);
            color.value = (hsl.brightness() < 0.6 ? hsl.lighten(0.1) : hsl.darken(0.2)).rgba;
        }

        this._image.tint = color;
        this.setLayer(this.layer);

        // don't play bullet whiz if bullet originated within whiz hitbox
        this._playBulletWhiz = !this.game.activePlayer?.bulletWhizHitbox.isPointInside(this.initialPosition);

        this.game.camera.addObject(this._image);
    }

    update(delta: number): void {
        const oldLayer = this.layer;
        if (!this.dead) {
            for (const collision of this.updateAndGetCollisions(delta, this.game.objects)) {
                const object = collision.object;

                if (object.isObstacle && object.definition.isStair) {
                    this.setLayer(resolveStairInteraction(
                        object.definition,
                        (object as Obstacle).orientation,
                        object.hitbox as RectangleHitbox,
                        object.layer,
                        this.position
                    ));
                    continue;
                }

                const { point, normal } = collision.intersection;

                (object as Player | Obstacle | Building).hitEffect(point, Math.atan2(normal.y, normal.x));

                this.damagedIDs.add(object.id);

                this.position = point;

                if (object.isObstacle && object.definition.noCollisions) continue;

                this.dead = true;
                break;
            }
        }
        if (this._playBulletWhiz) {
            const intersection = this.game.activePlayer?.bulletWhizHitbox.intersectsLine(this.initialPosition, this.position);
            if (intersection && this.game.layer !== undefined && adjacentOrEqualLayer(this.layer, this.game.layer)) {
                this.game.soundManager.play(`bullet_whiz_${random(1, 3)}`, { position: intersection.point });
                this._playBulletWhiz = false;
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
            this._image.alpha = 2 * this.definition.speed * (this.modifiers?.speed ?? 1) * this._trailTicks / this.maxDistance;

            this._trailReachedMaxLength ||= this._image.alpha >= 1;
        } else {
            const length = Numeric.min(
                Numeric.min(
                    this.definition.speed * (this.modifiers?.speed ?? 1) * this._trailTicks,
                    traveledDistance
                ) * PIXI_SCALE,
                this.maxLength
            );
            this._image.width = length;

            this._trailReachedMaxLength ||= length >= this.maxLength;
        }

        this._image.setVPos(toPixiCoords(this.position));

        if (
            (
                this.layer === Layer.Floor1
                && this.game.layer === Layer.Ground
            )
            || (
                this.initialLayer === Layer.Basement1
                && this.layer !== this.initialLayer
                && this.game.layer === Layer.Ground
            )
        ) {
            let hasMask = false;
            for (const building of this.game.objects.getCategory(ObjectCategory.Building)) {
                if (!building.maskHitbox?.isPointInside(this.position)) continue;

                if (building.mask) {
                    hasMask = true;
                    this._image.mask = building.mask;
                    break;
                }
            }
            if (!hasMask) this._image.mask = null;
        }

        if (
            this.definition.trail
            && this.game.console.getBuiltInCVar("cv_cooler_graphics")
            && Date.now() - this._lastParticleTrail >= this.definition.trail.interval
        ) {
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
                    zIndex: getEffectiveZIndex(ZIndexes.Bullets - 1, this.layer, this.game.layer),
                    scale: randomFloat(trail.scale.min, trail.scale.max),
                    alpha: {
                        start: randomFloat(trail.alpha.min, trail.alpha.max),
                        end: 0
                    },
                    layer: this.layer,
                    tint: trail.tint === -1
                        ? new Color({ h: random(0, 6) * 60, s: 60, l: 70 }).toNumber()
                        : trail.tint
                })
            );

            this._lastParticleTrail = Date.now();
        }

        if (this._trailTicks <= 0 && this.dead) {
            this.destroy();
        } else if (this.layer === oldLayer) {
            this.updateVisibility();
        }
    }

    private setLayer(layer: number): void {
        this.layer = layer;
        this.updateVisibility();
        this._image.zIndex = getEffectiveZIndex(this.definition.tracer.zIndex, this.layer, this.game.layer);
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
