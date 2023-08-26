import type { Game } from "../game";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Hitbox } from "../../../../common/src/utils/hitbox";
import { type FloorType, type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { orientationToRotation } from "../utils/misc";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { gsap } from "gsap";
import { Container } from "pixi.js";

export class Building extends GameObject {
    override type: ObjectType<ObjectCategory.Building, BuildingDefinition>;

    readonly images: {
        floor: SuroiSprite
        ceiling: SuroiSprite
        ceilingContainer: Container
        // emitter
    };

    ceilingHitbox?: Hitbox;

    orientation!: Orientation;

    ceilingTween?: gsap.core.Tween;

    ceilingVisible = true;

    isNew = true;

    floors: Array<{ type: FloorType, hitbox: Hitbox }> = [];

    constructor(game: Game, type: ObjectType<ObjectCategory.Building, BuildingDefinition>, id: number) {
        super(game, type, id);
        this.type = type;

        const definition = type.definition;
        this.images = {
            floor: new SuroiSprite(`${type.idString}_floor.svg`).setPos(definition.floorImagePos.x * 20, definition.floorImagePos.y * 20),
            ceiling: new SuroiSprite(`${type.idString}_ceiling.svg`).setPos(definition.ceilingImagePos.x * 20, definition.ceilingImagePos.y * 20),
            ceilingContainer: new Container()
            // emitter: scene.add.particles(0, 0, "main").setDepth(8)
        };

        this.container.addChild(this.images.floor);
        this.container.zIndex = -1;

        this.game.camera.container.addChild(this.images.ceilingContainer);
        this.images.ceilingContainer.addChild(this.images.ceiling);
        this.images.ceilingContainer.zIndex = 8;
    }

    toggleCeiling(visible: boolean): void {
        if (this.ceilingVisible === visible || this.ceilingTween?.isActive()) return;

        this.ceilingTween?.kill();

        this.ceilingTween = gsap.to(this.images.ceilingContainer, {
            alpha: visible ? 1 : 0,
            duration: 0.2,
            onComplete: () => {
                this.ceilingVisible = visible;
            }
        });
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override deserializePartial(stream: SuroiBitStream): void {
        const dead = stream.readBoolean();

        if (dead) {
            if (dead && !this.dead && !this.isNew) {
                /*this.images.emitter.setConfig({
                    frame: `${this.type.idString}_particle.svg`,
                    rotate: { min: -180, max: 180 },
                    lifespan: 1000,
                    speed: { min: 80, max: 150 },
                    alpha: { start: 1, end: 0 },
                    scale: { start: 1, end: 0.2 },
                    emitting: false,
                    // >:(
                    emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone(
                        this.images.ceiling.getBounds() as Phaser.Types.GameObjects.Particles.RandomZoneSource)
                }).explode(10);*/
                this.playSound("ceiling_collapse", 0.6);
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

        this.floors = [];

        for (const floor of (this.type.definition).floors) {
            this.floors.push({
                type: floor.type,
                hitbox: floor.hitbox.transform(this.position, 1, this.orientation)
            });
        }
    }

    destroy(): void {
        this.ceilingTween?.kill();
        super.destroy();
        this.images.ceilingContainer.destroy();
    }
}
