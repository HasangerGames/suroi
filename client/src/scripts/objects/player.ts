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
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { type GunDefinition } from "../../../../common/src/definitions/guns";

export class Player extends GameObject<ObjectCategory.Player> {
    name!: string;

    private _health = 100;

    private _adrenaline = 100;

    oldPosition!: Vector;

    readonly movement = {
        up: false,
        left: false,
        down: false,
        right: false
    };

    readonly dirty = {
        health: true,
        adrenaline: true,
        inputs: true
    };

    #attacking = false;
    get attacking(): boolean { return this.#attacking; }
    set attacking(v: boolean) {
        this.#attacking = v;
        this.dirty.inputs = true;
    }

    _lastItemIndex = 0;
    get lastItemIndex(): number { return this._lastItemIndex; }

    private _activeItemIndex = 0;
    get activeItemIndex(): number { return this._activeItemIndex; }
    set activeItemIndex(v: number) {
        this._lastItemIndex = this._activeItemIndex;
        this._activeItemIndex = v;
        this.dirty.inputs = true;
        this.updateInventoryUI();
    }

    activeItem = ObjectType.fromString(ObjectCategory.Loot, "fists");

    isNew = true;

    animationSeq!: boolean;

    hitEffect!: boolean;

    readonly images: {
        readonly body: Phaser.GameObjects.Image
        readonly leftFist: Phaser.GameObjects.Image
        readonly rightFist: Phaser.GameObjects.Image
        readonly weaponImg: Phaser.GameObjects.Image
        readonly container: Phaser.GameObjects.Container
    };

    emitter: Phaser.GameObjects.Particles.ParticleEmitter;

    distSinceLastFootstep = 0;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Player>, id: number) {
        super(game, scene, type, id);

        //bug created player doesn't have correct weapon deployed; this is a semi-visual bug, because the user can still
        // use their gun, but the client-side code believes that the player has a melee weapon

        const images = {
            body: this.scene.add.image(0, 0, "main", "player_base.svg"),
            leftFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            rightFist: this.scene.add.image(0, 0, "main", "player_fist.svg"),
            weaponImg: this.scene.add.image(0, 0, "main"),
            container: undefined as unknown as Phaser.GameObjects.Container
        };
        images.container = this.scene.add.container(360, 360, [images.body, images.leftFist, images.rightFist, images.weaponImg]).setDepth(1);
        this.images = images;

        this.updateFistsPosition();

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

    override deserializePartial(stream: SuroiBitStream): void {
        // Position and rotation
        if (this.position !== undefined) this.oldPosition = vClone(this.position);
        this.position = stream.readPosition();

        this.emitter.setPosition(this.position.x * 20, this.position.y * 20);

        if (!this.dead) {
            const oldAngle = this.images.container.angle;
            const newAngle = Phaser.Math.RadToDeg(stream.readRotation(16));
            const angleBetween = Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);

            gsap.to(this.images.container, {
                x: this.position.x * 20,
                y: this.position.y * 20,
                angle: oldAngle + angleBetween,
                ease: "none",
                duration: 0.03
            });
        } else {
            stream.readRotation(16); // Discard rotation information
        }

        // Animation
        const animation: AnimationType = stream.readBits(ANIMATION_TYPE_BITS);
        const animationSeq = stream.readBoolean();
        if (!this.dead && this.animationSeq !== animationSeq && this.animationSeq !== undefined) {
            switch (animation) {
                case AnimationType.Punch: {
                    this.updateFistsPosition();
                    const weaponDef = this.activeItem.definition as MeleeDefinition;
                    if (weaponDef.fists.useLeft === undefined) break;

                    const altFist = !weaponDef.fists.randomFist || Math.random() < 0.5;

                    const target = altFist
                        ? {
                            fist: this.images.leftFist,
                            rigging: weaponDef.fists.useLeft
                        }
                        : {
                            fist: this.images.rightFist,
                            rigging: weaponDef.fists.useRight
                        };

                    this.scene.tweens.add({
                        targets: target.fist,
                        x: target.rigging.x,
                        y: target.rigging.y,
                        duration: weaponDef.fists.animationDuration,
                        yoyo: true,
                        ease: Phaser.Math.Easing.Cubic.Out
                    });

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

    override deserializeFull(stream: SuroiBitStream): void {
        const dead = stream.readBoolean();

        if (dead && !this.dead) {
            this.dead = true;
            this.destroy();
            return;
        }

        this.activeItem = stream.readObjectType() as ObjectType<ObjectCategory.Loot>;
        this.updateFistsPosition();
    }

    // I don't know if this should be here, we'll probably
    // have to move it into a more dedicated UI-managing system
    updateInventoryUI(): void {
        $("#weapons-container").children("*").each((index, ele) => {
            if (index !== this._activeItemIndex) {
                ele.classList.remove("active");
            } else {
                ele.classList.add("active");
            }
        });
    }

    updateFistsPosition(): void {
        const weaponDef = this.activeItem.definition as GunDefinition | MeleeDefinition;
        if (this.isNew) {
            this.isNew = false;
            this.images.leftFist.setPosition(weaponDef.fists.left.x, weaponDef.fists.left.y);
            this.images.rightFist.setPosition(weaponDef.fists.right.x, weaponDef.fists.right.y);
        } else {
            this.scene.tweens.add({
                targets: this.images.leftFist,
                x: weaponDef.fists.left.x,
                y: weaponDef.fists.left.y,
                duration: weaponDef.fists.animationDuration,
                ease: "Linear"
            });
            this.scene.tweens.add({
                targets: this.images.rightFist,
                x: weaponDef.fists.right.x,
                y: weaponDef.fists.right.y,
                duration: weaponDef.fists.animationDuration,
                ease: "Linear"
            });
        }

        this.images.weaponImg.setVisible(weaponDef.image !== undefined);
        if (weaponDef.image !== undefined) {
            this.images.weaponImg.setFrame(`${weaponDef.idString}-world.svg`);
            this.images.weaponImg.setPosition(weaponDef.image.position.x, weaponDef.image.position.y);
            this.images.weaponImg.setAngle(weaponDef.image.angle);
            this.scene.playSound(`${this.activeItem.idString}_switch`);
            if (this.images.container !== undefined) this.images.container.bringToTop(this.images.body);
        } else {
            if (this.images.container !== undefined) this.images.container.sendToBack(this.images.body);
        }
    }

    destroy(): void {
        this.images.container.destroy(true);
        this.images.body.destroy(true);
        this.images.leftFist.destroy(true);
        this.images.rightFist.destroy(true);
        this.images.weaponImg.destroy(true);
        this.emitter.destroy(true);
    }
}
