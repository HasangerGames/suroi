import { ObjectCategory } from "../../../common/src/constants";
import { type ObstacleDefinition, Obstacles, RotationMode } from "../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { CircleHitbox, type Hitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { addAdjust, angleBetweenPoints, calculateDoorHitboxes } from "../../../common/src/utils/math";
import { ItemType, ObstacleSpecialRoles, reifyDefinition } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { random } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { vAdd, type Vector } from "../../../common/src/utils/vector";
import { LootTables, type WeightedItem } from "../data/lootTables";
import { type Game } from "../game";
import { type GunItem } from "../inventory/gunItem";
import { InventoryItem } from "../inventory/inventoryItem";
import { MeleeItem } from "../inventory/meleeItem";
import { GameObject } from "../types/gameObject";
import { getLootTableLoot, type LootItem } from "../utils/misc";
import { type Building } from "./building";
import { type Explosion } from "./explosion";
import { Player } from "./player";

export class Obstacle<Def extends ObstacleDefinition = ObstacleDefinition> extends GameObject {
    override readonly type = ObjectCategory.Obstacle;
    override createObjectType(): ObjectType<this["type"], Def> {
        return ObjectType.fromString(this.type, this.definition.idString);
    }

    health: number;
    readonly maxHealth: number;
    readonly maxScale: number;

    readonly damageable = true;
    collidable: boolean;

    readonly variation: Variation;

    readonly spawnHitbox: Hitbox;

    readonly loot: LootItem[] = [];
    readonly lootSpawnOffset?: Vector;

    readonly definition: Def;

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

    hitbox: Hitbox;

    constructor(
        game: Game,
        definition: Def,
        position: Vector,
        rotation: number,
        scale: number,
        variation: Variation = 0,
        lootSpawnOffset?: Vector,
        parentBuilding?: Building
    ) {
        super(game, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        this.lootSpawnOffset = lootSpawnOffset;

        this.parentBuilding = parentBuilding;

        this.definition = reifyDefinition(definition, Obstacles);

        this.health = this.maxHealth = definition.health;

        const hitboxRotation = this.definition.rotationMode === RotationMode.Limited ? rotation as Orientation : 0;

        this.hitbox = definition.hitbox.transform(this.position, this.scale, hitboxRotation);
        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale, hitboxRotation);

        this.collidable = !definition.noCollisions;

        if (definition.hasLoot) {
            const lootTable = LootTables[this.definition.idString];
            const drops = lootTable.loot.flat();

            this.loot = Array.from(
                { length: random(lootTable.min, lootTable.max) },
                () => getLootTableLoot(drops)
            ).flat();
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

        // eslint-disable-next-line no-cond-assign
        if (this.isDoor = (definition.role === ObstacleSpecialRoles.Door)) {
            const hitboxes = calculateDoorHitboxes(definition, this.position, this.rotation as Orientation);

            this.door = {
                operationStyle: definition.operationStyle ?? "swivel",
                open: false,
                locked: definition.locked,
                closedHitbox: this.hitbox.clone(),
                openHitbox: hitboxes.openHitbox,
                //@ts-expect-error undefined is okay here
                openAltHitbox: hitboxes.openAltHitbox,
                offset: 0
            };
        }
    }

    override damage(amount: number, source: GameObject, weaponUsed?: GunItem | MeleeItem | Explosion, position?: Vector): void {
        const definition = this.definition;

        if (this.health === 0 || definition.indestructible) return;

        const weaponDef = weaponUsed instanceof InventoryItem ? weaponUsed.definition : undefined;
        if (
            definition.impenetrable &&
            !(weaponDef?.itemType === ItemType.Melee && weaponDef.piercingMultiplier !== undefined)
        ) {
            return;
        }

        this.health -= amount;
        this.game.partialDirtyObjects.add(this);

        if (this.health <= 0 || this.dead) {
            this.health = 0;
            this.dead = true;

            if (this.definition.role !== ObstacleSpecialRoles.Window) this.collidable = false;

            this.scale = definition.scale.spawnMin;

            if (definition.explosion !== undefined) {
                this.game.addExplosion(definition.explosion, this.position, source);
            }

            for (const item of this.loot) {
                const loot = this.game.addLoot(
                    item.idString,
                    this.lootSpawnOffset
                        ? vAdd(this.position, this.lootSpawnOffset)
                        : this.loot.length > 1
                            ? this.hitbox.randomPoint()
                            : this.position,
                    item.count
                );

                if (source.position === undefined && position === undefined) continue;

                loot.push(angleBetweenPoints(this.position, position ?? source.position), 7);
            }

            if (this.definition.role === ObstacleSpecialRoles.Wall) {
                this.parentBuilding?.damage();

                for (const object of this.game.grid.intersectsRect(this.hitbox.toRectangle())) {
                    if (
                        object instanceof Obstacle &&
                        object.definition.role === ObstacleSpecialRoles.Door
                    ) {
                        const definition = object.definition;
                        switch (definition.operationStyle) {
                            case "slide": {
                                //todo this ig?
                                break;
                            }
                            case "swivel":
                            default: {
                                const detectionHitbox = new CircleHitbox(1, addAdjust(object.position, definition.hingeOffset, object.rotation as Orientation));

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
            this.scale = this.health / this.maxHealth * (this.maxScale - definition.scale.destroy) + definition.scale.destroy;
            this.hitbox.scale(this.scale / oldScale);

            // Punch doors to open
            if (this.isDoor && source instanceof Player && weaponUsed instanceof MeleeItem) this.interact(source);
        }
    }

    canInteract(player?: Player): boolean {
        return !this.dead && (this.door !== undefined || (this.definition.role === ObstacleSpecialRoles.Activatable && player?.activeItem.definition.idString === this.definition.activator && !this.activated));
    }

    interact(player?: Player): void {
        if (!this.canInteract(player)) return;
        if (!(this.hitbox instanceof RectangleHitbox)) {
            throw new Error("Door with non-rectangular hitbox");
        }

        this.game.grid.removeObject(this);
        if (this.door !== undefined && !(this.door.open && this.definition.role === ObstacleSpecialRoles.Door && this.definition.openOnce)) {
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
        } else if (this.definition.role === ObstacleSpecialRoles.Activatable) {
            this.activated = true;
            setTimeout(() => this.game.vaultDoor?.interact(), 2000); //fixme hard coded behavior
        }

        this.game.grid.addObject(this);

        this.game.partialDirtyObjects.add(this);
    }

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Obstacle].serializePartial(stream, {
            ...this,
            fullUpdate: false
        });
    }

    override serializeFull(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Obstacle].serializeFull(stream, {
            scale: this.scale,
            dead: this.dead,
            activated: this.activated,
            definition: this.definition,
            door: this.door,
            fullUpdate: true,
            position: this.position,
            variation: this.variation,
            rotation: {
                rotation: this.rotation,
                orientation: this.rotation as Orientation
            }
        });
    }
}
