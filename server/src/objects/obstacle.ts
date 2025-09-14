import { FlyoverPref, GameConstants, ObjectCategory, RotationMode } from "@common/constants";
import { PerkData, PerkIds } from "@common/definitions/items/perks";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { type Orientation, type Variation } from "@common/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Angle, calculateDoorHitboxes, Geometry, resolveStairInteraction } from "@common/utils/math";
import { DefinitionType, NullString, type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { InventoryItemBase } from "../inventory/inventoryItem";
import { getLootFromTable, LootItem } from "../utils/lootHelpers";
import { getRandomIDString, runOrWait } from "../utils/misc";
import { type Building } from "./building";
import { type Bullet } from "./bullet";
import { BaseGameObject, DamageParams, type GameObject } from "./gameObject";
import { type Player } from "./player";
import { Explosion } from "./explosion";

export class Obstacle extends BaseGameObject.derive(ObjectCategory.Obstacle) {
    override readonly fullAllocBytes = 10;
    override readonly partialAllocBytes = 6;
    override readonly damageable = true;

    health: number;
    readonly maxHealth: number;
    readonly maxScale: number;

    collidable: boolean;

    playMaterialDestroyedSound = true;

    waterOverlay = false;

    powered = false;

    readonly variation: Variation;

    spawnHitbox: Hitbox;

    readonly loot: LootItem[] = [];
    readonly lootSpawnOffset?: Vector;

    readonly definition: ObstacleDefinition;

    readonly isDoor: boolean;
    door?: {
        operationStyle: NonNullable<(ObstacleDefinition & { readonly isDoor: true })["operationStyle"]>
        isOpen: boolean
        locked: boolean
        closedHitbox: Hitbox
        openHitbox: Hitbox
        openAltHitbox?: Hitbox
        offset: number
        powered: boolean
        openOnce: boolean
    };

    activated?: boolean;

    parentBuilding?: Building;

    scale = 1;

    override hitbox: Hitbox;

    puzzlePiece?: string | boolean;

    // TODO replace flyoverpref with actual height values
    get height(): number {
        if (this.door && !this.door.isOpen) return Infinity;

        switch (this.definition.allowFlyover) {
            case FlyoverPref.Always:
                return 0.2;
            case FlyoverPref.Sometimes:
                return 0.5;
        }
        return Infinity;
    }

    constructor(
        game: Game,
        type: ReifiableDef<ObstacleDefinition>,
        position: Vector,
        rotation = 0,
        layer = 0,
        scale = 1,
        variation: Variation = 0,
        lootSpawnOffset?: Vector,
        parentBuilding?: Building,
        puzzlePiece?: string | boolean,
        locked?: boolean,
        activated?: boolean,
        waterOverlay?: boolean
    ) {
        super(game, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        this.layer = layer;

        this.lootSpawnOffset = lootSpawnOffset;

        this.parentBuilding = parentBuilding;

        this.activated = activated;

        const definition = this.definition = Obstacles.reify(type);

        this.waterOverlay = waterOverlay ?? definition.spawnWithWaterOverlay ?? false;

        this.health = this.maxHealth = this.definition.health;

        const hitboxRotation = this.definition.rotationMode === RotationMode.Limited ? rotation as Orientation : 0;

        this.hitbox = definition.hitbox.transform(this.position, this.scale, hitboxRotation);
        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale, hitboxRotation);

        this.collidable = !definition.noCollisions;

        if (definition.hasLoot) {
            this.loot = getLootFromTable(this.game.modeName, definition.lootTable ?? definition.idString);
        }

        if (definition.spawnWithLoot) {
            for (const item of getLootFromTable(this.game.modeName, definition.lootTable ?? definition.idString)) {
                this.game.addLoot(
                    item.idString,
                    this.position,
                    this.layer,
                    { count: item.count, pushVel: 0, jitterSpawn: false }
                );
            }
        }

        if (this.isDoor = (definition.isDoor === true)) {
            const hitboxes = calculateDoorHitboxes(definition, this.position, this.rotation as Orientation);

            this.door = {
                operationStyle: definition.operationStyle ?? "swivel",
                isOpen: false,
                locked: locked ?? definition.locked ?? false,
                closedHitbox: this.hitbox.clone(),
                openHitbox: hitboxes.openHitbox,
                openAltHitbox: (hitboxes as typeof hitboxes & { readonly openAltHitbox?: RectangleHitbox }).openAltHitbox,
                offset: 0,
                powered: false,
                openOnce: definition.openOnce ?? false
            };

            if (this.game.mode.unlockStage !== undefined && this.definition.unlockableWithStage && this.door.locked) {
                this.game.unlockableDoors.push(this);
            }
        }

        this.puzzlePiece = puzzlePiece;
        if (puzzlePiece) {
            this.parentBuilding?.puzzlePieces.push(this);
        }
    }

    damage(params: DamageParams & { position?: Vector }): void {
        const definition = this.definition;
        const { amount, source, weaponUsed, position } = params;
        if (this.health === 0 || definition.indestructible) return;

        const weaponIsItem = weaponUsed instanceof InventoryItemBase;
        const weaponDef = weaponIsItem ? weaponUsed.definition : undefined;
        if (
            (
                definition.impenetrable
                && (!(
                    (
                        weaponDef?.defType === DefinitionType.Melee
                        && weaponDef.piercingMultiplier !== undefined
                    )
                    || source instanceof Obstacle
                )
                || (weaponDef?.defType === DefinitionType.Melee && definition.hardness !== undefined && (weaponDef.maxHardness === undefined || definition.hardness > weaponDef.maxHardness))
                ))
                || this.game.pluginManager.emit("obstacle_will_damage", {
                    obstacle: this,
                    ...params
                })
        ) {
            return;
        }

        this.health -= amount;
        this.setPartialDirty();

        const dead = this.health <= 0 || this.dead;

        if (!dead) {
            const oldScale = this.scale;

            // Calculate new scale & scale hitbox
            const destroyScale = definition.scale?.destroy ?? 1;
            this.scale = this.health / this.maxHealth * (this.maxScale - destroyScale) + destroyScale;
            this.hitbox.scale(this.scale / oldScale);
        }

        this.game.pluginManager.emit("obstacle_did_damage", {
            obstacle: this,
            ...params
        });

        if (dead) {
            this.health = 0;
            this.dead = true;
            if (definition.weaponSwap && source instanceof BaseGameObject && source.isPlayer) {
                source.swapWeaponRandomly(weaponIsItem ? weaponUsed : (weaponUsed as Explosion)?.weapon, true, definition.weaponSwap.modeRestricted, definition.weaponSwap.weighted);
                //                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^
                // FIXME this cast to Explosion is not ideal and could cause issues in future if weaponUsed isn't an explosion
            }

            if (
                this.game.pluginManager.emit("obstacle_will_destroy", {
                    obstacle: this,
                    source,
                    weaponUsed,
                    amount
                })
            ) return;

            if (!this.definition.isWindow || this.definition.noCollisionAfterDestroyed) this.collidable = false;

            this.scale = definition.scale?.spawnMin ?? 1;

            if (definition.explosion !== undefined && source instanceof BaseGameObject) {
                //                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                // FIXME This is implying that obstacles won't explode if destroyed by non–game objects
                this.game.addExplosion(definition.explosion, this.position, source, this.layer, weaponIsItem ? weaponUsed : (weaponUsed as Explosion)?.weapon);
                //                                                                                                          ^^^^^^^^^^^^^^^^^^^^^^^^^
                // FIXME this cast to Explosion is not ideal and could cause issues in future if weaponUsed isn't an explosion
            }

            if (source instanceof BaseGameObject && source.isPlayer) {
                // Plumpkin Bomb
                if (
                    source.hasPerk(PerkIds.PlumpkinBomb)
                    && definition.material === "pumpkin"
                ) {
                    this.playMaterialDestroyedSound = false;
                    this.game.addExplosion("pumpkin_explosion", this.position, source, this.layer);
                }

                // Infection bar logic
                if (
                    definition.applyPerkOnDestroy
                    && definition.applyPerkOnDestroy.mode === this.game.modeName
                    && !(definition.applyPerkOnDestroy.perk === PerkIds.Infected && source.hasPerk(PerkIds.Immunity))
                ) {
                    const position = source.position,
                        distance = Geometry.distance(position, this.position),
                        deathZone = new CircleHitbox(10, this.position),
                        minDistance = 30,
                        maxDistance = 150, // 3 player units -> (2.25 ** 3) -> 6.75 but we go 7 * 10
                        clampedDistance = Math.min(distance, maxDistance),
                        scaleFactor = 1 - (clampedDistance - minDistance) / (maxDistance - minDistance);

                    let infectionAmount = Math.round((GameConstants.player.maxInfection / 4) * scaleFactor);

                    if (source.hitbox.collidesWith(deathZone)) infectionAmount = 100; // force

                    source.infection += infectionAmount;
                }
            }

            if (definition.particlesOnDestroy !== undefined) {
                this.game.addSyncedParticles(definition.particlesOnDestroy, this.position, this.layer);
            }

            if (this.puzzlePiece) this.parentBuilding?.solvePuzzle();

            const lootSpawnPosition = position ?? (source as { readonly position?: Vector } | undefined)?.position ?? this.position;
            for (const item of this.loot) {
                this.game.addLoot(
                    item.idString,
                    this.lootSpawnOffset
                        ? Vec.add(this.position, this.lootSpawnOffset)
                        : this.loot.length > 1
                            ? this.hitbox.randomPoint()
                            : this.position,
                    this.layer,
                    { count: item.count }
                )?.push(
                    Angle.betweenPoints(this.position, lootSpawnPosition),
                    0.02
                );
            }

            if (source instanceof BaseGameObject && source.isPlayer && source.hasPerk(PerkIds.LootBaron) && this.definition.hasLoot) {
                const perkBonus = PerkData[PerkIds.LootBaron].lootBonus;

                for (let i = 0; i < perkBonus; i++) {
                    let lootTable = getLootFromTable(this.game.modeName, definition.lootTable ?? definition.idString),
                        isDuplicated = JSON.stringify(lootTable) === JSON.stringify(this.loot),
                        loopCount = 0;

                    while (isDuplicated && loopCount < 100) {
                        lootTable = getLootFromTable(this.game.modeName, definition.lootTable ?? definition.idString);
                        isDuplicated = JSON.stringify(lootTable) === JSON.stringify(this.loot);
                        loopCount++;
                    }

                    if (isDuplicated) break;

                    for (const item of lootTable) {
                        this.game.addLoot(
                            item.idString,
                            this.lootSpawnOffset
                                ? Vec.add(this.position, this.lootSpawnOffset)
                                : this.loot.length > 1
                                    ? this.hitbox.randomPoint()
                                    : this.position,
                            this.layer,
                            { count: item.count }
                        )?.push(
                            Angle.betweenPoints(this.position, lootSpawnPosition),
                            0.02
                        );
                    }
                }
            }

            if (definition.isWall) {
                this.parentBuilding?.damageCeiling();

                for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
                    if (object.isObstacle && object.definition.isDoor) {
                        const definition = object.definition;
                        switch (definition.operationStyle) {
                            case "slide": {
                                // TODO this ig?
                                break;
                            }
                            case "swivel":
                            default: {
                                const detectionHitbox = new CircleHitbox(1, Vec.addAdjust(object.position, definition.hingeOffset, object.rotation as Orientation));

                                if (this.hitbox.collidesWith(detectionHitbox)) {
                                    object.damage({
                                        amount: Infinity,
                                        source,
                                        weaponUsed
                                    });
                                }
                                break;
                            }
                        }
                    }

                    if (object.isObstacle && object.definition.wallAttached) {
                        const detectionHitbox = new CircleHitbox(2, object.position);

                        if (this.hitbox.collidesWith(detectionHitbox)) {
                            object.damage({
                                amount: Infinity,
                                source,
                                weaponUsed
                            });
                        }
                    }
                }
            }

            if (definition.regenerateAfterDestroyed) {
                this.game.addTimeout(() => {
                    this.dead = false;
                    this.health = this.maxHealth;
                    this.scale = this.maxScale;
                    const hitboxRotation = this.definition.rotationMode === RotationMode.Limited ? this.rotation as Orientation : 0;
                    this.hitbox = definition.hitbox.transform(this.position, this.scale, hitboxRotation);
                    this.collidable = !definition.noCollisions;
                    this.setPartialDirty();
                }, definition.regenerateAfterDestroyed);
            }

            this.game.pluginManager.emit("obstacle_did_destroy", {
                obstacle: this,
                source,
                weaponUsed,
                amount
            });
        }
    }

    canInteract(player?: Player): boolean {
        return !this.dead && !this.definition?.damage
            && (
                player === undefined
                || this.definition.interactOnlyFromSide === undefined
                || this.definition.interactOnlyFromSide === (this.hitbox as RectangleHitbox).getSide(player.position)
            )
            && (
                (
                    this.isDoor
                    && ( // Either the door must not be locked or automatic, or there must not be a player triggering it
                        (!this.door?.locked && !(this.definition as { automatic?: boolean }).automatic)
                        || player === undefined
                    )
                ) || (
                    this.definition.isActivatable === true
                    && (this.definition.requiredItem === undefined || player?.activeItemDefinition.idString === this.definition.requiredItem)
                    && !this.activated
                )
            );
    }

    /**
     * Resolves the interaction between a given game object or bullet and this stair by shifting the object's layer as appropriate.
     * Two things are assumed and are prerequisite:
     * - This `Obstacle` instance is indeed one corresponding to a stair (such that `this.definition.isStair`)
     * - The given game object or bullet's hitbox overlaps this obstacle's (such that `gameObject.hitbox.collidesWith(this.hitbox)`)
     *
     * note that setters will be called _even if the new layer and old layer match_.
     */
    handleStairInteraction(object: GameObject | Bullet): void {
        object.layer = resolveStairInteraction(
            this.definition,
            this.rotation as Orientation, // stairs cannot have full rotation mode
            this.hitbox as RectangleHitbox,
            this.layer,
            object.position
        );
    }

    interact(player?: Player): void {
        if (
            (player !== undefined && !this.canInteract(player))
            || this.door?.locked === true
            || this.game.pluginManager.emit("obstacle_will_interact", {
                obstacle: this,
                player
            }) !== undefined
        ) return;

        const definition = this.definition;

        if (definition.isDoor) {
            // optional chaining not required but makes both biome and tsc happy
            if (!(this.door?.isOpen && definition.openOnce)) {
                this.toggleDoor(player);
            }

            if (definition.isActivatable) {
                this.activated = true;
            }
        } else if (definition.isActivatable) {
            this.activated = true;

            if (this.parentBuilding && this.puzzlePiece) {
                this.parentBuilding.togglePuzzlePiece(this);
            }

            const replaceWith = definition.replaceWith;
            if (replaceWith !== undefined) {
                this.game.addTimeout(() => {
                    this.dead = true;
                    this.collidable = false;
                    this.setDirty();

                    const idString = getRandomIDString<ObstacleDefinition>(replaceWith.idString);
                    if (idString === NullString) {
                        return;
                    }

                    this.game.map.generateObstacle(
                        idString,
                        this.position,
                        { rotation: this.rotation, layer: this.layer }
                    );
                }, replaceWith.delay);
            }
        }

        this.setDirty();
        this.game.pluginManager.emit("obstacle_did_interact", {
            obstacle: this,
            player
        });
    }

    toggleDoor(player?: Player): void {
        if (!this.door) return;
        if (!(this.hitbox instanceof RectangleHitbox)) {
            throw new Error("Door with non-rectangular hitbox");
        }

        let hitbox: Hitbox = this.hitbox;

        this.door.isOpen = !this.door.isOpen;
        if (this.door.isOpen) {
            switch (this.door.operationStyle) {
                case "swivel": {
                    if (player !== undefined) {
                        let isOnOtherSide = false;
                        switch (this.rotation) {
                            case 0:
                                isOnOtherSide = player.position.y < this.position.y;
                                break;
                            case 1:
                                isOnOtherSide = player.position.x < this.position.x;
                                break;
                            case 2:
                                isOnOtherSide = player.position.y > this.position.y;
                                break;
                            case 3:
                                isOnOtherSide = player.position.x > this.position.x;
                                break;
                        }

                        if (isOnOtherSide) {
                            this.door.offset = 3;

                            // biome-ignore lint/style/noNonNullAssertion: swivel door => alt hitbox
                            hitbox = this.door.openAltHitbox!.clone();
                        } else {
                            this.door.offset = 1;
                            if (this.definition.requiresPower && !this.door.locked && this.door.openOnce) {
                                this.door.offset = 3;
                                // biome-ignore lint/style/noNonNullAssertion: yes
                                hitbox = this.door.openAltHitbox!.clone();
                            } else hitbox = this.door.openHitbox.clone();
                        }
                    } else {
                        this.door.offset = 1;
                        hitbox = this.door.openHitbox.clone();
                    }
                    break;
                }
                case "slide": {
                    hitbox = this.door.openHitbox.clone();
                    this.door.offset = 1;
                    /*
                        changing the value of offset is really just for interop
                        with existing code, which already sends this value to the
                        client
                    */
                    break;
                }
            }
        } else {
            this.door.offset = 0;
            hitbox = this.door.closedHitbox.clone();
        }

        if (this.definition.interactionDelay) {
            this.door.powered = false;
            this.door.locked = true;
            this.setDirty();
        }
        runOrWait(
            this.game,
            () => {
                if (this.door) {
                    this.door.powered = true;
                    this.door.locked = false;
                    this.setDirty();
                }
                this.hitbox = hitbox;
                this.spawnHitbox = hitbox;
                this.game.grid.updateObject(this);
            },
            this.definition.interactionDelay ?? 0
        );
    }

    override get data(): FullData<ObjectCategory.Obstacle> {
        return {
            scale: this.scale,
            dead: this.dead,
            playMaterialDestroyedSound: this.playMaterialDestroyedSound,
            waterOverlay: this.waterOverlay,
            powered: this.powered,
            full: {
                activated: this.activated,
                definition: this.definition,
                door: this.door,
                position: this.position,
                layer: this.layer,
                variation: this.variation,
                rotation: {
                    rotation: this.rotation,
                    orientation: this.rotation as Orientation
                }
            }
        };
    }
}
