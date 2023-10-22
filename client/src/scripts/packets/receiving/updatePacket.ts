import $ from "jquery";
import { GasState, ObjectCategory } from "../../../../../common/src/constants";
import { type EmoteDefinition } from "../../../../../common/src/definitions/emotes";
import { Explosions, type ExplosionDefinition } from "../../../../../common/src/definitions/explosions";
import { type GunDefinition } from "../../../../../common/src/definitions/guns";
import { lerp, vecLerp } from "../../../../../common/src/utils/math";
import type { ObjectType } from "../../../../../common/src/utils/objectType";
import { ObjectSerializations, type ObjectsNetData } from "../../../../../common/src/utils/objectsSerializations";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { vClone } from "../../../../../common/src/utils/vector";
import { Bullet } from "../../objects/bullet";
import { explosion } from "../../objects/explosion";
import { Player } from "../../objects/player";
import { ReceivingPacket } from "../../types/receivingPacket";
import { UI_DEBUG_MODE } from "../../utils/constants";
import { formatDate } from "../../utils/misc";
import { PlayerManager } from "../../utils/playerManager";

function adjustForLowValues(value: number): number {
    // this looks more math-y and easier to read, so eslint can shove it
    // eslint-disable-next-line yoda
    if (0 < value && value <= 1) return 1;
    return Math.round(value);
}

function safeRound(value: number): number {
    return adjustForLowValues(value);
}

export class UpdatePacket extends ReceivingPacket {
    readonly fullDirtyObjects = new Set<{
        readonly id: number
        readonly type: ObjectType
        readonly data: ObjectsNetData[ObjectCategory]
    }>();

    readonly partialDirtyObjects = new Set<{
        readonly id: number
        readonly data: ObjectsNetData[ObjectCategory]
    }>();

    readonly deletedObjects = new Array<number>();

    override deserialize(stream: SuroiBitStream): void {
        const game = this.game;
        const playerManager = this.playerManager;

        // Dirty values
        const maxMinStatsDirty = stream.readBoolean();
        const healthDirty = stream.readBoolean();
        const adrenalineDirty = stream.readBoolean();
        const zoomDirty = stream.readBoolean();
        const activePlayerDirty = stream.readBoolean();
        const fullObjectsDirty = stream.readBoolean();
        const partialObjectsDirty = stream.readBoolean();
        const deletedObjectsDirty = stream.readBoolean();
        const bulletsDirty = stream.readBoolean();
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
            const oldHealth = playerManager.health;
            playerManager.health = stream.readFloat(0, playerManager.maxHealth, 12);
            const absolute = playerManager.health;
            const realPercentage = 100 * absolute / playerManager.maxHealth;
            const percentage = safeRound(realPercentage);

            const healthBar = $<HTMLDivElement>("#health-bar");
            const healthBarAmount = $<HTMLSpanElement>("#health-bar-percentage");

            healthBar.width(`${realPercentage}%`);

            if (oldHealth > playerManager.health) $("#health-bar-animation").width(`${realPercentage}%`);

            healthBarAmount.text(safeRound(absolute));

            if (percentage === 100) {
                healthBar.css("background-color", "#bdc7d0");
            } else if (percentage < 60 && percentage > 25) {
                healthBar.css("background-color", `rgb(255, ${(percentage - 10) * 4}, ${(percentage - 10) * 4})`);
            } else if (percentage <= 25) {
                healthBar.css("background-color", "#ff0000");
            } else {
                healthBar.css("background-color", "#f8f9fa");
            }
            healthBar.toggleClass("flashing", percentage <= 25);

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
            game.camera.zoom = playerManager.zoom;
        }

