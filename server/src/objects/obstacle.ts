import { ObjectCategory } from "../../../common/src/constants";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { CircleHitbox, RectangleHitbox, type Hitbox } from "../../../common/src/utils/hitbox";
import { Angle, calculateDoorHitboxes } from "../../../common/src/utils/math";
import { ItemType, ObstacleSpecialRoles, type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { random } from "../../../common/src/utils/random";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { LootTables, type WeightedItem } from "../data/lootTables";
import { type Game } from "../game";
import { type GunItem } from "../inventory/gunItem";
import { InventoryItem } from "../inventory/inventoryItem";
import { type MeleeItem } from "../inventory/meleeItem";
import { type ThrowableItem } from "../inventory/throwableItem";
import { getLootTableLoot, getRandomIDString, type LootItem } from "../utils/misc";
import { type Building } from "./building";
import { type Explosion } from "./explosion";
import { BaseGameObject, type GameObject } from "./gameObject";
import { type Player } from "./player";

export class Obstacle extends BaseGameObject<ObjectCategory.Obstacle> {
    override readonly type = ObjectCategory.Obstacle;
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
        open: boolean
        locked?: boolean
        closedHitbox: Hitbox
        openHitbox: Hitbox
        openAltHitbox?: Hitbox
        offset: number
    };

    activated?: boolean;

    parentBuilding?: Building;

    scale = 1;

    declare hitbox: Hitbox;

    puzzlePiece?: string | boolean;

    constructor(
        game: Game,
        type: ReifiableDef<ObstacleDefinition>,
        position: Vector,
        rotation = 0,
        scale = 1,
        variation: Variation = 0,
        lootSpawnOffset?: Vector,
        parentBuilding?: Building,
        puzzlePiece?: string | boolean
    ) {
        super(game, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

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
                    item.count
                );
            }
        }

        /* eslint-disable no-cond-assign */
        // noinspection JSAssignmentUsedAsCondition
        if (this.isDoor = (definition.role === ObstacleSpecialRoles.Door)) {
            const hitboxes = calculateDoorHitboxes(definition, this.position, this.rotation as Orientation);

            this.door = {
                operationStyle: definition.operationStyle ?? "swivel",
                open: false,
                locked: definition.locked,
                closedHitbox: this.hitbox.clone(),
                openHitbox: hitboxes.openHitbox,
                // @ts-expect-error undefined is okay here
                openAltHitbox: hitboxes.openAltHitbox,
                offset: 0
            };
        }

        this.puzzlePiece = puzzlePiece;
        if (puzzlePiece) {
            this.parentBuilding?.puzzlePieces.push(this);
        }
    }

    damage(amount: number, source: GameObject, weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion, position?: Vector): void {
        const definition = this.definition;

        if (this.health === 0 || definition.indestructible) return;

        const weaponDef = weaponUsed instanceof InventoryItem ? weaponUsed.definition : undefined;
        if (
            definition.impenetrable &&
            !(
                (weaponDef?.itemType === ItemType.Melee && weaponDef.piercingMultiplier !== undefined) ||
                source instanceof Obstacle
            )
        ) {
            return;
        }

        this.health -= amount;
        this.game.partialDirtyObjects.add(this);

        if (this.health <= 0 || this.dead) {
            this.health = 0;
            this.dead = true;

            if (this.definition.role !== ObstacleSpecialRoles.Window) this.collidable = false;

            this.scale = definition.scale?.spawnMin ?? 1;

            if (definition.explosion !== undefined) {
                this.game.addExplosion(definition.explosion, this.position, source);
            }

            for (const item of this.loot) {
                const loot = this.game.addLoot(
                    item.idString,
                    this.lootSpawnOffset
                        ? Vec.add(this.position, this.lootSpawnOffset)
                        : this.loot.length > 1
                            ? this.hitbox.randomPoint()
                            : this.position,
                    item.count
                );

                if (source.position === undefined && position === undefined) continue;

                loot.push(
                    Angle.betweenPoints(this.position, position ?? source.position),
                    0.02
                );
            }

            if (this.definition.role === ObstacleSpecialRoles.Wall) {
                this.parentBuilding?.damage();

                for (const object of this.game.grid.intersectsHitbox(this.hitbox)) {
                    if (
                        object instanceof Obstacle &&
                        object.definition.role === ObstacleSpecialRoles.Door
                    ) {
                        const definition = object.definition;
                        switch (definition.operationStyle) {
                            case "slide": {
                                // todo this ig?
                                break;
                            }
                            case "swivel":
                            default: {
                                const detectionHitbox = new CircleHitbox(1, Vec.addAdjust(object.position, definition.hingeOffset, object.rotation as Orientation));

                                if (this.hitbox.collidesWith(detectionHitbox)) {
                                    object.damage(Infinity, source, weaponUsed);
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
            (this.isDoor && (!this.door?.locked || player === undefined)) ||
            (
                this.definition.role === ObstacleSpecialRoles.Activatable &&
                (player?.activeItemDefinition.idString === this.definition.requiredItem || !this.definition.requiredItem) &&
                !this.activated
            )
        );
    }

    interact(player?: Player): void {
        if (!this.canInteract(player)) return;

        const definition = this.definition;

        switch (definition.role) {
            case ObstacleSpecialRoles.Door: {
                if (!(this.door!.open && definition.openOnce)) {
                    this.toggleDoor(player);
                }
                break;
            }
            case ObstacleSpecialRoles.Activatable: {
                this.activated = true;

                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                if (this.parentBuilding && this.puzzlePiece) {
                    this.parentBuilding.togglePuzzlePiece(this);
                }

                const replaceWith = definition.replaceWith;
                if (replaceWith !== undefined) {
                    this.game.addTimeout(() => {
                        this.dead = true;
                        this.collidable = false;
                        this.game.fullDirtyObjects.add(this);

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

        this.game.fullDirtyObjects.add(this);
    }

    toggleDoor(player?: Player): void {
        if (!this.door) return;
        if (!(this.hitbox instanceof RectangleHitbox)) {
            throw new Error("Door with non-rectangular hitbox");
        }

        this.door.open = !this.door.open;
        if (this.door.open) {
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
            full: {
                activated: this.activated,
                definition: this.definition,
                door: this.door,
                position: this.position,
                variation: this.variation,
                rotation: {
                    rotation: this.rotation,
                    orientation: this.rotation as Orientation
                }
            }
        };
    }
}
