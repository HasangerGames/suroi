import { ObjectCategory, ZIndexes } from "@common/constants";
import { type DecalDefinition } from "@common/definitions/decals";
import { getEffectiveZIndex } from "@common/utils/layer";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";
import { DebugRenderer } from "../utils/debugRenderer";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS } from "../utils/constants";

export class Decal extends GameObject.derive(ObjectCategory.Decal) {
    definition!: DecalDefinition;

    readonly image: SuroiSprite;

    constructor(id: number, data: ObjectsNetData[ObjectCategory.Decal]) {
        super(id);

        this.image = new SuroiSprite();

        this.layer = data.layer;

        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Decal]): void {
        this.position = data.position;

        this.layer = data.layer;

        const definition = this.definition = data.definition;

        this.image.setFrame(definition.image ?? definition.idString);
        this.container.addChild(this.image);
        this.container.scale.set(definition.scale ?? 1);

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = data.rotation;

        this.updateZIndex();
    }

    override updateZIndex(): void {
        const zIndex = this.doOverlay() && this.definition.zIndex === undefined
            ? ZIndexes.UnderWaterDeadObstacles
            : this.definition.zIndex ?? ZIndexes.Decals;
        this.container.zIndex = getEffectiveZIndex(zIndex, this.layer, Game.layer);
    }

    update(): void { /* bleh */ }
    updateInterpolation(): void { /* bleh */ }
    updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;

        DebugRenderer.addCircle(0.1 * (this.definition.scale ?? 1),
            this.position,
            HITBOX_COLORS.obstacleNoCollision,
            this.layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    override destroy(): void {
        this.image.destroy();
    }
}
