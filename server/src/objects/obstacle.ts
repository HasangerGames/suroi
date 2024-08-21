import { ObjectCategory, type Layer } from "@common/constants";
import { Obstacles, RotationMode, type ObstacleDefinition } from "@common/definitions/obstacles";
import { type Orientation, type Variation } from "@common/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Angle, calculateDoorHitboxes } from "@common/utils/math";
import { ItemType, ObstacleSpecialRoles, type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { random } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";

import { LootTables, type WeightedItem } from "../data/lootTables";
import { type Game } from "../game";
import { InventoryItem } from "../inventory/inventoryItem";
import { Events } from "../pluginManager";
import { getLootTableLoot, getRandomIDString, type LootItem } from "../utils/misc";
import { type Building } from "./building";
import { BaseGameObject, DamageParams, type GameObject } from "./gameObject";
import { type Player } from "./player";
import type { Bullet } from "./bullet";

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
        locked?: boolean
        closedHitbox: Hitbox
        openHitbox: Hitbox
        openAltHitbox?: Hitbox
        offset: number
    };

    activated?: boolean;

    parentBuilding?: Building;

    scale = 1;

    locked = false;

    declare hitbox: Hitbox;

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
        locked?: boolean
    ) {
        super(game, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        this.layer = layer;

        this.locked = locked ?? false;

        this.lootSpawnOffset = lootSpawnOffset;

        this.parentBuilding = parentBuilding;

        const definition = this.definition = Obstacles.reify(type);

        this.health = this.maxHealth = this.definition.health;

        const hitboxRotation = this.definition.rotationMode === RotationMode.Limited ? rotation as Orientation : 0;

        this.hitbox = definition.hitbox.transform(this.position, this.scale, hitboxRotation);
        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale, hitboxRotation);

        this.collidable = !definition.noCollisions;

        if (definition.hasLoot) {
            const lootTable = LootTables[this.definition.idString];
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
                locked: definition.locked,
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
            definition.impenetrable
            && !(
                (
                    weaponDef?.itemType === ItemType.Melee && weaponDef.piercingMultiplier !== undefined
                    && weaponDef?.canPierceMaterials?.includes(this.definition.material)
                )
                || source instanceof Obstacle
            )
        ) {
            return;
        }

        this.game.pluginManager.emit(Events.Obstacle_Damage, {
            obstacle: this,
            ...params
        });

        this.health -= amount;
        this.setPartialDirty();

        if (this.health <= 0 || this.dead) {
            this.health = 0;
            this.dead = true;

            this.game.pluginManager.emit(Events.Obstacle_Destroy, {
                obstacle: this,
                source,
                weaponUsed,
                amount
            });

            if (!(this.definition.isWindow && !this.definition.noCollisionAfterDestroyed)) this.collidable = false;

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
                ).push(
                    Angle.betweenPoints(this.position, lootSpawnPosition),
                    0.02
                );
            }

            if (this.definition.isWall) {
                this.parentBuilding?.damageCeiling();

                for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
                    if (
                        object instanceof Obstacle
                        && object.definition.isDoor
                    ) {
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
        } else {
            const oldScale = this.scale;

            // Calculate new scale & scale hitbox
            const destroyScale = definition.scale?.destroy ?? 1;
            this.scale = this.health / this.maxHealth * (this.maxScale - destroyScale) + destroyScale;
            this.hitbox.scale(this.scale / oldScale);
        }
    }

    canInteract(player?: Player): boolean {
        return !this.dead && (
            (this.isDoor && (!this.door?.locked || player === undefined) && !this.locked)
            || (
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
     */
    handleStairInteraction(object: GameObject | Bullet): void {
        const definition = this.definition;
        if (definition.role !== ObstacleSpecialRoles.Stair) {
            console.error("Tried to handle a stair interaction as a non-stair obstacle");
            return;
        }

        const { activeEdges: { high, low } } = definition;

        /*
            reminder for the numbering system used:
                 0
              ┌─────┐
            3 │     │ 1
              └─────┘
                 2

            checking to see if high and low are opposites is thus
            as simple as checking to see if the absolute difference
            between them is 2 (and checking for adjacency requires
            a check for an absolute difference of 1)

            having them be opposite is really cool cuz it's the most
            intuitive case.

            if they're opposite, then we can basically project the
            object's position onto an axis that runs between the two
            sides, and do a bounds check. for example, let's say that
            low = 3 and high = 1; we therefore have a staircase going
            from, let's say, layer 0 on the left up to layer 2 on the
            right.

            to know what layer to place an object on, we just consider
            where it is in relation to sides 3 and 1; if it's left of
            3, we put it on layer 0; right of 1 and it's on layer 2;
            in between is on layer 1.

            layer 0│  1  │layer 2
            ←──────│←───→│──────→
                   ┌─────┐
                   │     │
                   └─────┘
        */

        const pos = object.position;
        const { min, max } = this.hitbox as RectangleHitbox;

        const doLayerChange = object instanceof BaseGameObject
            ? (layer: Layer) => {
                object.layer = layer;
            }
            : (layer: Layer) => {
                object.changeLayer(layer);
            };

        if (Math.abs(high - low) === 2) {
            // the odd-numbered sides lie on the horizontal
            const prop = high % 2 !== 0 ? "x" : "y";
            // where the "low" side is
            const minIsLow = low === 0 || low === 3;
            const objComponent = pos[prop];

            if (objComponent <= min[prop]) {
                doLayerChange(this.layer + (minIsLow ? -1 : 1));
            } else if (objComponent >= max[prop]) {
                doLayerChange(this.layer + (minIsLow ? 1 : -1));
            } else {
                doLayerChange(this.layer);
            }

            return;
        }

        /*
            Otherwise, they're adjacent, which is slightly harder to
            reason about. We'll divide the world into a few sections,
            and assign a layer consequently, as visualized below.
            For the diagram, assume that low = 0 and that high = 1.

                         ╱ ←─ (imagine this line is at 45° lol)
                        ╱
         layer 0       ╱
                ┌─────┐
                │  1  │
                └─────┘   layer 2
               ╱
              ╱
             ╱  ←─ (this one's at 45° too, trust me)

            in theory, only two sides of the stair would be accessible,
            and the other two would be clipped off with walls, but it's
            not too much expensive to extend our diagram and computations,
            so we do it.
        */

        const objIsLeft = pos.x <= min.x;
        const objIsRight = pos.x >= max.x;
        const objIsAbove = pos.y <= min.y;
        const objIsBelow = pos.y >= max.y;

        const intersectX = !objIsLeft && !objIsRight;
        const intersectY = !objIsAbove && !objIsBelow;

        if (intersectX && intersectY) {
            // if it's inside the stair, then the high/low isn't relevant: we match the stair's layer
            doLayerChange(this.layer);
            return;
        }

        // otherwise we gotta figure out a) which way the line cuts b) what region the game object is in

        /*
            bl/tr
            high === 0 && low === 1
            high === 1 && low === 0
            high === 2 && low === 3
            high === 3 && low === 2

            br/tl
            high === 0 && low === 3
            high === 1 && low === 2
            high === 2 && low === 1
            high === 3 && low === 0

            as can be seen here, all the pairs that yield a bottom-right/top-left
            diagonal have the sum of high and low equal to 3.
        */
        const isBottomRightToTopLeft = high + low === 3;

        if (isBottomRightToTopLeft) {
            const topRightIsHigh = high < 2;
            if (
                objIsRight // trivial rhs check
                || (objIsBelow && !objIsLeft) // below the box (and neither to its left nor its right)
                || (pos.x - max.x) > (pos.y - max.y) // on the right of the 45° diagonal
            ) {
                doLayerChange(this.layer + (topRightIsHigh ? 1 : -1));
            } else {
                doLayerChange(this.layer + (topRightIsHigh ? -1 : 1));
            }
        } else {
            const topLeftIsHigh = high === 0 || high === 3;
            if (
                objIsLeft // trivial lhs check
                || (objIsAbove && !objIsRight) // above the box (and neither to its left nor its right)
                || (pos.x - max.x) < (pos.y - min.y) // on the left of the 45° diagonal
            ) {
                doLayerChange(this.layer + (topLeftIsHigh ? 1 : -1));
            } else {
                doLayerChange(this.layer + (topLeftIsHigh ? -1 : 1));
            }
        }
    }

    interact(player?: Player): void {
        if (!this.canInteract(player) && !this.locked) return;

        this.game.pluginManager.emit(Events.Obstacle_Interact, {
            obstacle: this,
            player
        });

        const definition = this.definition;

        switch (definition.role) {
            case ObstacleSpecialRoles.Door: {
                // optional chaining not required but makes both eslint and tsc happy
                if (!(this.door?.isOpen && definition.openOnce) && !this.locked) {
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

                        this.game.map.generateObstacle(
                            getRandomIDString(replaceWith.idString),
                            this.position,
                            this.rotation
                        );
                    }, replaceWith.delay);
                }
                break;
            }
        }
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
        for (const player of this.game.livingPlayers) {
            if (
                this.hitbox.collidesWith(player.hitbox)
                && (player.activeItem.definition.idString !== "fists" || player.inventory.vest || player.inventory.helmet)
                && player.layer === this.layer
            ) {
                this.detectedMetal = true;
                this.setDirty();
            } else if (this.detectedMetal) {
                this.detectedMetal = false;
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
                locked: this.locked,
                detectedMetal: this.detectedMetal
            }
        };
    }
}
