import { type ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObstacleDefinition } from "../../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../../common/src/typings";
import { type Hitbox } from "../../../../common/src/utils/hitbox";
import { calculateDoorHitboxes, velFromAngle } from "../../../../common/src/utils/math";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomBoolean, randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE, PIXI_SCALE } from "../utils/constants";
import { orientationToRotation } from "../utils/misc";
import { drawHitbox, SuroiSprite, toPixiCoords } from "../utils/pixi";
import { EaseFunctions, Tween } from "../utils/tween";

export class Obstacle extends GameObject {
    declare readonly type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>;

    scale!: number;

    image: SuroiSprite;

    variation?: Variation;

    damageable = true;

    readonly isDoor: boolean;
    readonly door?: {
        closedHitbox?: Hitbox
        openHitbox?: Hitbox
        openAltHitbox?: Hitbox
        hitbox?: Hitbox
        offset: number
    };

    isNew = true;

    hitbox!: Hitbox;

    orientation!: Orientation;

    particleFrames: string[] = [];

    constructor(game: Game, type: ObjectType, id: number) {
        super(game, type, id);

        this.image = new SuroiSprite(); //.setAlpha(0.5);
        this.container.addChild(this.image);

        // eslint-disable-next-line no-cond-assign
        if (this.isDoor = definition.role === ObstacleSpecialRoles.Door) {
            this.door = { offset: 0 };

            if (definition.operationStyle !== "slide") {
                this.image.anchor.set(0, 0.5);
            }
        }

        if (definition.invisible) this.container.visible = false;

        // If there are multiple particle variations, generate a list of variation image names
        const particleImage = definition.frames?.particle ?? `${definition.idString}_particle`;

        if (definition.particleVariations) {
            for (let i = 0; i < definition.particleVariations; i++) {
                this.particleFrames.push(`${particleImage}_${i + 1}`);
            }
        } else {
            this.particleFrames.push(`${particleImage}`);
        }
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Obstacle]): void {
        const definition = this.type.definition;
        if (data.fullUpdate) {
            this.position = data.position;
            this.rotation = data.rotation.rotation;
            this.orientation = data.rotation.orientation;
            this.variation = data.variation;
        }

        this.scale = data.scale;

        if (definition.role === ObstacleSpecialRoles.Door && this.door && this.isNew) {
            let offsetX: number;
            let offsetY: number;
            switch (definition.operationStyle) {
                case "slide": {
                    offsetX = offsetY = 0;
                    break;
                }
                case "swivel":
                default: {
                    offsetX = definition.hingeOffset.x * PIXI_SCALE;
                    offsetY = definition.hingeOffset.y * PIXI_SCALE;
                    break;
                }
            }

            this.image.setPos(this.image.x + offsetX, this.image.y + offsetY);

            this.rotation = orientationToRotation(this.orientation);
            this.hitbox = this.door.closedHitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
            (
                {
                    openHitbox: this.door.openHitbox,
                    //@ts-expect-error if an attribute is missing in a destructuring assignment,
                    // it just becomes undefined, which is what we want
                    openAltHitbox: this.door.openAltHitbox
                } = calculateDoorHitboxes(definition, this.position, this.orientation)
            );
            this.door.closedHitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }

        if (definition.role === ObstacleSpecialRoles.Door && this.door !== undefined && data.door) {
            const offset = data.door.offset;

            if (offset !== this.door.offset) {
                this.door.offset = offset;
                if (this.isNew) {
                    if (definition.operationStyle !== "slide") {
                        this.image.setRotation(orientationToRotation(this.door.offset));
                    } else {
                        this.image.position = v(
                            offset ? PIXI_SCALE * (definition.slideFactor ?? 1) * ((definition.hitbox as RectangleHitbox).min.x - (definition.hitbox as RectangleHitbox).max.x) : 0,
                            0
                        );
                    }
                } else {
                    this.playSound(
                        offset === 0 ? "door_close" : "door_open",
                        0.3,
                        48
                    );

                    if (definition.operationStyle !== "slide") {
                        // eslint-disable-next-line no-new
                        new Tween(
                            this.game,
                            {
                                target: this.image,
                                to: { rotation: orientationToRotation(offset) },
                                duration: 150
                            }
                        );
                    } else {
                        // eslint-disable-next-line no-new
                        new Tween(
                            this.game,
                            {
                                target: this.image.position,
                                to: {
                                    x: offset ? PIXI_SCALE * (definition.slideFactor ?? 1) * ((definition.hitbox as RectangleHitbox).min.x - (definition.hitbox as RectangleHitbox).max.x) : 0,
                                    y: 0
                                },
                                duration: 150
                            }
                        );
                    }
                }

                let backupHitbox = this.door.closedHitbox?.clone();
                switch (this.door.offset) {
                    case 1: {
                        backupHitbox = this.door.openHitbox?.clone();
                        break;
                    }
                    case 3: {
                        backupHitbox = this.door.openAltHitbox?.clone();
                        break;
                    }
                }

                this.door.hitbox = backupHitbox;

                if (this.door.hitbox) this.hitbox = this.door.hitbox;
            }
        }

        this.container.scale.set(this.dead ? 1 : this.scale);

        // Change the texture of the obstacle and play a sound when it's destroyed
        if (!this.dead && data.dead) {
            this.dead = data.dead;
            if (!this.isNew) {
                this.playSound(`${definition.material}_destroyed`, 0.2, 96);

                if (definition.noResidue) {
                    this.image.setVisible(false);
                } else {
                    this.image.setFrame(`${definition.frames?.residue ?? `${definition.idString}_residue`}`);
                }

                this.container.rotation = this.rotation;
                this.container.scale.set(this.scale);

                this.game.particleManager.spawnParticles(10, () => ({
                    frames: this.particleFrames,
                    position: this.hitbox.randomPoint(),
                    zIndex: (definition.zIndex ?? ZIndexes.ObstaclesLayer1) + 1,
                    lifeTime: 1500,
                    rotation: {
                        start: randomRotation(),
                        end: randomRotation()
                    },
                    scale: {
                        start: randomFloat(0.85, 0.95),
                        end: 0,
                        ease: EaseFunctions.quartIn
                    },
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sextIn
                    },
                    speed: velFromAngle(randomRotation(), randomFloat(4, 9) * (definition.explosion ? 3 : 1))
                }));
            }
        }
        this.container.zIndex = this.dead ? ZIndexes.DeadObstacles : definition.zIndex ?? ZIndexes.ObstaclesLayer1;

        if (!this.isDoor) {
            this.hitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        this.image.setVisible(!(this.dead && !!definition.noResidue));

        let texture;
        if (!this.dead) texture = definition.frames?.base ?? `${definition.idString}`;
        else texture = definition.frames?.residue ?? `${definition.idString}_residue`;

        if (this.variation !== undefined && !this.dead) texture += `_${this.variation + 1}`;

        // Update the obstacle image
        this.image.setFrame(texture);

        if (definition.tint !== undefined) this.image.setTint(definition.tint);

        this.container.rotation = this.rotation;

        this.isNew = false;

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();
            drawHitbox(
                this.hitbox,
                definition.noCollisions === true || this.dead
                    ? HITBOX_COLORS.obstacleNoCollision
                    : HITBOX_COLORS.obstacle,
                this.debugGraphics
            );

            if (definition.role === ObstacleSpecialRoles.Door && definition.operationStyle !== "slide") {
                drawHitbox(
                    new CircleHitbox(0.2, addAdjust(this.position, definition.hingeOffset, this.orientation)),
                    HITBOX_COLORS.obstacleNoCollision,
                    this.debugGraphics
                );
            }

            if (definition.spawnHitbox) {
                drawHitbox(
                    definition.spawnHitbox.transform(this.position, 1, this.orientation),
                    HITBOX_COLORS.spawnHitbox,
                    this.debugGraphics
                );
            }
        }
    }

    hitEffect(position: Vector, angle: number): void {
        this.game.soundManager.play(`${this.type.definition.material}_hit_${randomBoolean() ? "1" : "2"}`, position, 0.2, 96);

        const particleAngle = angle + randomFloat(-0.3, 0.3);

        this.game.particleManager.spawnParticle({
            frames: this.particleFrames,
            position,
            zIndex: Math.max((this.type.definition.zIndex ?? ZIndexes.Players) + 1, 4),
            lifeTime: 600,
            scale: { start: 0.9, end: 0.2 },
            alpha: { start: 1, end: 0.65 },
            speed: velFromAngle(particleAngle, randomFloat(2.5, 4.5))
        });
    }

    destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
