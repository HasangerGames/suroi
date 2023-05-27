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
import { type GunDefinition } from "../../../../../common/src/definitions/guns";

export class UpdatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.player;
        if (player === undefined) return;
        const game: Game = player.game;

        //
        // Active player data
        //

        // Partial data is sent for the active player every tick
        player.deserializePartial(stream);

        // Play footstep sounds
        if (player.oldPosition !== undefined) {
            player.distSinceLastFootstep += distanceSquared(player.oldPosition.x, player.oldPosition.y, player.position.x, player.position.y);
            if (player.distSinceLastFootstep > 10) {
                player.scene.playSound(Math.random() < 0.5 ? "grass_step_01" : "grass_step_02");

                player.distSinceLastFootstep = 0;
            }
        }

        // Health
        if (stream.readBoolean()) {
            player.health = stream.readFloat(0, 100, 8);
            const roundedHealth = Math.round(player.health);
            const healthPercentage = `${roundedHealth}%`;
            $("#health-bar").width(healthPercentage);
            $("#health-bar-animation").width(healthPercentage);
            $("#health-bar-percentage").text(roundedHealth);

            if (player.health < 60 && player.health > 10) {
                $("#health-bar").css("background-color", `rgb(255, ${(player.health - 10) * 4}, ${(player.health - 10) * 4})`);
            } else if (player.health <= 10) {
                $("#health-bar").css("background-color", `rgb(${player.health * 10 + 155}, 0, 0)`);
            } else {
                $("#health-bar").css("background-color", "#f8f9fa");
            }
        }

        // Adrenaline
        if (stream.readBoolean()) {
            player.adrenaline = stream.readFloat(0, 100, 8);
        }

        // Active player ID
        if (stream.readBoolean()) {
            const noID: boolean = game.activePlayer.id === undefined;
            game.activePlayer.id = stream.readUint16();
            if (noID) {
                game.objects.set(game.activePlayer.id, game.activePlayer);
            }
        }

        // Active item index
        if (stream.readBoolean()) {
            game.activePlayer.activeItemIndex = stream.readUint8();
        }

        //
        // Objects
        //

        // Full objects
        if (stream.readBoolean()) {
            const fullObjectCount: number = stream.readUint8();
            for (let i = 0; i < fullObjectCount; i++) {
                const type = stream.readObjectType();
                const id = stream.readUint16();
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
        if (stream.readBoolean()) {
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
        if (stream.readBoolean()) {
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

        // Bullets
        if (stream.readBoolean()) {
            const bulletCount: number = stream.readUint8();
            for (let i = 0; i < bulletCount; i++) {
                const bulletSourceDef = stream.readObjectTypeNoCategory(ObjectCategory.Loot).definition as GunDefinition;
                const initialPosition = stream.readPosition();
                const finalPosition = stream.readPosition();

                // Play firing sound
                if (Phaser.Math.Distance.BetweenPoints(player.position, initialPosition) < 50) {
                    player.scene.playSound(`${bulletSourceDef.idString}_fire`);
                }

                const bulletTrail = player.scene.add.image(
                    initialPosition.x * 20,
                    initialPosition.y * 20,
                    "main",
                    `${bulletSourceDef.idString}_trail.svg`
                ).setRotation(Phaser.Math.Angle.BetweenPoints(initialPosition, finalPosition));
                player.scene.tweens.add({
                    targets: bulletTrail,
                    x: finalPosition.x * 20,
                    y: finalPosition.y * 20,
                    alpha: 0,
                    duration: 500,
                    onComplete: (): void => {
                        bulletTrail.destroy(true);
                    }
                });
            }
        }

        // Explosions
        if (stream.readBoolean()) {
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
