import type { Game } from "../game";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Hitbox } from "../../../../common/src/utils/hitbox";
import { type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { orientationToRotation } from "../utils/misc";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { Container } from "pixi.js";
import { randomFloat, randomRotation } from "../../../../common/src/utils/random";
import { velFromAngle } from "../../../../common/src/utils/math";
import { EaseFunctions, Tween } from "../utils/tween";

export class Building extends GameObject {
    override type: ObjectType<ObjectCategory.Building, BuildingDefinition>;

    readonly images: {
        floor: SuroiSprite
        ceiling: SuroiSprite
        ceilingContainer: Container
    };

    ceilingHitbox?: Hitbox;

    orientation!: Orientation;

    ceilingTween?: Tween<Container>;

    ceilingVisible = true;

    isNew = true;

    floorHitboxes: Hitbox[] = [];

    constructor(game: Game, type: ObjectType<ObjectCategory.Building, BuildingDefinition>, id: number) {
        super(game, type, id);
        this.type = type;

        const definition = type.definition;
        this.images = {
            floor: new SuroiSprite(`${type.idString}_floor.svg`).setPos(definition.floorImagePos.x * 20, definition.floorImagePos.y * 20),
            ceiling: new SuroiSprite(`${type.idString}_ceiling.svg`).setPos(definition.ceilingImagePos.x * 20, definition.ceilingImagePos.y * 20),
            ceilingContainer: new Container()
        };

        this.container.addChild(this.images.floor);
        this.container.zIndex = -1;

        this.game.camera.container.addChild(this.images.ceilingContainer);
        this.images.ceilingContainer.addChild(this.images.ceiling);
        this.images.ceilingContainer.zIndex = 8;
    }

    toggleCeiling(visible: boolean): void {
        if (this.ceilingVisible === visible) return;

        this.ceilingTween?.kill();

        this.ceilingTween = new Tween(this.game, {
            target: this.images.ceilingContainer,
            to: { alpha: visible ? 1 : 0 },
            duration: 200,
            ease: EaseFunctions.sineOut,
            onComplete: () => {
                this.ceilingVisible = visible;
            }
        });
    }

    override deserializePartial(stream: SuroiBitStream): void {
        const dead = stream.readBoolean();

        if (dead) {
            if (dead && !this.dead && !this.isNew) {
                this.game.particleManager.spawnParticles(10, () => ({
                    frames: `${this.type.idString}_particle.svg`,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    position: this.ceilingHitbox!.randomPoint(),
                    depth: 10,
                    lifeTime: 2000,
                    rotation: {
                        start: randomRotation(),
                        end: randomRotation()
                    },
                    alpha: {
                        start: 1,
                        end: 0,
                        ease: EaseFunctions.sextIn
                    },
                    scale: { start: 1, end: 0.2 },
                    speed: velFromAngle(randomRotation(), randomFloat(0.1, 0.2))
                }));
                this.playSound("ceiling_collapse", 0.5, 96);
            }
            this.ceilingTween?.kill();
            this.images.ceilingContainer.zIndex = -0.1;
            this.images.ceilingContainer.alpha = 1;
            this.images.ceiling.setFrame(`${this.type.idString}_residue.svg`);
        }
        this.dead = dead;

        this.isNew = false;
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.position = stream.readPosition();

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);
        this.images.ceilingContainer.position.copyFrom(pos);

        this.orientation = stream.readBits(2) as Orientation;

        this.rotation = orientationToRotation(this.orientation);

        this.container.rotation = this.rotation;

        this.images.ceilingContainer.rotation = this.rotation;

        this.ceilingHitbox = (this.type.definition).ceilingHitbox.transform(this.position, 1, this.orientation);

        for (const floor of (this.type.definition).floors) {
            const floorHitbox = floor.hitbox.transform(this.position, 1, this.orientation);
            this.floorHitboxes.push(floorHitbox);
            this.game.floorHitboxes.set(
                floorHitbox,
                floor.type
            );
        }
    }

    destroy(): void {
        super.destroy();
        this.ceilingTween?.kill();
        this.images.ceilingContainer.destroy();
        for (const floorHitbox of this.floorHitboxes) {
            this.game.floorHitboxes.delete(floorHitbox);
        }
    }
}
