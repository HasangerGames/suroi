import { Container, Graphics } from "pixi.js";
import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { CircleHitbox, HitboxGroup, PolygonHitbox, RectangleHitbox, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Angle, Collision, EaseFunctions, type CollisionResponse } from "../../../../common/src/utils/math";
import { ObstacleSpecialRoles } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { Vec } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";

export class Building extends GameObject<ObjectCategory.Building> {
    override readonly type = ObjectCategory.Building;

    readonly ceilingContainer: Container;

    definition!: BuildingDefinition;

    ceilingHitbox?: Hitbox;
    ceilingTween?: Tween<Container>;

    orientation!: Orientation;

    ceilingVisible = false;

    errorSeq?: boolean;

    sound?: GameSound;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Building]) {
        super(game, id);

        this.container.zIndex = ZIndexes.BuildingsFloor;

        this.ceilingContainer = new Container();
        this.game.camera.addObject(this.ceilingContainer);

        this.updateFromData(data, true);
    }

    toggleCeiling(): void {
        if (this.ceilingHitbox === undefined || this.dead) return;
        const player = this.game.activePlayer;
        if (player === undefined) return;

        let visible = false;

        if (this.ceilingHitbox.collidesWith(player.hitbox)) {
            visible = true;
        } else {
            const visionSize = 14;

            const playerHitbox = new CircleHitbox(visionSize, player.position);

            const hitboxes = this.ceilingHitbox instanceof HitboxGroup ? this.ceilingHitbox.hitboxes : [this.ceilingHitbox];

            let graphics: Graphics | undefined;
            if (HITBOX_DEBUG_MODE) {
                graphics = new Graphics();
                graphics.zIndex = 100;
                this.game.camera.addObject(graphics);
            }

            for (const hitbox of hitboxes) {
                // find the direction to cast rays
                let collision: CollisionResponse = null;

                switch (true) {
                    case hitbox instanceof CircleHitbox: {
                        collision = Collision.circleCircleIntersection(
                            hitbox.position,
                            hitbox.radius,
                            playerHitbox.position,
                            playerHitbox.radius
                        );
                        break;
                    }
                    case hitbox instanceof RectangleHitbox: {
                        collision = Collision.rectCircleIntersection(
                            hitbox.min,
                            hitbox.max,
                            playerHitbox.position,
                            playerHitbox.radius
                        );
                        break;
                    }
                    case hitbox instanceof PolygonHitbox: {
                        // TODO
                        break;
                    }
                }

                const direction = collision?.dir;
                if (direction) {
                    /* if (HITBOX_DEBUG_MODE) {
                        graphics?.lineStyle({
                            color: 0xff0000,
                            width: 0.1
                        });

                        graphics?.beginFill();
                        graphics?.scale.set(PIXI_SCALE);

                        this.addTimeout(() => {
                            graphics?.destroy();
                        }, 30);
                    } */

                    const angle = Math.atan2(direction.y, direction.x);

                    let collided = false;

                    const halfPi = Math.PI / 2;
                    for (let i = angle - halfPi; i < angle + halfPi; i += 0.1) {
                        collided = false;

                        const end = this.ceilingHitbox.intersectsLine(
                            player.position,
                            Vec.add(
                                player.position,
                                Vec.scale(
                                    Vec.create(Math.cos(i), Math.sin(i)),
                                    visionSize
                                )
                            )
                        )?.point;

                        if (!end) {
                            // what's the point of this assignment?
                            collided = true;
                            continue;
                        }

                        if (graphics) {
                            graphics.moveTo(player.position.x, player.position.y);
                            graphics.lineTo(end.x, end.y);
                            graphics.fill();
                        }

                        if (!(
                            collided ||= [...this.game.objects.getCategory(ObjectCategory.Obstacle)]
                                .some(
                                    ({
                                        damageable,
                                        dead,
                                        definition: { role },
                                        hitbox
                                    }) => damageable
                                    && !dead
                                    && role !== ObstacleSpecialRoles.Window
                                    && hitbox?.intersectsLine(player.position, end)
                                )
                        )) break;
                    }
                    visible = !collided;
                } else {
                    visible = false;
                }

                if (visible) break;
            }
        }

        if (this.ceilingVisible === visible) return;

        this.ceilingVisible = visible;

        this.ceilingTween?.kill();
        this.ceilingTween = this.game.addTween({
            target: this.ceilingContainer,
            to: { alpha: visible ? 0 : 1 },
            duration: visible ? 150 : 300,
            ease: EaseFunctions.sineOut,
            onComplete: () => {
                this.ceilingTween = undefined;
            }
        });
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Building], isNew = false): void {
        if (data.full) {
            const full = data.full;
            this.definition = full.definition;
            this.position = full.position;

            for (const image of this.definition.floorImages) {
                const sprite = new SuroiSprite(image.key);
                sprite.setVPos(toPixiCoords(image.position));
                if (image.tint !== undefined) sprite.setTint(image.tint);
                if (image.rotation) sprite.setRotation(image.rotation);
                if (image.scale) sprite.scale = image.scale;
                this.container.addChild(sprite);
            }

            const pos = toPixiCoords(this.position);
            this.container.position.copyFrom(pos);
            this.ceilingContainer.position.copyFrom(pos);
            this.ceilingContainer.zIndex = this.definition.ceilingZIndex;

            this.orientation = full.rotation;
            this.rotation = Angle.orientationToRotation(this.orientation);
            this.container.rotation = this.rotation;
            this.ceilingContainer.rotation = this.rotation;

            this.ceilingHitbox = (this.definition.scopeHitbox ?? this.definition.ceilingHitbox)?.transform(this.position, 1, this.orientation);
        }

        const definition = this.definition;

        if (definition === undefined) {
            console.warn("Building partially updated before being fully updated");
        }

        if (definition.sounds) {
            const { sounds } = definition;
            const soundOptions = {
                position: Vec.add(Vec.rotate(sounds.position ?? Vec.create(0, 0), this.rotation), this.position),
                fallOff: sounds.falloff,
                maxRange: sounds.maxRange,
                dynamic: true,
                loop: true
            };

            if (
                sounds.normal
                && !data.puzzle?.solved
                && this.sound?.name !== sounds.normal
            ) {
                this.sound?.stop();
                this.sound = this.game.soundManager.play(sounds.normal, soundOptions);
            }

            if (
                sounds.solved
                && data.puzzle?.solved
                && this.sound?.name !== sounds.solved
            ) {
                this.sound?.stop();
                this.sound = this.game.soundManager.play(sounds.solved, soundOptions);
            }
        }

        if (data.dead) {
            if (!this.dead && !isNew) {
                this.game.particleManager.spawnParticles(10, () => ({
                    frames: `${this.definition.idString}_particle`,
                    position: this.ceilingHitbox?.randomPoint() ?? { x: 0, y: 0 },
                    zIndex: 10,
                    lifetime: 2000,
                    rotation: {
                        start: randomRotation(),
                        end: randomRotation()
                    },
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sexticIn
                    },
                    scale: { start: 1, end: 0.2 },
                    speed: Vec.fromPolar(randomRotation(), randomFloat(1, 2))
                }));

                this.playSound(
                    "ceiling_collapse",
                    {
                        falloff: 0.5,
                        maxRange: 96
                    }
                );
            }
            this.ceilingTween?.kill();
            this.ceilingContainer.zIndex = ZIndexes.DeadObstacles;
            this.ceilingContainer.alpha = 1;

            this.ceilingContainer.addChild(new SuroiSprite(`${definition.idString}_residue`));
        }
        this.dead = data.dead;

        if (data.puzzle) {
            if (!isNew && data.puzzle.errorSeq !== this.errorSeq) {
                this.playSound("puzzle_error");
            }
            this.errorSeq = data.puzzle.errorSeq;

            if (!isNew && data.puzzle.solved && definition.puzzle?.solvedSound) {
                this.playSound("puzzle_solved");
            }
        }

        this.ceilingContainer.removeChildren();
        for (const image of definition.ceilingImages) {
            let key = image.key;
            if (this.dead && image.residue) key = image.residue;
            const sprite = new SuroiSprite(key);
            sprite.setVPos(toPixiCoords(image.position));
            if (image.tint !== undefined) sprite.setTint(image.tint);
            this.ceilingContainer.addChild(sprite);
        }

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();

            if (this.ceilingHitbox !== undefined) {
                drawHitbox(
                    this.ceilingHitbox,
                    HITBOX_COLORS.buildingScopeCeiling,
                    this.debugGraphics
                );
            }

            drawHitbox(
                definition.spawnHitbox.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.spawnHitbox,
                this.debugGraphics
            );

            if (definition.scopeHitbox !== undefined) {
                drawHitbox(
                    definition.scopeHitbox.transform(this.position, 1, this.orientation),
                    HITBOX_COLORS.buildingZoomCeiling,
                    this.debugGraphics
                );
            }
        }
    }

    override destroy(): void {
        super.destroy();

        this.ceilingTween?.kill();
        this.ceilingContainer.destroy();
        this.sound?.stop();
    }
}
