import { type Game } from "../../game";

import { DeathMarker } from "../../objects/deathMarker";
import { explosion } from "../../objects/explosion";
import { Player } from "../../objects/player";
import { Obstacle } from "../../objects/obstacle";

import { ReceivingPacket } from "../../types/receivingPacket";
import { type GameObject } from "../../types/gameObject";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../../common/src/utils/objectType";
import { distanceSquared } from "../../../../../common/src/utils/math";
import { ObjectCategory } from "../../../../../common/src/constants";

export class UpdatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p === undefined) return;
        const game: Game = p.game;

        //
        // Active player data
        //

        // Partial data is sent for the active player every tick
        p.deserializePartial(stream);

        // Play footstep sounds
        if (p.oldPosition !== undefined) {
            p.distSinceLastFootstep += distanceSquared(p.oldPosition.x, p.oldPosition.y, p.position.x, p.position.y);
            if (p.distSinceLastFootstep > 10) {
                const sound: string = Math.random() < 0.5 ? "grass_step_01" : "grass_step_02";
                p.scene.playSound(sound);

                p.distSinceLastFootstep = 0;
            }
        }

        // Health
        if (stream.readBoolean()) {
            p.health = stream.readFloat(0, 100, 8);
            $("#health-bar").width(`${p.health}%`);
            $("#health-bar-animation").width(`${p.health}%`);
            if (p.health < 60 && p.health > 10) {
                $("#health-bar").css("background-color", `rgb(255, ${(p.health - 10) * 4}, ${(p.health - 10) * 4})`);
            } else if (p.health <= 10) {
                $("#health-bar").css("background-color", `rgb(${p.health * 10 + 155}, 0, 0)`);
            } else {
                $("#health-bar").css("background-color", "#f8f9fa");
            }
        }

        // Adrenaline
        if (stream.readBoolean()) {
            p.adrenaline = stream.readFloat(0, 100, 8);
        }

        // Active player ID
        if (stream.readBoolean()) {
            const noID: boolean = game.activePlayer.id === undefined;
            game.activePlayer.id = stream.readUint16();
            if (noID) {
                game.objects.set(game.activePlayer.id, game.activePlayer);
            }
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

                if (!game.objects.has(id)) {
                    switch (type.category) {
                        case ObjectCategory.Player: {
                            object = new Player(this.player.game, this.player.scene, type as ObjectType<ObjectCategory.Player>, id);
                            break;
                        }
                        case ObjectCategory.Obstacle: {
                            object = new Obstacle(this.player.game, this.player.scene, type as ObjectType<ObjectCategory.Obstacle>, id);
                            break;
                        }
                        case ObjectCategory.DeathMarker: {
                            object = new DeathMarker(this.player.game, this.player.scene, type, id);
                            break;
                        }
                    }

                    if (object === undefined) {
                        console.warn(`Unknown object category: ${type.category}`);
                        continue;
                    }

                    game.objects.set(object.id, object);
                } else {
                    const objectFromSet: GameObject | undefined = game.objects.get(id);
                    if (objectFromSet === undefined) {
                        console.warn(`Could not find object with ID ${id}`);
                        continue;
                    }
                    object = objectFromSet;
                }
                object.deserializePartial(stream);
                object.deserializeFull(stream);
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

        // Explosions
        const newExplosions = stream.readBoolean();
        if (newExplosions) {
            const explosionCount = stream.readUint8();
            for (let i = 0; i < explosionCount; i++) {
                explosion(game,
                    this.player.scene,
                    stream.readObjectType() as ObjectType<ObjectCategory.Explosion>,
                    stream.readPosition());
            }
        }

        // Alive count
        if (stream.readBoolean()) {
            const aliveCount = stream.readBits(7);
            $("#ui-players-alive").text(aliveCount);
        }
    }
}
