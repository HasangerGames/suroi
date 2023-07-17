import type { MinimapScene } from "../../scenes/minimapScene";

import { DeathMarker } from "../../objects/deathMarker";
import { explosion } from "../../objects/explosion";
import { Player } from "../../objects/player";
import { Obstacle } from "../../objects/obstacle";
import { Loot } from "../../objects/loot";
import { Bullet } from "../../objects/bullet";

import { ReceivingPacket } from "../../types/receivingPacket";
import type { GameObject } from "../../types/gameObject";

import { GasState, ObjectCategory, PLAYER_ACTIONS_BITS, PlayerActions } from "../../../../../common/src/constants";
import type { GunDefinition } from "../../../../../common/src/definitions/guns";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../../common/src/utils/objectType";
import { lerp, vecLerp } from "../../../../../common/src/utils/math";
import { type ObstacleDefinition } from "../../../../../common/src/definitions/obstacles";
import { type LootDefinition } from "../../../../../common/src/definitions/loots";
import { type ExplosionDefinition } from "../../../../../common/src/definitions/explosions";
import { type HealingItemDefinition } from "../../../../../common/src/definitions/healingItems";
import { MINIMAP_SCALE } from "../../utils/constants";

export class UpdatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player: Player = this.playerManager.game.activePlayer;
        if (player === undefined) return;

        const game = player.game;
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
            const healthBar = $<HTMLDivElement>("#health-bar");
            const healthBarAmount = $<HTMLSpanElement>("#health-bar-percentage");

            healthBar.width(healthPercentage);
            $("#health-bar-animation").width(healthPercentage);

            healthBarAmount.text(playerManager.health < 1 && playerManager.health > 0 ? "1" : roundedHealth);

            if (playerManager.health < 60 && playerManager.health > 10) {
                healthBar.css("background-color", `rgb(255, ${(playerManager.health - 10) * 4}, ${(playerManager.health - 10) * 4})`);
            } else if (playerManager.health <= 10) {
                healthBar.css("background-color", `rgb(${playerManager.health * 15 + 105}, 0, 0)`);
            } else {
                healthBar.css("background-color", "#f8f9fa");
            }

            healthBarAmount.css("color", playerManager.health <= 40 ? "#ffffff" : "#000000");
        }

        // Adrenaline
        if (stream.readBoolean()) {
            playerManager.adrenaline = stream.readFloat(0, 100, 8);
            $("#adrenaline-bar").width(`${playerManager.adrenaline}%`);
            const adrenalineBarPercentage: JQuery<HTMLSpanElement> = $("#adrenaline-bar-percentage");
            adrenalineBarPercentage.text(playerManager.adrenaline < 1 && playerManager.adrenaline > 0 ? "1" : Math.round(playerManager.adrenaline));
            adrenalineBarPercentage.css("color", playerManager.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        // Zoom

        if (stream.readBoolean()) {
            playerManager.zoom = stream.readUint8();
            scene.resize(true);
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
            const fullObjectCount = stream.readUint16();
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
                            object = new Obstacle(game, scene, type as ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>, id);
                            break;
                        }
                        case ObjectCategory.DeathMarker: {
                            object = new DeathMarker(game, scene, type as ObjectType<ObjectCategory.DeathMarker>, id);
                            break;
                        }
                        case ObjectCategory.Loot: {
                            object = new Loot(game, scene, type as ObjectType<ObjectCategory.Loot, LootDefinition>, id);
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
            const partialObjectCount = stream.readUint16();
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
            const deletedObjectCount = stream.readUint16();
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

                const bullet = new Bullet(game, scene, stream);

                game.bullets.set(id, bullet);
            }
        }

        // Deleted bullets
        if (stream.readBoolean()) {
            const destroyedBulletCount = stream.readUint8();
            for (let i = 0; i < destroyedBulletCount; i++) {
                const bulletID = stream.readUint8();
                const bullet = game.bullets.get(bulletID);
                if (bullet === undefined) {
                    console.warn(`Could not find bullet with ID ${bulletID}`);
                    continue;
                }
                bullet.destroy();
                game.bullets.delete(bulletID);
            }
        }

        // Explosions
        if (stream.readBoolean()) {
            const explosionCount = stream.readUint8();
            for (let i = 0; i < explosionCount; i++) {
                explosion(
                    game,
                    game.activePlayer.scene,
                    stream.readObjectType<ObjectCategory.Explosion, ExplosionDefinition>(),
                    stream.readPosition()
                );
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
            let gasMessage: string | undefined;
            // TODO Clean up code
            if (game.gas.state === GasState.Waiting) {
                gasMessage = `Toxic gas advances in ${game.gas.initialDuration}s`;
                scene.gasCircle.setPosition(game.gas.oldPosition.x * 20, game.gas.oldPosition.y * 20).setRadius(game.gas.oldRadius * 20);
                minimap.gasCircle.setPosition(game.gas.oldPosition.x * MINIMAP_SCALE, game.gas.oldPosition.y * MINIMAP_SCALE).setRadius(game.gas.oldRadius * MINIMAP_SCALE);
                minimap.gasNewPosCircle.setPosition(game.gas.newPosition.x * MINIMAP_SCALE, game.gas.newPosition.y * MINIMAP_SCALE).setRadius(game.gas.newRadius * MINIMAP_SCALE);
                if (game.gas.oldRadius === 0) {
                    minimap.gasToCenterLine.setTo(0, 0, 0, 0); // Disable the gas line if the gas has shrunk completely
                } else {
                    minimap.gasToCenterLine.setTo(
                        game.gas.newPosition.x * MINIMAP_SCALE,
                        game.gas.newPosition.y * MINIMAP_SCALE,
                        minimap.playerIndicator.x,
                        minimap.playerIndicator.y
                    );
                }
            } else if (game.gas.state === GasState.Advancing) {
                gasMessage = "Toxic gas is advancing! Move to the safe zone";
                minimap.gasNewPosCircle.setPosition(game.gas.newPosition.x * MINIMAP_SCALE, game.gas.newPosition.y * MINIMAP_SCALE).setRadius(game.gas.newRadius * MINIMAP_SCALE);
                minimap.gasToCenterLine.setTo(
                    game.gas.newPosition.x * MINIMAP_SCALE,
                    game.gas.newPosition.y * MINIMAP_SCALE,
                    minimap.playerIndicator.x,
                    minimap.playerIndicator.y
                );
            } else if (game.gas.state === GasState.Inactive) {
                gasMessage = "Waiting for players...";
                minimap.gasToCenterLine.setTo(0, 0, 0, 0); // Disable the gas line if the gas is inactive
            }

            if (game.gas.state === GasState.Advancing) {
                $("#gas-timer").addClass("advancing");
                $("#gas-timer-image").attr("src", require("../../../assets/img/misc/gas-advancing-icon.svg"));
            } else {
                $("#gas-timer").removeClass("advancing");
                $("#gas-timer-image").attr("src", require("../../../assets/img/misc/gas-waiting-icon.svg"));
            }

            if (game.gas.state === GasState.Inactive || game.gas.initialDuration !== 0) {
                $("#gas-msg-info").text(gasMessage ?? "");
                $("#gas-msg").fadeIn();
                if (game.gas.state === GasState.Inactive) {
                    $("#gas-msg-info").css("color", "white");
                } else {
                    $("#gas-msg-info").css("color", "cyan");
                    setTimeout(() => $("#gas-msg").fadeOut(1000), 5000);
                }
            }
        }

        // Gas percentage
        if (stream.readBoolean()) {
            const percentage = stream.readFloat(0, 1, 16);
            const time = game.gas.initialDuration - Math.round(game.gas.initialDuration * percentage);
            $("#gas-timer-text").text(`${Math.floor(time / 60)}:${(time % 60) < 10 ? "0" : ""}${time % 60}`);
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
