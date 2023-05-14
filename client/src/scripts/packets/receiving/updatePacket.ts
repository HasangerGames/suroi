import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import gsap from "gsap";
import { Obstacle } from "../../objects/obstacle";
import { type ObjectType } from "../../../../../common/src/utils/objectType";
import { distanceSquared } from "../../../../../common/src/utils/math";
import {
    ANIMATION_TYPE_BITS, AnimationType, ObjectCategory
} from "../../../../../common/src/constants";
import { type GameObject } from "../../types/gameObject";
import { type Game } from "../../game";
import { DeathMarker } from "../../objects/deathMarker";

export class UpdatePacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p === undefined) return;
        const game: Game = p.game;
        // const scene: Phaser.Scene = p.scene;

        //
        // Active player data
        //

        // Position and rotation
        const oldX: number = p.position.x, oldY: number = p.position.y;
        p.position = stream.readPosition();
        const oldAngle: number = p.container.angle;
        const newAngle: number = Phaser.Math.RadToDeg(stream.readRotation());
        const angleBetween: number = Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
        gsap.to(p.container, {
            x: p.position.x * 20,
            y: p.position.y * 20,
            angle: oldAngle + angleBetween,
            ease: "none",
            duration: 0.03
        });

        // Punching
        if (stream.readBits(ANIMATION_TYPE_BITS) === AnimationType.Punch) p.punch();

        // Play footstep sounds
        p.distSinceLastFootstep += distanceSquared(oldX, oldY, p.position.x, p.position.y);
        if (p.distSinceLastFootstep > 10) {
            const sound: string = Math.random() < 0.5 ? "grass_step_01" : "grass_step_02";

            // scene.sound.add(sound).play();
            p.scene.playSound(sound);

            p.distSinceLastFootstep = 0;
        }

        // Health
        if (stream.readBoolean()) {
            p.health = stream.readFloat(0, 100, 8);
            $("#health-bar").width(`${p.health}%`);
            $("#health-bar-animation").width(`${p.health}%`);
        }

        // Adrenaline
        if (stream.readBoolean()) {
            p.adrenaline = stream.readFloat(0, 100, 8);
        }

        //
        // Objects
        //

        // Full objects
        const fullObjectsDirty: boolean = stream.readBoolean();
        if (fullObjectsDirty) {
            const fullObjectCount: number = stream.readUint8();
            for (let i = 0; i < fullObjectCount; i++) {
                const type: ObjectType = stream.readObjectType();
                const id: number = stream.readUint16();
                let object: GameObject | undefined;
                switch (type.category) {
                    case ObjectCategory.Player: {
                        break;
                    }
                    case ObjectCategory.Obstacle: {
                        object = new Obstacle(this.player.game, this.player.scene);
                        break;
                    }
                    case ObjectCategory.DeathMarker: {
                        object = new DeathMarker(this.player.game, this.player.scene);
                        break;
                    }
                }
                if (object === undefined) {
                    console.warn(`Unknown object category: ${type.category}`);
                    continue;
                }
                object.type = type;
                object.id = id;
                object.deserializePartial(stream);
                object.deserializeFull(stream);
                game.objects.set(object.id, object);
            }
        }

        // Partial objects
        const partialObjectsDirty: boolean = stream.readBoolean();
        if (partialObjectsDirty) {
            const partialObjectCount: number = stream.readUint8();
            for (let i = 0; i < partialObjectCount; i++) {
                const id: number = stream.readUint16();
                const object: GameObject | undefined = game.objects.get(id);
                if (object === undefined) {
                    console.warn(`Unknown partial object with ID ${id}`);
                    continue;
                }
                object.deserializePartial(stream);
            }
        }

        // Deleted objects
        const deletedObjectsDirty: boolean = stream.readBoolean();
        if (deletedObjectsDirty) {
            const deletedObjectCount: number = stream.readUint8();
            for (let i = 0; i < deletedObjectCount; i++) {
                const id: number = stream.readUint16();
                const object: GameObject | undefined = game.objects.get(id);
                if (object === undefined) {
                    console.warn(`Trying to delete unknown object with ID ${id}`);
                    continue;
                }
                object.destroy();
                game.objects.delete(id);
            }
        }
    }
}
