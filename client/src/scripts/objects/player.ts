import Phaser from "phaser";
import gsap from "gsap";

import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import {
    ANIMATION_TYPE_BITS,
    AnimationType,
    ObjectCategory
} from "../../../../common/src/constants";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type Vector, vClone } from "../../../../common/src/utils/vector";
import { randomBoolean } from "../../../../common/src/utils/random";
import { MeleeDefinition } from "../../../../common/src/definitions/melees";

export class Player extends GameObject {
    name: string;

    private _health = 100;
    healthDirty = true;

    private _adrenaline = 100;
    adrenalineDirty = true;

    oldPosition: Vector;

    inputsDirty = false;

    movingUp = false;
    movingDown = false;
    movingLeft = false;
    movingRight = false;
    punching = false;

    animationSeq: boolean;

    hitEffect: boolean;

    body: Phaser.GameObjects.Image;
    leftFist: Phaser.GameObjects.Image;
    rightFist: Phaser.GameObjects.Image;
    container: Phaser.GameObjects.Container;

    emitter: Phaser.GameObjects.Particles.ParticleEmitter;

    weapon = ObjectType.fromString(ObjectCategory.Loot, "fists");

    distSinceLastFootstep = 0;

    constructor(game: Game, scene: GameScene) {
        super(game, scene);
        this.type = ObjectType.categoryOnly(ObjectCategory.Player);

        const weaponDef = this.weapon.definition as MeleeDefinition;

        this.body = this.scene.add.image(0, 0, "main", "player_base.svg");
        this.leftFist = this.scene.add.image(0, 0, "main", "player_fist.svg");
        this.rightFist = this.scene.add.image(0, 0, "main", "player_fist.svg");
        this.updateFistsPosition();

        this.container = this.scene.add.container(360, 360, [this.body, this.leftFist, this.rightFist]).setDepth(1);

        this.emitter = this.scene.add.particles(0, 0, "main", {
            frame: "blood_particle.svg",
            quantity: 1,
            rotate: { min: 0, max: 360 },
            lifespan: 1000,
            speed: { min: 20, max: 30 },
            scale: { start: 0.75, end: 1 },
            alpha: { start: 1, end: 0 },
            emitting: false
        }).setDepth(2);
    }

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        this._health = health;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    set adrenaline(adrenaline: number) {
        this._adrenaline = adrenaline;
    }

    /* eslint-disable @typescript-eslint/no-empty-function */

    deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();

        this.emitter.setPosition(this.position.x * 20, this.position.y * 20);

        if (!this.dead) {
            const oldAngle: number = this.container.angle;
            const newAngle: number = Phaser.Math.RadToDeg(stream.readRotation());
            const angleBetween: number = Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);

            gsap.to(this.container, {
                x: this.position.x * 20,
                y: this.position.y * 20,
                angle: oldAngle + angleBetween,
                ease: "none",
                duration: 0.03
            });
        } else {
            stream.readRotation(); // Discard rotation information
        }

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        const animationSeq = stream.readBoolean();
        if (!this.dead && this.animationSeq !== animationSeq && this.animationSeq !== undefined) {
            switch (animation) {
                case AnimationType.Punch: {
                    this.updateFistsPosition();
                    const weaponDef = this.weapon.definition as MeleeDefinition;
                    let altFist: boolean;
                    altFist = Math.random() < 0.5;
                    if (!weaponDef.fists.randomFist) altFist = true;

                    if (!weaponDef.fists.randomFist || !altFist) {
                        this.scene.tweens.add({
                            targets: this.leftFist,
                            x: weaponDef.fists.useLeft.x,
                            y: weaponDef.fists.useLeft.y,
                            duration: weaponDef.fists.animationDuration,
                            yoyo: true,
                            ease: "Linear"
                        });
                    }
                    if (altFist) {
                        this.scene.tweens.add({
                            targets: this.rightFist,
                            x: weaponDef.fists.useRight.x,
                            y: weaponDef.fists.useRight.y,
                            duration: weaponDef.fists.animationDuration,
                            yoyo: true,
                            ease: "Linear"
                        });
                    }

                    this.scene.playSound("swing");
                    break;
                }
            }
        }
        this.animationSeq = animationSeq;

        // Hit effect
        const hitEffect = stream.readBoolean();
        if (hitEffect !== this.hitEffect && this.hitEffect !== undefined) {
            this.emitter.emitParticle(1);
            this.scene.playSound(randomBoolean() ? "player_hit_1" : "player_hit_2");
        }

        this.hitEffect = hitEffect;
    }

    deserializeFull(stream: SuroiBitStream): void {
        const dead: boolean = stream.readBoolean();
        if (dead && !this.dead) {
            this.dead = true;
            this.destroy();
            return;
        }
        this.weapon = stream.readObjectType();
        this.updateFistsPosition();
    }

    updateFistsPosition(): void {
        const weaponDef = this.weapon.definition as MeleeDefinition;
        this.leftFist.setPosition(weaponDef.fists.normalLeft.x, weaponDef.fists.normalLeft.y);
        this.rightFist.setPosition(weaponDef.fists.normalRight.x, weaponDef.fists.normalRight.y);
    }

    destroy(): void {
        this.container.destroy(true);
        this.body.destroy(true);
        this.leftFist.destroy(true);
        this.rightFist.destroy(true);
        this.emitter.destroy(true);
    }
}
