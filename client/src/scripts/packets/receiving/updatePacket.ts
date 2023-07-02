import type { Game } from "../../game";
import type { MinimapScene } from "../../scenes/minimapScene";

import { DeathMarker } from "../../objects/deathMarker";
import { explosion } from "../../objects/explosion";
import { Player } from "../../objects/player";
import { Obstacle } from "../../objects/obstacle";
import { Loot } from "../../objects/loot";

import { ReceivingPacket } from "../../types/receivingPacket";
import type { GameObject } from "../../types/gameObject";

import {
    GasState,
    ObjectCategory,
    PLAYER_ACTIONS_BITS,
    PlayerActions
} from "../../../../../common/src/constants";
import type { GunDefinition } from "../../../../../common/src/definitions/guns";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../../common/src/utils/objectType";
import { lerp, vecLerp } from "../../../../../common/src/utils/math";
import { v, vAdd } from "../../../../../common/src/utils/vector";
import { type HealingItemDefinition } from "../../../../../common/src/definitions/healingItems";
import { MINIMAP_SCALE } from "../../utils/constants";

export class UpdatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.playerManager.game.activePlayer;
        if (player === undefined) return;

        const game: Game = player.game;

        const playerManager = game.playerManager;

        const scene = player.scene;

        //
        // Active player data
        //

        // Health
        if (stream.readBoolean()) {
            playerManager.health = stream.readFloat(0, 100, 8);
            let roundedHealth = Math.round(playerManager.health);

            // This doesn't get set to the exact number because the stream has trouble reading it correctly.
            if (playerManager.health < 1 && playerManager.health > 0) roundedHealth = 1;

            const healthPercentage = `${roundedHealth}%`;
            const healthBar: JQuery<HTMLDivElement> = $("#health-bar");
            const healthBarPercentage: JQuery<HTMLSpanElement> = $("#health-bar-percentage");

            healthBar.width(healthPercentage);
            $("#health-bar-animation").width(healthPercentage);

            healthBarPercentage.text(playerManager.health < 1 && playerManager.health > 0 ? "1" : roundedHealth);

            if (playerManager.health < 60 && playerManager.health > 10) {
                healthBar.css("background-color", `rgb(255, ${(playerManager.health - 10) * 4}, ${(playerManager.health - 10) * 4})`);
            } else if (playerManager.health <= 10) {
                healthBar.css("background-color", `rgb(${playerManager.health * 15 + 105}, 0, 0)`);
            } else {
                healthBar.css("background-color", "#f8f9fa");
            }

            healthBarPercentage.css("color", playerManager.health <= 40 ? "#ffffff" : "#000000");
        }

        // Adrenaline
        if (stream.readBoolean()) {
            playerManager.adrenaline = stream.readFloat(0, 100, 8);
            $("#adrenaline-bar").width(`${playerManager.adrenaline}%`);
            const adrenalineBarPercentage: JQuery<HTMLSpanElement> = $("#adrenaline-bar-percentage");
            adrenalineBarPercentage.text(playerManager.adrenaline < 1 && playerManager.adrenaline > 0 ? "1" : Math.round(playerManager.adrenaline));
            adrenalineBarPercentage.css("color", playerManager.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        // Action
        if (stream.readBoolean()) {
            const action = stream.readBits(PLAYER_ACTIONS_BITS) as PlayerActions;
            let actionTime = 0;
            switch (action) {
                case PlayerActions.None:
                    $("#action-container").hide().stop();
                    // TODO Only stop the sound that's playing
                    scene.sounds.get(`${player.activeItem.idString}_reload`)?.stop();
                    scene.sounds.get("gauze")?.stop();
                    scene.sounds.get("medikit")?.stop();
                    scene.sounds.get("cola")?.stop();
                    scene.sounds.get("tablets")?.stop();
                    break;
                case PlayerActions.Reload: {
                    $("#action-container").show();
                    $("#action-name").text("Reloading...");
                    scene.playSound(`${player.activeItem.idString}_reload`);
                    actionTime = (player.activeItem.definition as GunDefinition).reloadTime;

                    break;
                }
                case PlayerActions.UseItem: {
                    $("#action-container").show();
                    const itemDef = stream.readObjectTypeNoCategory(ObjectCategory.Loot).definition as HealingItemDefinition;
                    $("#action-name").text(`${itemDef.useText} ${itemDef.name}`);
                    actionTime = itemDef.useTime;
                    scene.playSound(itemDef.idString);
                }
            }
            if (actionTime > 0) {
                $("#action-timer-anim").stop().width("0%").animate({ width: "100%" }, actionTime * 1000, "linear", () => {
                    $("#action-container").hide();
                });
            }
        }

        // Active player ID
        if (stream.readBoolean()) {
            const noID = game.activePlayer.id === -1;
            game.activePlayer.id = stream.readObjectID();
            if (noID) {
                game.objects.set(game.activePlayer.id, game.activePlayer);
            }
        }

        // Inventory
        playerManager.deserializeInventory(stream);

        //
        // Objects
        //

        // Full objects
        if (stream.readBoolean()) {
            const fullObjectCount = stream.readUint8();
            for (let i = 0; i < fullObjectCount; i++) {
                const type = stream.readObjectType();
                const id = stream.readObjectID();
                let object: GameObject | undefined;

                if (!game.objects.has(id)) {
                    switch (type.category) {
                        case ObjectCategory.Player: {
                            object = new Player(game, scene, type as ObjectType<ObjectCategory.Player>, id);
                            break;
                        }
                        case ObjectCategory.Obstacle: {
                            object = new Obstacle(game, scene, type as ObjectType<ObjectCategory.Obstacle>, id);
                            break;
                        }
                        case ObjectCategory.DeathMarker: {
                            object = new DeathMarker(game, scene, type as ObjectType<ObjectCategory.DeathMarker>, id);
                            break;
                        }
                        case ObjectCategory.Loot: {
                            object = new Loot(game, scene, type as ObjectType<ObjectCategory.Loot>, id);
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
            const partialObjectCount = stream.readUint8();
            for (let i = 0; i < partialObjectCount; i++) {
                const id = stream.readObjectID();
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
            const deletedObjectCount = stream.readUint8();
            for (let i = 0; i < deletedObjectCount; i++) {
                const id = stream.readObjectID();
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
            const bulletCount = stream.readUint8();
            for (let i = 0; i < bulletCount; i++) {
                const id = stream.readUint8();
                const bulletSourceDef = stream.readObjectTypeNoCategory(ObjectCategory.Loot).definition as GunDefinition;
                const initialPosition = stream.readPosition();
                const rotation = stream.readRotation(16);
                const maxDist = bulletSourceDef.ballistics.maxDistance;
                const finalPosition = vAdd(initialPosition, v(maxDist * Math.sin(rotation), -(maxDist * Math.cos(rotation))));

                // Spawn bullet
                const bullet = scene.add.image(
                    initialPosition.x * 20,
                    initialPosition.y * 20,
                    "main",
                    `${bulletSourceDef.ammoType}_trail.svg`
                ).setRotation(Phaser.Math.Angle.BetweenPoints(initialPosition, finalPosition)).setDepth(1);
                game.bullets.set(id, bullet);
                scene.tweens.add({
                    targets: bullet,
                    x: finalPosition.x * 20,
                    y: finalPosition.y * 20,
                    alpha: 0,
                    duration: 500,
                    onComplete: (): void => {
                        bullet.destroy(true);
                    }
                });
            }
        }

        // Deleted bullets
        if (stream.readBoolean()) {
            const destroyedBulletCount = stream.readUint8();
            for (let i = 0; i < destroyedBulletCount; i++) {
                const bulletID = stream.readUint8();
                const bullet: Phaser.GameObjects.Image | undefined = game.bullets.get(bulletID);
                if (bullet === undefined) {
                    console.warn(`Could not find bullet with ID ${bulletID}`);
                    continue;
                }
                bullet.destroy(true);
                game.bullets.delete(bulletID);
            }
        }

        // Explosions
        if (stream.readBoolean()) {
            const explosionCount = stream.readUint8();
            for (let i = 0; i < explosionCount; i++) {
                explosion(game,
                    game.activePlayer.scene,
                    stream.readObjectType() as ObjectType<ObjectCategory.Explosion>,
                    stream.readPosition());
            }
        }

        const minimap = scene.scene.get("minimap") as MinimapScene;

        // Gas
        if (stream.readBoolean()) {
            game.gas.state = stream.readBits(2);
            game.gas.initialDuration = stream.readBits(7);
            game.gas.oldPosition = stream.readPosition();
            game.gas.newPosition = stream.readPosition();
            game.gas.oldRadius = stream.readFloat(0, 2048, 16);
            game.gas.newRadius = stream.readFloat(0, 2048, 16);
            if (game.gas.state === GasState.Waiting) {
                scene.gasCircle.setPosition(game.gas.oldPosition.x * 20, game.gas.oldPosition.y * 20).setRadius(game.gas.oldRadius * 20);
                minimap.gasCircle.setPosition(game.gas.oldPosition.x * MINIMAP_SCALE, game.gas.oldPosition.y * MINIMAP_SCALE).setRadius(game.gas.oldRadius * MINIMAP_SCALE);
                // minimap.gasToCenterLine.setTo(game.gas.oldPosition.x * 10, game.gas.oldPosition.y * 10, minimap.playerIndicator.x, minimap.playerIndicator.y);
            }
        }

        // Gas percentage
        if (stream.readBoolean()) {
            const percentage = stream.readFloat(0, 1, 16);
            if (game.gas.state === GasState.Advancing) {
                const currentPosition = vecLerp(game.gas.oldPosition, game.gas.newPosition, percentage);
                const currentRadius = lerp(game.gas.oldRadius, game.gas.newRadius, percentage);
                scene.tweens.add({
                    targets: scene.gasCircle,
                    x: currentPosition.x * 20,
                    y: currentPosition.y * 20,
                    radius: currentRadius * 20,
                    duration: 30
                });
                scene.tweens.add({
                    targets: minimap.gasCircle,
                    x: currentPosition.x * MINIMAP_SCALE,
                    y: currentPosition.y * MINIMAP_SCALE,
                    radius: currentRadius * MINIMAP_SCALE,
                    duration: 30
                });
            }
        }

        // Alive count
        if (stream.readBoolean()) {
            const aliveCount = stream.readBits(7);
            $("#ui-players-alive").text(aliveCount);
        }
    }
}
