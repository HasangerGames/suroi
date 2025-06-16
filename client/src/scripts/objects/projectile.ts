import { GameConstants, ObjectCategory, ZIndexes } from "@common/constants";
import { type ThrowableDefinition } from "@common/definitions/items/throwables";
import { CircleHitbox } from "@common/utils/hitbox";
import { EaseFunctions, Numeric } from "@common/utils/math";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { randomBoolean, randomFloat, randomPointInsideCircle } from "@common/utils/random";
import { FloorTypes } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { MapManager } from "../managers/mapManager";
import { ParticleManager } from "../managers/particleManager";
import { SoundManager, type GameSound } from "../managers/soundManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, TEAMMATE_COLORS } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";
import type { Tween } from "../utils/tween";

export class Projectile extends GameObject.derive(ObjectCategory.Projectile) {
    definition!: ThrowableDefinition;

    hitbox = new CircleHitbox(0);

    readonly image = new SuroiSprite();
    hitSound?: GameSound;

    flickerSprite?: SuroiSprite;
    flickerTween?: Tween<SuroiSprite>;
    flickerTimeout?: number;

    activeSound?: GameSound;

    height!: number;
    halloweenSkin!: boolean;

    activated!: boolean;
    throwerTeamID?: number;
    tintIndex?: number;

    onFloor?: boolean;
    onWater = false;

    constructor(id: number, data: ObjectsNetData[ObjectCategory.Projectile]) {
        super(id);

        this.container.addChild(this.image);

        this.updateFromData(data, true);

        const { flicker, activeSound } = this.definition;

        if (flicker) {
            this.flickerSprite = new SuroiSprite(flicker.image)
                .setVPos(toPixiCoords(flicker.offset));
            this.container.addChild(this.flickerSprite);

            this.flickerTween = Game.addTween({
                target: this.flickerSprite,
                to: { angle: 20 },
                duration: 3000,
                ease: EaseFunctions.sineOut,
                yoyo: true,
                infinite: true
            });

            // Flicker algorithm:
            // We set a random target lightness between 0.75 and 1
            // Slowly increase/decrease the lightness in random increments until the target is reached
            // Once it's reached, pick a new target
            let lightness = 1;
            let target = 1;
            let increasing = false;
            const flickerFn = (): void => {
                if (!this.flickerSprite) return;

                if (increasing ? lightness >= target : lightness <= target) {
                    lightness = target;
                    target = randomFloat(0.75, 1);
                    increasing = lightness > target;
                }
                lightness += randomFloat(0.01, 0.05) * (increasing ? 1 : -1);
                this.flickerSprite.tint = [lightness, lightness, lightness];
                this.flickerTimeout = window.setTimeout(flickerFn, randomFloat(50, 1000));
            };
            flickerFn();
        }

        if (activeSound) {
            this.activeSound = this.playSound(activeSound, {
                dynamic: true,
                loop: true,
                maxRange: 64
            });
        }
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Projectile], isNew = false): void {
        if (data.full) {
            const full = data.full;

            const def = this.definition = full.definition;

            this.damageable = def.c4 ?? false;

            this.halloweenSkin = full.halloweenSkin;
            if (this.activated !== full.activated && this.definition.c4) {
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
        this.height = data.height;

        this.hitbox.position = this.position;
        if (this.activeSound) this.activeSound.position = this.position;

        this.container.scale = Numeric.remap(this.height, 0, GameConstants.projectiles.maxHeight, 1, 5);

        if (!GameConsole.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(data.position);
            this.container.rotation = this.rotation;
        }

        if (this.layer !== data.layer) {
            this.layer = data.layer;
            this.updateLayer();
        }

        const onFloorOld = this.onFloor;
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

        if (this.onFloor !== onFloorOld) {
            this.container.zIndex = this.onFloor ? ZIndexes.GroundedThrowables : ZIndexes.AirborneThrowables;
        }
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
        this.flickerSprite?.destroy();
        this.flickerTween?.kill();
        clearTimeout(this.flickerTimeout);
        this.activeSound?.stop();
    }
}
