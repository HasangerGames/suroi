import { GameConstants, ObjectCategory, ZIndexes } from "@common/constants";
import { type ThrowableDefinition } from "@common/definitions/items/throwables";
import { CircleHitbox } from "@common/utils/hitbox";
import { getEffectiveZIndex } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { FloorTypes } from "@common/utils/terrain";
import { Vec } from "@common/utils/vector";
import { type Game } from "../game";
import type { GameSound } from "../managers/soundManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS } from "../utils/constants";
import type { DebugRenderer } from "../utils/debugRenderer";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class Projectile extends GameObject.derive(ObjectCategory.Projectile) {
    definition!: ThrowableDefinition;

    hitbox = new CircleHitbox(0);

    readonly image: SuroiSprite;
    hitSound?: GameSound;

    height!: number;
    halloweenSkin!: boolean;

    activated!: boolean;

    onFloor = false;
    onWater = false;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Projectile]) {
        super(game, id);

        this.image = new SuroiSprite();

        this.layer = data.layer;

        this.updateFromData(data, true);
        this.container.addChild(this.image);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Projectile], _isNew = false): void {
        if (data.full) {
            const full = data.full;

            const def = this.definition = full.definition;

            this.halloweenSkin = full.halloweenSkin;

            this.hitbox.radius = def.hitboxRadius;

            let sprite = def.animation.liveImage;
            if (this.activated && def.animation.activatedImage) {
                sprite = def.animation.activatedImage;
            }
            if (this.halloweenSkin && !def.noSkin) {
                sprite += "_halloween";
            }

            this.image.setAnchor(this.definition.image.anchor ?? Vec.create(0.5, 0.5));

            this.image.setFrame(sprite);
        }

        this.position = data.position;
        this.rotation = data.rotation;
        this.layer = data.layer;
        this.height = data.height;

        this.hitbox.position = this.position;

        this.container.scale = Numeric.remap(this.height, 0, GameConstants.projectiles.maxHeight, 1, 5);

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing")) {
            this.container.position = toPixiCoords(data.position);
            this.container.rotation = this.rotation;
        }

        this.layer = data.layer;

        const onWaterOld = this.onWater;
        this.onFloor = this.height <= 0;
        this.onWater = this.onFloor && !!FloorTypes[this.game.map.terrain.getFloor(this.position, this.layer)].overlay;

        this.container.alpha = this.onWater ? 0.5 : 1;

        if (this.onWater && this.onWater !== onWaterOld) {
            this.game.particleManager.spawnParticles(2, () => ({
                frames: "ripple_particle",
                zIndex: ZIndexes.Ground,
                position: randomPointInsideCircle(this.position, 1),
                lifetime: 1000,
                speed: Vec.create(0, 0),
                scale: {
                    start: randomFloat(0.45, 0.55),
                    end: randomFloat(2.95, 3.05)
                },
                alpha: {
                    start: randomFloat(0.55, 0.65),
                    end: 0
                }
            }));
        }

        this.updateZIndex();
    }

    override updateZIndex(): void {
        let zIndex = ZIndexes.AirborneThrowables;
        if (this.onWater) zIndex = ZIndexes.UnderwaterGroundedThrowables;
        else if (this.onFloor) zIndex = ZIndexes.GroundedThrowables;

        this.container.zIndex = getEffectiveZIndex(
            zIndex,
            this.layer,
            this.game.layer
        );
    }

    update(): void { /* bleh */ }
    updateInterpolation(): void {
        this.updateContainerPosition();
        this.updateContainerRotation();
    }

    updateDebugGraphics(debugRenderer: DebugRenderer): void {
        if (!DEBUG_CLIENT) return;

        debugRenderer.addCircle(
            this.definition.hitboxRadius,
            this.position,
            HITBOX_COLORS.projectiles,
            this.layer === this.game.activePlayer?.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    override destroy(): void {
        this.image.destroy();
    }
}
