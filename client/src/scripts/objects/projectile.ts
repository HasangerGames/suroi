import { GameConstants, ObjectCategory, ZIndexes } from "@common/constants";
import { type ThrowableDefinition } from "@common/definitions/items/throwables";
import { getEffectiveZIndex } from "@common/utils/layer";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";
import { DebugRenderer } from "../utils/debugRenderer";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, TEAMMATE_COLORS } from "../utils/constants";
import { CircleHitbox } from "@common/utils/hitbox";
import { Numeric } from "@common/utils/math";
import { Vec, type Vector } from "@common/utils/vector";
import { FloorTypes } from "@common/utils/terrain";
import { randomBoolean, randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { SoundManager, type GameSound } from "../managers/soundManager";
import { GameConsole } from "../console/gameConsole";
import { MapManager } from "../managers/mapManager";
import { ParticleManager } from "../managers/particleManager";

export class Projectile extends GameObject.derive(ObjectCategory.Projectile) {
    definition!: ThrowableDefinition;

    hitbox = new CircleHitbox(0);

    readonly image: SuroiSprite;
    hitSound?: GameSound;

    height!: number;
    halloweenSkin!: boolean;

    activated!: boolean;
    throwerTeamID?: number;
    tintIndex?: number;

    onFloor = false;
    onWater = false;

    constructor(id: number, data: ObjectsNetData[ObjectCategory.Projectile]) {
        super(id);

        this.image = new SuroiSprite();

        this.layer = data.layer;

        this.updateFromData(data, true);
        this.container.addChild(this.image);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Projectile], isNew = false): void {
        if (data.full) {
            const full = data.full;

            const def = this.definition = full.definition;

            this.halloweenSkin = full.halloweenSkin;
            if (this.activated !== full.activated) {
                this.playSound("c4_beep");
            }
            this.activated = full.activated;

            this.throwerTeamID = full.c4?.throwerTeamID;
            this.tintIndex = full.c4?.tintIndex;

            this.hitbox.radius = def.hitboxRadius;

            if (Game.teamMode
                && this.throwerTeamID !== undefined
                && this.tintIndex !== undefined
                && Game.teamID === this.throwerTeamID
            ) {
                this.image.setTint(TEAMMATE_COLORS[this.tintIndex]);
            }

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

        if (!GameConsole.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(data.position);
            this.container.rotation = this.rotation;
        }

        this.layer = data.layer;

        const onWaterOld = this.onWater;
        this.onFloor = this.height <= 0;
        this.onWater = this.onFloor && !!FloorTypes[MapManager.terrain.getFloor(this.position, this.layer)].overlay;

        this.container.alpha = this.onWater ? 0.5 : 1;

        if (this.onWater && this.onWater !== onWaterOld) {
            ParticleManager.spawnParticles(2, () => ({
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
            Game.layer
        );
    }

    update(): void { /* bleh */ }
    updateInterpolation(): void {
        this.updateContainerPosition();
        this.updateContainerRotation();
    }

    updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;

        DebugRenderer.addCircle(
            this.definition.hitboxRadius,
            this.position,
            HITBOX_COLORS.projectiles,
            this.layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    hitEffect(position: Vector, angle: number): void {
        if (!this.definition.c4) return;

        this.hitSound?.stop();
        this.hitSound = SoundManager.play(
            `stone_hit_${randomBoolean() ? "1" : "2"}`,
            {
                position,
                falloff: 0.2,
                maxRange: 96
            }
        );

        ParticleManager.spawnParticles(4, () => {
            return {
                frames: this.halloweenSkin ? "plumpkin_particle" : "metal_particle",
                position,
                layer: this.layer,
                zIndex: Numeric.max(ZIndexes.Players + 1, 4),
                lifetime: 600,
                scale: { start: 0.9, end: 0.2 },
                alpha: { start: 1, end: 0.65 },
                speed: Vec.fromPolar((angle + randomFloat(0, 2 * Math.PI)), randomFloat(2.5, 4.5))
            };
        });
    }

    override destroy(): void {
        this.image.destroy();
    }
}
