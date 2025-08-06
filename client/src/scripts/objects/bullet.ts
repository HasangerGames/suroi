import { Layer, ObjectCategory, ZIndexes } from "@common/constants";
import { BaseBullet, type BulletOptions } from "@common/utils/baseBullet";
import { RectangleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, adjacentOrEquivLayer } from "@common/utils/layer";
import { Geometry, Numeric, resolveStairInteraction } from "@common/utils/math";
import { random, randomFloat, randomRotation } from "@common/utils/random";
import { Vec } from "@common/utils/vector";
import { colord } from "colord";
import { BloomFilter } from "pixi-filters";
import { Color, Container } from "pixi.js";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { CameraManager } from "../managers/cameraManager";
import { ParticleManager } from "../managers/particleManager";
import { SoundManager } from "../managers/soundManager";
import { PIXI_SCALE, SATURATION_SOUND_SPEED, SPLIT_SOUND_SPEED, THIN_SOUND_SPEED } from "../utils/constants";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import type { Building } from "./building";
import { type Obstacle } from "./obstacle";
import { type Player } from "./player";
import type { Projectile } from "./projectile";

const white = 0xFFFFFF;

export class Bullet extends BaseBullet {
    private readonly _image: SuroiSprite;
    readonly maxLength: number;
    readonly tracerLength: number;

    private _trailReachedMaxLength = false;
    private _trailTicks = 0;

    private _lastParticleTrail = Date.now();
    private _playBulletWhiz: boolean;

    constructor(options: BulletOptions) {
        super(options);

        const tracerStats = this.definition.tracer;

        this._image = new SuroiSprite(tracerStats?.image ?? "base_trail")
            .setRotation(this.rotation - Math.PI / 2)
            .setZIndex(this.definition.tracer?.zIndex ?? ZIndexes.Bullets)
            .setVPos(toPixiCoords(this.position));

        const {
            length = 1,
            width = 1,
            opacity = 1
        } = tracerStats ?? {};
        const {
            length: lengthMod = 1,
            width: widthMod = 1,
            opacity: opacityMod = 1
        } = options.modifiers?.tracer ?? {};
        this.tracerLength = length * lengthMod;
        this.maxLength = this._image.width * this.tracerLength;
        this._image.scale.y = width * widthMod * (this.thin ? 0.5 : 1);
        this._image.alpha = opacity * opacityMod / (this.reflectionCount + 1);

        if (GameConsole.getBuiltInCVar("cv_cooler_graphics")) {
            this._image.filters = [new BloomFilter({
                strength: 5
            })];
        }

        this._image.anchor.set(1, 0.5);

        const color = new Color(
            tracerStats?.color === -1
                ? random(0, white)
                : tracerStats?.color ?? white
        );
        if (Game.mode.bulletTrailAdjust) color.multiply(Game.mode.bulletTrailAdjust);
        if (this.saturate) {
            const hsl = colord(color.toRgbaString()).saturate(50);
            color.value = (hsl.brightness() < 0.6 ? hsl.lighten(0.1) : hsl.darken(0.2)).rgba;
        }

        this._image.tint = color;

        // don't play bullet whiz if bullet originated within whiz hitbox
        this._playBulletWhiz = !Game.activePlayer?.bulletWhizHitbox.isPointInside(this.initialPosition);

        this.updateLayer();

        // Gun Sounds (shotFX basically makes it so that the sound is played once)
        if (this.shotFX) {
            const gunIdString = this.definition.idString.slice(0, -7);

            let soundSpeed: number;
            switch (true) {
                case this.split: {
                    soundSpeed = SPLIT_SOUND_SPEED;
                    break;
                }

                case this.saturate: {
                    soundSpeed = SATURATION_SOUND_SPEED;
                    break;
                }

                case this.thin: {
                    soundSpeed = THIN_SOUND_SPEED;
                    break;
                }

                default: {
                    soundSpeed = 1;
                }
            }

            SoundManager.play(
                `${gunIdString}_fire${this.lastShot ? "_last" : ""}`,
                {
                    position: this.position,
                    layer: this.layer,
                    speed: soundSpeed
                }
            );
        }
    }

    update(delta: number): void {
        if (!this.dead) {
            for (const collision of this.updateAndGetCollisions(delta, Game.objects)) {
                const object = collision.object;
                const { isProjectile, isObstacle, isPlayer } = object;

                if (object.isObstacle && object.definition.isStair) {
                    const newLayer = resolveStairInteraction(
                        object.definition,
                        (object as Obstacle).orientation,
                        object.hitbox as RectangleHitbox,
                        object.layer,
                        this.position
                    );
                    this.layer = newLayer;
                    this.updateLayer();
                    continue;
                }

                // We check for projectiles first, not obstacles, otherwise stuff like tables or bushes won't be damaged by bullets.
                if (isProjectile && !adjacentOrEquivLayer(object, this.layer)) continue;

                const { point, normal } = collision.intersection;

                if (isPlayer && collision.reflected) {
                    SoundManager.play(
                        `bullet_reflection_${random(1, 5)}`,
                        {
                            position: collision.intersection.point,
                            falloff: 0.2,
                            maxRange: 96,
                            layer: object.layer
                        });
                } else {
                    (object as Player | Obstacle | Building | Projectile).hitEffect(point, Math.atan2(normal.y, normal.x));
                }

                this.collidedIDs.add(object.id);

                this.position = point;

                // We check here for obstacles, after the collision was done, in order to damage tables and bushes.
                // think of it as bullet penetration.
                if (isObstacle && object.definition.noCollisions) continue;

                this.dead = true;
                break;
            }
        }

        if (this._playBulletWhiz) {
            const intersection = Game.activePlayer?.bulletWhizHitbox.intersectsLine(this.initialPosition, this.position);
            if (intersection && adjacentOrEqualLayer(this.layer, Game.layer)) {
                SoundManager.play(`bullet_whiz_${random(1, 3)}`, { position: intersection.point });
                this._playBulletWhiz = false;
            }
        }

        if (!this.dead && !this._trailReachedMaxLength) {
            this._trailTicks += delta;
        } else if (this.dead) {
            this._trailTicks -= delta;
        }

        const length = Numeric.min(
            Numeric.min(
                this.definition.speed * (this.modifiers?.speed ?? 1) * this._trailTicks,
                Geometry.distance(this.initialPosition, this.position)
            ) * PIXI_SCALE,
            this.maxLength
        );
        this._image.width = length;

        this._trailReachedMaxLength ||= length >= this.maxLength;

        this._image.setVPos(toPixiCoords(this.position));

        if (
            (
                this.layer === Layer.Upstairs
                && Game.layer === Layer.Ground
            )
            || (
                this.initialLayer === Layer.Basement
                && this.layer !== this.initialLayer
                && Game.layer === Layer.Ground
            )
        ) {
            let hasMask = false;
            for (const building of Game.objects.getCategory(ObjectCategory.Building)) {
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
            && GameConsole.getBuiltInCVar("cv_cooler_graphics")
            && Date.now() - this._lastParticleTrail >= this.definition.trail.interval
        ) {
            const trail = this.definition.trail;
            ParticleManager.spawnParticles(
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
        }
    }

    layerContainer?: Container;

    updateLayer(): void {
        this.layerContainer?.removeChild(this._image);
        (this.layerContainer = CameraManager.getContainer(this.layer)).addChild(this._image);
    }

    destroy(): void {
        this._image.destroy();
        Game.bullets.delete(this);
    }
}
