import { FlyoverPref, ObjectCategory, RotationMode } from "@common/constants";
import { PerkIds } from "@common/definitions/items/perks";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { type Orientation, type Variation } from "@common/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Angle, calculateDoorHitboxes, resolveStairInteraction } from "@common/utils/math";
import { ItemType, NullString, type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { InventoryItemBase } from "../inventory/inventoryItem";
import { getLootFromTable, LootItem } from "../utils/lootHelpers";
import { getRandomIDString } from "../utils/misc";
import { type Building } from "./building";
import { type Bullet } from "./bullet";
import { BaseGameObject, DamageParams, type GameObject } from "./gameObject";
import { type Player } from "./player";

export class Obstacle extends BaseGameObject.derive(ObjectCategory.Obstacle) {
    override readonly fullAllocBytes = 10;
    override readonly partialAllocBytes = 6;
    override readonly damageable = true;

    health: number;
    readonly maxHealth: number;
    readonly maxScale: number;

    collidable: boolean;

    playMaterialDestroyedSound = true;

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
    };

    activated?: boolean;

    parentBuilding?: Building;

    scale = 1;

    override hitbox: Hitbox;

    puzzlePiece?: string | boolean;

    // TODO: remove flyover pref when henry finishes refactoring definitions
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
        activated?: boolean
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

        // noinspection JSAssignmentUsedAsCondition
        if (this.isDoor = (definition.isDoor === true)) {
            const hitboxes = calculateDoorHitboxes(definition, this.position, this.rotation as Orientation);

            this.door = {
                operationStyle: definition.operationStyle ?? "swivel",
                isOpen: false,
                locked: locked ?? definition.locked ?? false,
                closedHitbox: this.hitbox.clone(),
                openHitbox: hitboxes.openHitbox,
                openAltHitbox: (hitboxes as typeof hitboxes & { readonly openAltHitbox?: RectangleHitbox }).openAltHitbox,
                offset: 0
            };
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
                        weaponDef?.itemType === ItemType.Melee
                        && weaponDef.piercingMultiplier !== undefined
                    )
                    || source instanceof Obstacle
                )
                || (weaponDef?.itemType === ItemType.Melee && definition.material === "stone" && !weaponDef?.stonePiercing))
            )
            || this.game.pluginManager.emit("obstacle_will_damage", {
                obstacle: this,
                ...params
            })
        ) {
            return;
        }

        this.health -= amount;
        this.setPartialDirty();

        const notDead = this.health > 0 && !this.dead;
        if (notDead) {
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

        if (!notDead) {
            this.health = 0;
            this.dead = true;
            if (definition.weaponSwap && source instanceof BaseGameObject && source.isPlayer) {
                source.swapWeaponRandomly(weaponIsItem ? weaponUsed : weaponUsed?.weapon, true);
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
                this.game.addExplosion(definition.explosion, this.position, source, source.layer, weaponIsItem ? weaponUsed : weaponUsed?.weapon);
            }

            // Pumpkin Bombs
            if (
                source instanceof BaseGameObject
                && source.isPlayer
                && source.perks.hasItem(PerkIds.PlumpkinBomb)
                && definition.material === "pumpkin"
            ) {
                this.playMaterialDestroyedSound = false;
                this.game.addExplosion("pumpkin_explosion", this.position, source, source.layer);
            }

            if (definition.particlesOnDestroy !== undefined) {
                this.game.addSyncedParticles(definition.particlesOnDestroy, this.position, this.layer);
            }

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

            if (this.definition.isWall) {
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
                }
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
        return !this.dead
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
            // optional chaining not required but makes both eslint and tsc happy
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

                            // swivel door => alt hitbox
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            this.hitbox = this.door.openAltHitbox!.clone();
                        } else {
                            this.door.offset = 1;
                            this.hitbox = this.door.openHitbox.clone();
                        }
                    } else {
                        this.door.offset = 1;
                        this.hitbox = this.door.openHitbox.clone();
                    }
                    break;
                }
                case "slide": {
                    this.hitbox = this.door.openHitbox.clone();
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
            this.hitbox = this.door.closedHitbox.clone();
        }
        this.spawnHitbox = this.hitbox;
        this.game.grid.updateObject(this);
    }

    override get data(): FullData<ObjectCategory.Obstacle> {
        return {
            scale: this.scale,
            dead: this.dead,
            playMaterialDestroyedSound: this.playMaterialDestroyedSound,
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
