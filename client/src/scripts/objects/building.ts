import { Container } from "pixi.js";
import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type BuildingDefinition } from "../../../../common/src/definitions/buildings";
import { type Orientation } from "../../../../common/src/typings";
import { type Hitbox } from "../../../../common/src/utils/hitbox";
import { velFromAngle } from "../../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomFloat, randomRotation } from "../../../../common/src/utils/random";
import type { Game } from "../game";
import { GameObject } from "../types/gameObject";

import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { orientationToRotation } from "../utils/misc";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { EaseFunctions, Tween } from "../utils/tween";

export class Building extends GameObject<ObjectCategory.Building> {
    override readonly type = ObjectCategory.Building;

    readonly ceilingContainer: Container;

    definition!: BuildingDefinition;

    ceilingHitbox?: Hitbox;
    ceilingTween?: Tween<Container>;

    orientation!: Orientation;

    ceilingVisible = true;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Building]>) {
        super(game, id);

        this.container.zIndex = ZIndexes.Ground;

        this.ceilingContainer = new Container();
        this.game.camera.addObject(this.ceilingContainer);

        this.updateFromData(data, true);
    }

    toggleCeiling(visible: boolean): void {
        if (this.ceilingVisible === visible) return;

        this.ceilingTween?.kill();

        this.ceilingTween = new Tween(
            this.game,
            {
                target: this.ceilingContainer,
                to: { alpha: visible ? 1 : 0 },
                duration: 200,
                ease: EaseFunctions.sineOut,
                onComplete: () => {
                    this.ceilingVisible = visible;
                }
            }
        );
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Building], isNew = false): void {
        if (data.full) {
            const full = data.full;
            this.definition = full.definition;
            this.position = full.position;

            for (const image of this.definition.floorImages ?? []) {
                const sprite = new SuroiSprite(image.key);
                sprite.setVPos(toPixiCoords(image.position));
                if (image.tint !== undefined) sprite.setTint(image.tint);
                this.container.addChild(sprite);
            }

            const pos = toPixiCoords(this.position);
            this.container.position.copyFrom(pos);
            this.ceilingContainer.position.copyFrom(pos);
            this.ceilingContainer.zIndex = this.definition.ceilingZIndex ?? ZIndexes.BuildingsCeiling;

            this.orientation = full.rotation;
            this.rotation = orientationToRotation(this.orientation);
            this.container.rotation = this.rotation;
            this.ceilingContainer.rotation = this.rotation;

            this.ceilingHitbox = this.definition.ceilingHitbox?.transform(this.position, 1, this.orientation);
        }

        const definition = this.definition;

        if (definition === undefined) {
            console.warn("Building partially updated before being fully updated");
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
                        ease: EaseFunctions.sextIn
                    },
                    scale: { start: 1, end: 0.2 },
                    speed: velFromAngle(randomRotation(), randomFloat(1, 2))
                }));
                this.playSound("ceiling_collapse", 0.5, 96);
            }
            this.ceilingTween?.kill();
            this.ceilingContainer.zIndex = ZIndexes.DeadObstacles;
            this.ceilingContainer.alpha = 1;

            this.ceilingContainer.addChild(new SuroiSprite(`${definition.idString}_residue`));
        }
        this.dead = data.dead;

        this.ceilingContainer.removeChildren();
        for (const image of definition.ceilingImages ?? []) {
            let key = image.key;
            if (this.dead && image.residue) key = image.residue;
            const sprite = new SuroiSprite(key);
            sprite.setVPos(toPixiCoords(image.position));
            if (image.tint !== undefined) sprite.setTint(image.tint);
            this.ceilingContainer.addChild(sprite);
        }

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();

            if (this.ceilingHitbox !== undefined) drawHitbox(this.ceilingHitbox, HITBOX_COLORS.buildingScopeCeiling, this.debugGraphics);

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

            drawHitbox(
                definition.spawnHitbox.transform(this.position, 1, this.orientation),
                HITBOX_COLORS.spawnHitbox,
                this.debugGraphics
            );

            if (definition.scopeHitbox) {
                drawHitbox(
                    definition.scopeHitbox.transform(this.position, 1, this.orientation),
                    HITBOX_COLORS.buildingZoomCeiling,
                    this.debugGraphics
                );
            }
        }
    }

    destroy(): void {
        super.destroy();
        this.ceilingTween?.kill();
        this.ceilingContainer.destroy();
    }
}