        // Active player ID and name
        if (activePlayerDirty) {
            game.activePlayerID = stream.readObjectID();
            // Name dirty
            if (stream.readBoolean()) {
                const name = stream.readPlayerNameWithColor();
                if (game.spectating) {
                    $("#game-over-overlay").fadeOut();
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

        type GeneralDeserializationFunction = (stream: SuroiBitStream, type: ObjectType) => ObjectsNetData[ObjectCategory];

        // Full objects
        if (fullObjectsDirty) {
            const fullObjectCount = stream.readUint16();
            for (let i = 0; i < fullObjectCount; i++) {
                const type = stream.readObjectType();
                const id = stream.readObjectID();
                const data = (ObjectSerializations[type.category].deserializeFull as GeneralDeserializationFunction)(stream, type);

                this.fullDirtyObjects.add({
                    id,
                    type,
                    data
                });
            }
        }

        // Partial objects
        if (partialObjectsDirty) {
            const partialObjectCount = stream.readUint16();
            for (let i = 0; i < partialObjectCount; i++) {
                const type = stream.readObjectType();
                const id = stream.readObjectID();

                const data = (ObjectSerializations[type.category].deserializePartial as GeneralDeserializationFunction)(stream, type);
                this.partialDirtyObjects.add({
                    id,
                    data
                });
            }
        }

        // Deleted objects
        if (deletedObjectsDirty) {
            const deletedObjectCount = stream.readUint16();
            for (let i = 0; i < deletedObjectCount; i++) {
                const id = stream.readObjectID();
                this.deletedObjects.push(id);
            }
        }

        // Bullets
        if (bulletsDirty) {
            const bulletCount = stream.readUint8();
            for (let i = 0; i < bulletCount; i++) {
                game.bullets.add(
                    new Bullet(
                        game,
                        {
                            source: stream.readObjectType<ObjectCategory.Loot | ObjectCategory.Explosion, GunDefinition | ExplosionDefinition>().definition,
                            position: stream.readPosition(),
                            rotation: stream.readRotation(16),
                            variance: stream.readFloat(0, 1, 4),
                            reflectionCount: stream.readBits(2),
                            sourceID: stream.readObjectID()
                        }
                    )
                );
            }
        }

        // Explosions
        if (explosionsDirty) {
            const explosionCount = stream.readUint8();
            for (let i = 0; i < explosionCount; i++) {
                explosion(
                    game,
                    Explosions.definitions[stream.readUint8()],
                    stream.readPosition()
                );
            }
        }

        // Emotes
        if (emotesDirty) {
            const emoteCount = stream.readBits(7);
            for (let i = 0; i < emoteCount; i++) {
                const emoteType = stream.readObjectTypeNoCategory<ObjectCategory.Emote, EmoteDefinition>(ObjectCategory.Emote).definition;
                const player = game.objects.get(stream.readObjectID());
                if (player instanceof Player) player.emote(emoteType);
            }
        }

        // Gas
        const gas = game.gas;
        let gasPercentage: number | undefined;
        let [
            isInactive,
            isWaiting,
            isAdvancing
        ] = [
            gas.state === GasState.Inactive,
            gas.state === GasState.Waiting,
            gas.state === GasState.Advancing
        ];

        if (gasDirty) {
            gas.state = stream.readBits(2);
            gas.initialDuration = stream.readBits(7);
            gas.oldPosition = stream.readPosition();
            gas.newPosition = stream.readPosition();
            gas.oldRadius = stream.readFloat(0, 2048, 16);
            gas.newRadius = stream.readFloat(0, 2048, 16);

            [
                isInactive,
                isWaiting,
                isAdvancing
            ] = [
                gas.state === GasState.Inactive,
                gas.state === GasState.Waiting,
                gas.state === GasState.Advancing
            ];

            let currentDuration: number | undefined;
            const percentageDirty = stream.readBoolean();
            if (percentageDirty) { // Percentage dirty
                gasPercentage = stream.readFloat(0, 1, 16);
                currentDuration = gas.initialDuration - Math.round(gas.initialDuration * gasPercentage);
            } else {
                currentDuration = gas.initialDuration;
            }

            if (!(percentageDirty && gas.firstPercentageReceived)) {
                // Ensures that gas messages aren't displayed when switching between players when spectating
                let gasMessage = "";
                switch (true) {
                    case isWaiting: {
                        gasMessage = `Toxic gas advances in ${formatDate(currentDuration)}`;
                        break;
                    }
                    case isAdvancing: {
                        gasMessage = "Toxic gas is advancing! Move to the safe zone";
                        break;
                    }
                    case isInactive: {
                        gasMessage = "Waiting for players...";
                        break;
                    }
                }

                if (isAdvancing) {
                    $("#gas-timer").addClass("advancing");
                    $("#gas-timer-image").attr("src", "./img/misc/gas-advancing-icon.svg");
                } else {
                    $("#gas-timer").removeClass("advancing");
                    $("#gas-timer-image").attr("src", "./img/misc/gas-waiting-icon.svg");
                }

                if (
                    (isInactive || gas.initialDuration !== 0) &&
                    !UI_DEBUG_MODE &&
                    (!game.gameOver || game.spectating)
                ) {
                    $("#gas-msg-info").text(gasMessage);
                    $("#gas-msg").fadeIn();
                    if (isInactive) {
                        $("#gas-msg-info").css("color", "white");
                    } else {
                        $("#gas-msg-info").css("color", "cyan");
                        setTimeout(() => $("#gas-msg").fadeOut(1000), 5000);
                    }
                }
            }
            gas.firstPercentageReceived = true;
        }

        // Gas percentage
        if (gasPercentageDirty) {
            gasPercentage = stream.readFloat(0, 1, 16);
        }

        if (gasPercentage !== undefined) {
            const time = gas.initialDuration - Math.round(gas.initialDuration * gasPercentage);
            $("#gas-timer-text").text(`${Math.floor(time / 60)}:${(time % 60) < 10 ? "0" : ""}${time % 60}`);

            if (!gas.firstRadiusReceived && !isAdvancing) {
                gas.position = gas.oldPosition;
                gas.radius = gas.oldRadius;
                gas.firstRadiusReceived = true;
            }

            if (isAdvancing) {
                gas.lastPosition = vClone(gas.position);
                gas.lastRadius = gas.radius;
                gas.position = vecLerp(gas.oldPosition, gas.newPosition, gasPercentage);
                gas.radius = lerp(gas.oldRadius, gas.newRadius, gasPercentage);
                gas.lastUpdateTime = Date.now();
            }
        }

        // Alive count
        if (aliveCountDirty) {
            const aliveCount = stream.readBits(7);
            $("#ui-players-alive").text(aliveCount);
            $("#btn-spectate").toggle(aliveCount > 1);
        }
    }
}
