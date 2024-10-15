import { FireMode, ObjectCategory } from "@common/constants";
import { Obstacles, RotationMode, type ObstacleDefinition } from "@common/definitions/obstacles";
import { type Orientation, type Variation } from "@common/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Angle, calculateDoorHitboxes, resolveStairInteraction } from "@common/utils/math";
import { ItemType, NullString, ObstacleSpecialRoles, type ReferenceTo, type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { pickRandomInArray, random } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";

import { equalLayer } from "@common/utils/layer";
import { LootTable, LootTableOverrides, LootTables, type WeightedItem } from "../data/lootTables";
import { type Game } from "../game";
import { InventoryItem } from "../inventory/inventoryItem";
import { getLootTableLoot, getRandomIDString, type LootItem } from "../utils/misc";
import { type Building } from "./building";
import type { Bullet } from "./bullet";
import { BaseGameObject, DamageParams, type GameObject } from "./gameObject";
import { type Player } from "./player";
import { Config } from "../config";
import { GunItem } from "../inventory/gunItem";
import { MeleeItem } from "../inventory/meleeItem";
import { Emotes, Guns, Melees } from "@common/definitions";

export class Obstacle extends BaseGameObject.derive(ObjectCategory.Obstacle) {
    override readonly fullAllocBytes = 8;
    override readonly partialAllocBytes = 4;
    override readonly damageable = true;

    health: number;
    readonly maxHealth: number;
    readonly maxScale: number;

    collidable: boolean;

    readonly variation: Variation;

    spawnHitbox: Hitbox;

    readonly loot: LootItem[] = [];
    readonly lootSpawnOffset?: Vector;

    readonly definition: ObstacleDefinition;

    readonly isDoor: boolean;
    door?: {
        operationStyle: NonNullable<(ObstacleDefinition & { readonly role: ObstacleSpecialRoles.Door })["operationStyle"]>
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

    detectedMetal?: boolean;

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
            const lootTable = ((Config.lootTableOverride && LootTableOverrides[Config.lootTableOverride]?.[this.definition.idString]) ?? LootTables[this.definition.idString]) as LootTable;
            // TODO Clean up code
            for (let i = 0; i < random(lootTable.min, lootTable.max); i++) {
                if (lootTable.loot.length > 0 && lootTable.loot[0] instanceof Array) {
                    for (const loot of lootTable.loot) {
                        for (const drop of getLootTableLoot(loot as WeightedItem[])) this.loot.push(drop);
                    }
                } else {
                    for (const drop of getLootTableLoot(lootTable.loot as WeightedItem[])) this.loot.push(drop);
                }
            }
            /* const drops = lootTable.loot.flat();

            this.loot = Array.from(
                { length: random(lootTable.min, lootTable.max) },
                () => getLootTableLoot(drops)
            ).flat(); */
        }

        if (definition.spawnWithLoot) {
            for (const item of getLootTableLoot(LootTables[this.definition.idString].loot.flat())) {
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

        if (this.definition.detector) game.detectors.push(this);
    }

    damage(params: DamageParams & { position?: Vector }): void {
        const definition = this.definition;
        const { amount, source, weaponUsed, position } = params;
        if (this.health === 0 || definition.indestructible) return;

        const weaponDef = weaponUsed instanceof InventoryItem ? weaponUsed.definition : undefined;
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

            if (definition.weaponSwap && source && source instanceof BaseGameObject && source.isPlayer) {
                const itemDef = source.inventory.activeWeapon;
                const slot = source.inventory.activeWeaponIndex;

                switch (true) {
                    case itemDef instanceof GunItem: {
                        source.action?.cancel();
                        const bannedAmmoTypes = ["9mm", "firework_rocket", "bb", "power_cell"]; // no 9mm guns in fall
                        const weirdbannedidstrings = ["deagle", "dual_deagle"]; // exclude deagle from fall

                        const guns = Guns.definitions.filter(gunDef => {
                            const isShotgun = gunDef.ammoType === "12g";

                            return !weirdbannedidstrings.includes(gunDef.idString) && !gunDef.killstreak && !bannedAmmoTypes.includes(gunDef.ammoType) && (gunDef.fireMode === FireMode.Single || (isShotgun && gunDef.fireMode === FireMode.Auto));
                        });

                        const chosenGun = pickRandomInArray(guns);
                        source.inventory.replaceWeapon(slot, chosenGun.idString);
                        (source.activeItem as GunItem).ammo = chosenGun.capacity;

                        // Give the player ammo for the new gun if they do not have any ammo for it.
                        if (!source.inventory.items.hasItem(chosenGun.ammoType) && !chosenGun.summonAirdrop) {
                            source.inventory.items.setItem(chosenGun.ammoType, chosenGun.ammoSpawnAmount);
                            source.dirty.items = true;
                        }
                        source.sendEmote(Emotes.fromStringSafe(chosenGun.idString));
                    }
                        break;

                    case itemDef instanceof MeleeItem: {
                        // get rid of dev shit
                        const melees = Melees.definitions.filter(meleeDef => {
                            return !meleeDef.killstreak && !meleeDef.noDrop && !meleeDef.image?.animated; // to exclude chainsaw :(                        })
                        });
                        const chosenMelee = pickRandomInArray(melees).idString;
                        source.inventory.replaceWeapon(slot, chosenMelee);
                        source.sendEmote(Emotes.fromStringSafe(chosenMelee));
                    }
                        break;

                    /* case itemDef instanceof ThrowableItem: { brings back infinite nades glitch idk
                        const chosenThrowable = pickRandomInArray(Throwables.definitions).idString;
                        source.inventory.items.setItem(chosenThrowable, 3);
                        source.inventory.addOrReplaceWeapon(slot, chosenThrowable);
                    }
                        break; */
                }
            }

            if (
                this.game.pluginManager.emit("obstacle_will_destroy", {
                    obstacle: this,
                    source,
                    weaponUsed,
                    amount
                })
            ) return;

            if (!this.definition.isWindow) this.collidable = false;

            this.scale = definition.scale?.spawnMin ?? 1;

            if (definition.explosion !== undefined && source instanceof BaseGameObject) {
                //                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                // FIXME This is implying that obstacles won't explode if destroyed by non–game objects
                this.game.addExplosion(definition.explosion, this.position, source, source.layer);
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
        return !this.dead && (
            (
                this.isDoor
                && ( // Either the door must not be locked or automatic, or there must not be a player triggering it
                    (!this.door?.locked && !(this.definition as { automatic?: boolean }).automatic)
                    || player === undefined
                )
            ) || (
                this.definition.isActivatable === true
                && (player?.activeItemDefinition.idString === this.definition.requiredItem || !this.definition.requiredItem)
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
            !this.canInteract(player)
            && !this.door?.locked
            && !this.game.pluginManager.emit("obstacle_will_interact", {
                obstacle: this,
                player
            })
        ) return;

        const definition = this.definition;

        switch (definition.role) {
            case ObstacleSpecialRoles.Door: {
                // optional chaining not required but makes both eslint and tsc happy
                if (!(this.door?.isOpen && definition.openOnce) && !this.door?.locked) {
                    this.toggleDoor(player);
                }
                break;
            }
            case ObstacleSpecialRoles.Activatable: {
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

                        const idString = getRandomIDString<
                            ObstacleDefinition,
                            ReferenceTo<ObstacleDefinition> | typeof NullString
                        >(replaceWith.idString);
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
                break;
            }
        }

        this.game.pluginManager.emit("obstacle_will_interact", {
            obstacle: this,
            player
        });
        this.setDirty();
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

    updateDetector(): void {
        for (const object of this.game.grid.intersectsHitbox(this.spawnHitbox)) {
            if (object.isPlayer) {
                const player = object;

                this.detectedMetal = this.hitbox.collidesWith(player.hitbox) && equalLayer(this.layer, player.layer);

                this.setDirty();
            }
        }
    }

    override get data(): FullData<ObjectCategory.Obstacle> {
        return {
            scale: this.scale,
            dead: this.dead,
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
                },
                detectedMetal: this.detectedMetal
            }
        };
    }
}
