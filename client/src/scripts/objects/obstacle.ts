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

    isDoor?: boolean;
    door?: {
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

        const definition = this.type.definition;

        this.isDoor = this.type.definition.isDoor;
        if (this.isDoor) {
            this.door = { offset: 0 };
            this.image.anchor.set(0, 0.5);
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

        if (definition.isDoor && this.door && this.isNew) {
            let offsetX: number;
            let offsetY: number;
            if (definition.hingeOffset) {
                offsetX = definition.hingeOffset.x * PIXI_SCALE;
                offsetY = definition.hingeOffset.y * PIXI_SCALE;
            } else {
                offsetX = offsetY = 0;
            }
            this.image.setPos(this.image.x + offsetX, this.image.y + offsetY);

            this.rotation = orientationToRotation(this.orientation);

            this.hitbox = this.door.closedHitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
            ({ openHitbox: this.door.openHitbox, openAltHitbox: this.door.openAltHitbox } = calculateDoorHitboxes(definition, this.position, this.orientation));
            this.door.closedHitbox = definition.hitbox.transform(this.position, this.scale, this.orientation);
        }

        if (definition.isDoor && this.door !== undefined && data.door) {
            const offset = data.door.offset;

            if (offset !== this.door.offset) {
                this.door.offset = offset;
                if (!this.isNew) {
                    if (offset === 0) this.playSound("door_close", 0.3, 48);
                    else this.playSound("door_open", 0.3, 48);
                    // eslint-disable-next-line no-new
                    new Tween(this.game, {
                        target: this.image,
                        to: { rotation: orientationToRotation(offset) },
                        duration: 150
                    });
                } else {
                    this.image.setRotation(orientationToRotation(this.door.offset));
                }

                if (this.door.offset === 1) {
                    this.door.hitbox = this.door.openHitbox?.clone();
                } else if (this.door.offset === 3) {
                    this.door.hitbox = this.door.openAltHitbox?.clone();
                } else {
                    this.door.hitbox = this.door.closedHitbox?.clone();
                }
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

        let texture = definition.frames?.base ?? `${definition.idString}`;
        if (this.dead) texture = definition.frames?.residue ?? `${definition.idString}_residue`;

        if (this.variation !== undefined && !this.dead) texture += `_${this.variation + 1}`;
        // Update the obstacle image
        this.image.setFrame(`${texture}`);

        this.container.rotation = this.rotation;

        this.isNew = false;

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();
            drawHitbox(this.hitbox, definition.noCollisions ? HITBOX_COLORS.obstacleNoCollision : HITBOX_COLORS.obstacle, this.debugGraphics);
            if (definition.spawnHitbox) {
                drawHitbox(definition.spawnHitbox.transform(this.position, 1, this.orientation),
                    HITBOX_COLORS.spawnHitbox,
                    this.debugGraphics);
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
