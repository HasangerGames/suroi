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
import { MINIMAP_SCALE, UI_DEBUG_MODE } from "../../utils/constants";
import { Building } from "../../objects/building";
import { type BuildingDefinition } from "../../../../../common/src/definitions/buildings";
import { type EmoteDefinition } from "../../../../../common/src/definitions/emotes";
import { PlayerManager } from "../../utils/playerManager";
import $ from "jquery";

function adjustForLowValues(value: number): number {
    // this looks more math-y and easier to read, so eslint can shove it
    // eslint-disable-next-line yoda
    if (0 < value && value <= 1) return 1;
    return value;
}

function safeRound(value: number): number {
    return adjustForLowValues(Math.round(value));
}

export class UpdatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.playerManager.game.activePlayer;
        // if (player === undefined) return;

        const game = this.playerManager.game;
        const playerManager = this.playerManager;

        // Dirty values
        const maxMinStatsDirty = stream.readBoolean();
        const healthDirty = stream.readBoolean();
        const adrenalineDirty = stream.readBoolean();
        const zoomDirty = stream.readBoolean();
        const actionDirty = stream.readBoolean();
        const activePlayerDirty = stream.readBoolean();
        const fullObjectsDirty = stream.readBoolean();
        const partialObjectsDirty = stream.readBoolean();
        const deletedObjectsDirty = stream.readBoolean();
        const bulletsDirty = stream.readBoolean();
        const deletedBulletsDirty = stream.readBoolean();
        const explosionsDirty = stream.readBoolean();
        const emotesDirty = stream.readBoolean();
        const gasDirty = stream.readBoolean();
        const gasPercentageDirty = stream.readBoolean();
        const aliveCountDirty = stream.readBoolean();

        //
        // Active player data
        //

        // Max / min adrenaline and health
        if (maxMinStatsDirty) {
            playerManager.maxHealth = stream.readFloat32();
            playerManager.minAdrenaline = stream.readFloat32();
            playerManager.maxAdrenaline = stream.readFloat32();

            const minMaxAdren = $<HTMLSpanElement>("#adrenaline-bar-min-max");
            const maxHealth = $<HTMLSpanElement>("#health-bar-max");

            if (playerManager.maxHealth === PlayerManager.defaultMaxHealth) {
                maxHealth.text("").hide();
            } else {
                maxHealth.text(safeRound(playerManager.maxHealth)).show();
            }

            if (
                playerManager.maxAdrenaline === PlayerManager.defaultMaxAdrenaline &&
                playerManager.minAdrenaline === PlayerManager.defaultMinAdrenaline
            ) {
                minMaxAdren.text("").hide();
            } else {
                minMaxAdren.text(`${playerManager.minAdrenaline === 0 ? "" : `${safeRound(playerManager.minAdrenaline)}/`}${safeRound(playerManager.maxAdrenaline)}`).show();
            }
        }

        // Health
        if (healthDirty) {
            playerManager.health = stream.readFloat(0, playerManager.maxHealth, 12);
            const absolute = playerManager.health;
            const realPercentage = 100 * absolute / playerManager.maxHealth;
            const percentage = safeRound(realPercentage);

            const healthBar = $<HTMLDivElement>("#health-bar");
            const healthBarAmount = $<HTMLSpanElement>("#health-bar-percentage");

            healthBar.width(`${realPercentage}%`);
            $("#health-bar-animation").width(`${realPercentage}%`);

            healthBarAmount.text(safeRound(absolute));

            if (percentage === 100) {
                healthBar.css("background-color", "#bdc7d0");
            } else if (percentage < 60 && percentage > 10) {
                healthBar.css("background-color", `rgb(255, ${(percentage - 10) * 4}, ${(percentage - 10) * 4})`);
            } else if (percentage <= 10) {
                healthBar.css("background-color", `rgb(${percentage * 15 + 105}, 0, 0)`);
            } else {
                healthBar.css("background-color", "#f8f9fa");
            }

            healthBarAmount.css("color", percentage <= 40 ? "#ffffff" : "#000000");
        }

        // Adrenaline
        if (adrenalineDirty) {
            playerManager.adrenaline = stream.readFloat(playerManager.minAdrenaline, playerManager.maxAdrenaline, 10);

            const absolute = playerManager.adrenaline;
            const percentage = 100 * absolute / playerManager.maxAdrenaline;

            $("#adrenaline-bar").width(`${percentage}%`);

            const adrenalineBarPercentage = $<HTMLSpanElement>("#adrenaline-bar-percentage");
            adrenalineBarPercentage.text(safeRound(absolute));
            adrenalineBarPercentage.css("color", absolute < 7 ? "#ffffff" : "#000000");
        }

        // Zoom
        if (zoomDirty) {
            playerManager.zoom = stream.readUint8();
            game.camera.setZoom(playerManager.zoom);
        }

        // Action
        if (actionDirty) {
            const action = stream.readBits(PLAYER_ACTIONS_BITS) as PlayerActions;
            let actionTime = 0;
            switch (action) {
                case PlayerActions.None:
                    $("#action-container").hide().stop();
                    // TODO Only stop the sound that's playing
                    // scene.sounds.get(`${player.activeItem.idString}_reload`)?.stop();
                    // scene.sounds.get("gauze")?.stop();
                    // scene.sounds.get("medikit")?.stop();
                    // scene.sounds.get("cola")?.stop();
                    // scene.sounds.get("tablets")?.stop();
                    break;
                case PlayerActions.Reload: {
                    $("#action-container").show();
                    $("#action-name").text("Reloading...");
                    game.soundManager.play(`${player.activeItem.idString}_reload`);
                    actionTime = (player.activeItem.definition as GunDefinition).reloadTime;
                    break;
                }
                case PlayerActions.UseItem: {
                    $("#action-container").show();
                    const itemDef = stream.readObjectTypeNoCategory(ObjectCategory.Loot).definition as HealingItemDefinition;
                    $("#action-name").text(`${itemDef.useText} ${itemDef.name}`);
                    actionTime = itemDef.useTime;
                    game.soundManager.play(itemDef.idString);
                }
            }
            if (actionTime > 0) {
                $("#action-timer-anim").stop().width("0%").animate({ width: "100%" }, actionTime * 1000, "linear", () => {
                    $("#action-container").hide();
                });
            }
        }

        // Active player ID and name
        if (activePlayerDirty) {
            const activePlayerID = stream.readObjectID();
            const idChanged = game.activePlayer.id !== activePlayerID;
            if (idChanged) {
                // Destroy the old object representing the active player
                const activePlayer = game.objects.get(activePlayerID);
                if (activePlayer !== undefined) {
                    activePlayer.destroy();
                    game.objects.delete(activePlayerID);
                }

                // Reset the active player
                game.objects.delete(game.activePlayer.id);
                game.activePlayer.id = activePlayerID;
                game.activePlayer.distSinceLastFootstep = 0;
                game.activePlayer.isNew = true;
                game.objects.set(game.activePlayer.id, game.activePlayer);
            }
            // Name dirty
            if (stream.readBoolean()) {
                const name = stream.readPlayerNameWithColor();
                if (game.spectating) {
                    $("#game-over-screen").fadeOut();
                    $("#spectating-msg-info").html(`<span style="font-weight: 600">Spectating</span> <span style="margin-left: 3px">${name}</span>`);
                    $("#spectating-msg").show();
                    $("#spectating-buttons-container").show();
                }
            }
        }

        // Inventory
        playerManager.deserializeInventory(stream);

        //
        // Objects
        //

        // Full objects
        if (fullObjectsDirty) {
            const fullObjectCount = stream.readUint16();
            for (let i = 0; i < fullObjectCount; i++) {
                const type = stream.readObjectType();
                const id = stream.readObjectID();
                let object: GameObject | undefined;

                if (!game.objects.has(id)) {
                    switch (type.category) {
                        case ObjectCategory.Player: {
                            object = new Player(game, id);
                            game.players.add(object as Player);
                            break;
                        }
                        case ObjectCategory.Obstacle: {
                            object = new Obstacle(game, type as ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>, id);
                            break;
                        }
                        case ObjectCategory.DeathMarker: {
                            object = new DeathMarker(game, type as ObjectType<ObjectCategory.DeathMarker>, id);
                            break;
                        }
                        case ObjectCategory.Loot: {
                            object = new Loot(game, type as ObjectType<ObjectCategory.Loot, LootDefinition>, id);
                            break;
                        }
                        case ObjectCategory.Building: {
                            object = new Building(game, type as ObjectType<ObjectCategory.Building, BuildingDefinition>, id);
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
        if (partialObjectsDirty) {
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
        if (deletedObjectsDirty) {
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
                if (object instanceof Player) {
                    game.players.delete(object);
                }
            }
        }

        // Bullets
        if (bulletsDirty) {
            const bulletCount = stream.readUint8();
            for (let i = 0; i < bulletCount; i++) {
                const id = stream.readUint8();
                const source = stream.readObjectTypeNoCategory<ObjectCategory.Loot, GunDefinition>(ObjectCategory.Loot);
                const position = stream.readPosition();
                const rotation = stream.readRotation(16);

                const bullet = new Bullet(game, id, source, position, rotation);

                game.bullets.set(id, bullet);
            }
        }

        // Deleted bullets
        if (deletedBulletsDirty) {
            const destroyedBulletCount = stream.readUint8();
            for (let i = 0; i < destroyedBulletCount; i++) {
                const bulletID = stream.readUint8();
                const bullet = game.bullets.get(bulletID);
                if (bullet === undefined) {
                    console.warn(`Could not find bullet with ID ${bulletID}`);
                    continue;
                }
                bullet.dead = true;
            }
        }

        // Explosions
        if (explosionsDirty) {
            const explosionCount = stream.readUint8();
            for (let i = 0; i < explosionCount; i++) {
                explosion(
                    game,
                    stream.readObjectType<ObjectCategory.Explosion, ExplosionDefinition>(),
                    stream.readPosition()
                );
            }
        }

        // Emotes
        if (emotesDirty) {
            const emoteCount = stream.readBits(7);
            for (let i = 0; i < emoteCount; i++) {
                const emoteType = stream.readObjectTypeNoCategory<ObjectCategory.Emote, EmoteDefinition>(ObjectCategory.Emote);
                const playerID = stream.readObjectID();
                const player = this.playerManager.game.objects.get(playerID);
                if (player === undefined || !(player instanceof Player)) return;
                player.emote(emoteType);
            }
        }

        // Gas
        let gasPercentage: number | undefined;
        if (gasDirty) {
            game.gas.state = stream.readBits(2);
            game.gas.initialDuration = stream.readBits(7);
            game.gas.oldPosition = stream.readPosition();
            game.gas.newPosition = stream.readPosition();
            game.gas.oldRadius = stream.readFloat(0, 2048, 16);
            game.gas.newRadius = stream.readFloat(0, 2048, 16);
            let currentDuration: number | undefined;
            const percentageDirty = stream.readBoolean();
            if (percentageDirty) { // Percentage dirty
                gasPercentage = stream.readFloat(0, 1, 16);
                currentDuration = game.gas.initialDuration - Math.round(game.gas.initialDuration * gasPercentage);
            } else {
                currentDuration = game.gas.initialDuration;
            }
            if (!(percentageDirty && game.gas.firstPercentageReceived)) { // Ensures that gas messages aren't displayed when switching between players when spectating
                let gasMessage: string | undefined;
                // TODO Clean up code
                if (game.gas.state === GasState.Waiting) {
                    gasMessage = `Toxic gas advances in ${currentDuration}s`;
                    // scene.gasCircle.setPosition(game.gas.oldPosition.x * 20, game.gas.oldPosition.y * 20).setRadius(game.gas.oldRadius * 20);
                    // minimap.gasCircle.setPosition(game.gas.oldPosition.x * MINIMAP_SCALE, game.gas.oldPosition.y * MINIMAP_SCALE).setRadius(game.gas.oldRadius * MINIMAP_SCALE);
                    // minimap.gasNewPosCircle.setPosition(game.gas.newPosition.x * MINIMAP_SCALE, game.gas.newPosition.y * MINIMAP_SCALE).setRadius(game.gas.newRadius * MINIMAP_SCALE);
                    // if (game.gas.oldRadius === 0) {
                    //     minimap.gasToCenterLine.setTo(0, 0, 0, 0); // Disable the gas line if the gas has shrunk completely
                    // } else {
                    //     minimap.gasToCenterLine.setTo(
                    //         game.gas.newPosition.x * MINIMAP_SCALE,
                    //         game.gas.newPosition.y * MINIMAP_SCALE,
                    //         minimap.playerIndicator.x,
                    //         minimap.playerIndicator.y
                    //     );
                    // }
                } else if (game.gas.state === GasState.Advancing) {
                    gasMessage = "Toxic gas is advancing! Move to the safe zone";
                    // minimap.gasNewPosCircle.setPosition(game.gas.newPosition.x * MINIMAP_SCALE, game.gas.newPosition.y * MINIMAP_SCALE).setRadius(game.gas.newRadius * MINIMAP_SCALE);
                    // minimap.gasToCenterLine.setTo(
                    //     game.gas.newPosition.x * MINIMAP_SCALE,
                    //     game.gas.newPosition.y * MINIMAP_SCALE,
                    //     minimap.playerIndicator.x,
                    //     minimap.playerIndicator.y
                    // );
                } else if (game.gas.state === GasState.Inactive) {
                    gasMessage = "Waiting for players...";
                    // minimap.gasToCenterLine.setTo(0, 0, 0, 0); // Disable the gas line if the gas is inactive
                }

                if (game.gas.state === GasState.Advancing) {
                    $("#gas-timer").addClass("advancing");
                    $("#gas-timer-image").attr("src", "/img/misc/gas-advancing-icon.svg");
                } else {
                    $("#gas-timer").removeClass("advancing");
                    $("#gas-timer-image").attr("src", "/img/misc/gas-waiting-icon.svg");
                }

                if ((game.gas.state === GasState.Inactive || game.gas.initialDuration !== 0) && !UI_DEBUG_MODE) {
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
            game.gas.firstPercentageReceived = true;
        }

        // Gas percentage
        if (gasPercentageDirty) {
            gasPercentage = stream.readFloat(0, 1, 16);
        }
        if (gasPercentage !== undefined) {
            const time = game.gas.initialDuration - Math.round(game.gas.initialDuration * gasPercentage);
            $("#gas-timer-text").text(`${Math.floor(time / 60)}:${(time % 60) < 10 ? "0" : ""}${time % 60}`);
            if (game.gas.state === GasState.Advancing) {
                const currentPosition = vecLerp(game.gas.oldPosition, game.gas.newPosition, gasPercentage);
                const currentRadius = lerp(game.gas.oldRadius, game.gas.newRadius, gasPercentage);
                // scene.tweens.add({
                //     targets: scene.gasCircle,
                //     x: currentPosition.x * 20,
                //     y: currentPosition.y * 20,
                //     radius: currentRadius * 20,
                //     duration: 30
                // });
                // scene.tweens.add({
                //     targets: minimap.gasCircle,
                //     x: currentPosition.x * MINIMAP_SCALE,
                //     y: currentPosition.y * MINIMAP_SCALE,
                //     radius: currentRadius * MINIMAP_SCALE,
                //     duration: 30
                // });
            }
        }

        // Alive count
        if (aliveCountDirty) {
            const aliveCount = stream.readBits(7);
            $("#ui-players-alive").text(aliveCount);
        }
    }
}
