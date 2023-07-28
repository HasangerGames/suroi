import { type Body, Box, Circle, type Shape, Vec2 } from "planck";

import { type Game } from "../game";

import { type CollisionFilter, GameObject } from "../types/gameObject";
import { type LootItem, getLootTableLoot } from "../utils/misc";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Vector, vSub, v, vAdd } from "../../../common/src/utils/vector";
import { addAdjust, transformRectangle } from "../../../common/src/utils/math";
import { CircleHitbox, ComplexHitbox, type Hitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { ObjectCategory } from "../../../common/src/constants";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { LootTables } from "../data/lootTables";
import { random } from "../../../common/src/utils/random";
import { type MeleeDefinition } from "../../../common/src/definitions/melees";
import { type ItemDefinition, ItemType } from "../../../common/src/utils/objectDefinitions";
import { type ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { type Player } from "./player";

export class Obstacle extends GameObject {
    override readonly is: CollisionFilter = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: false
    };

    override readonly collidesWith: CollisionFilter = {
        player: true,
        obstacle: false,
        bullet: true,
        loot: true
    };

    readonly damageable = true;

    health: number;
    maxHealth: number;
    maxScale: number;
    healthFraction = 1;

    variation: Variation;

    body: Body;
    spawnHitbox: Hitbox;

    loot: LootItem[] = [];

    definition: ObstacleDefinition;

    lootSpawnOffset: Vector;

    isDoor: boolean;
    door?: {
        open: boolean
        closedHitbox: Hitbox
        openHitbox: Hitbox
        openAltHitbox: Hitbox
        offset: number
    };

    constructor(
        game: Game,
        type: ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>,
        position: Vector,
        rotation: number,
        scale: number,
        variation: Variation = 0,
        lootSpawnOffset?: Vector
    ) {
        super(game, type, position);

        this.rotation = rotation;
        this.scale = this.maxScale = scale;
        this.variation = variation;

        this.lootSpawnOffset = lootSpawnOffset ?? v(0, 0);

        const definition = type.definition;
        this.definition = definition;

        this.health = this.maxHealth = definition.health;

        let hitboxRotation: Orientation = 0;

        if (this.definition.rotationMode === "limited") {
            hitboxRotation = rotation as Orientation;
        }

        this.hitbox = definition.hitbox.transform(this.position, this.scale, hitboxRotation);

        this.spawnHitbox = (definition.spawnHitbox ?? definition.hitbox).transform(this.position, this.scale, hitboxRotation);

        this.body = this.game.world.createBody({
            type: "static",
            fixedRotation: true
        });

        if (this.hitbox instanceof ComplexHitbox) {
            for (const hitBox of this.hitbox.hitBoxes) this.createFixture(hitBox);
        } else {
            this.createFixture(this.hitbox);
        }

        if (this.hitbox instanceof CircleHitbox) {
            this.body.setPosition(Vec2(this.position));
        }

        if (definition.hasLoot) {
            const lootTable = LootTables[this.type.idString];
            const count = random(lootTable.min, lootTable.max);

            for (let i = 0; i < count; i++) {
                this.loot = this.loot.concat(getLootTableLoot(lootTable.loot));
            }
        }

        if (definition.spawnWithLoot) {
            const lootTable = LootTables[this.type.idString];
            const items = getLootTableLoot(lootTable.loot);

            for (const item of items) {
                this.game.addLoot(
                    ObjectType.fromString(ObjectCategory.Loot, item.idString),
                    this.position,
                    item.count);
            }
        }

        this.isDoor = definition.isDoor ?? false;
        // noinspection JSSuspiciousNameCombination
        if (definition.isDoor) {
            if (!(this.hitbox instanceof RectangleHitbox && definition.hitbox instanceof RectangleHitbox)) {
                throw new Error("Door with non-rectangular hitbox");
            }

            let openOrientation: Orientation | undefined;
            let openAltOrientation: Orientation | undefined;
            switch (this.rotation) { // TODO Simplify this (wrapping function?)
                case 0:
                    openOrientation = 1;
                    openAltOrientation = 3;
                    break;
                case 1:
                    openOrientation = 2;
                    openAltOrientation = 0;
                    break;
                case 2:
                    openOrientation = 3;
                    openAltOrientation = 1;
                    break;
                case 3:
                    openOrientation = 0;
                    openAltOrientation = 2;
                    break;
            }
            if (openOrientation === undefined || openAltOrientation === undefined) {
                throw new Error("Invalid door orientation");
            }

            const openRectangle = transformRectangle(
                addAdjust(this.position, vAdd(definition.hingeOffset, v(-definition.hingeOffset.y, -definition.hingeOffset.x)), this.rotation as Orientation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                openOrientation
            );
            // noinspection JSSuspiciousNameCombination
            const openAltRectangle = transformRectangle(
                addAdjust(this.position, vAdd(definition.hingeOffset, v(definition.hingeOffset.y, definition.hingeOffset.x)), this.rotation as Orientation),
                definition.hitbox.min,
                definition.hitbox.max,
                1,
                openAltOrientation
            );

            this.door = {
                open: false,
                closedHitbox: this.hitbox.clone(),
                openHitbox: new RectangleHitbox(openRectangle.min, openRectangle.max),
                openAltHitbox: new RectangleHitbox(openAltRectangle.min, openAltRectangle.max),
                offset: 0
            };
        }
    }

    private createFixture(hitbox: Hitbox): void {
        if (hitbox instanceof CircleHitbox) {
            this.body.createFixture({
                shape: Circle(hitbox.radius * this.scale),
                userData: this,
                isSensor: this.definition.noCollisions
            });
        } else if (hitbox instanceof RectangleHitbox) {
            const width = hitbox.width / 2;
            const height = hitbox.height / 2;
            this.body.createFixture({
                shape: Box(width, height, Vec2(hitbox.min.x + width, hitbox.min.y + height)),
                userData: this,
                isSensor: this.definition.noCollisions
            });
            /*this.game.dynamicObjects.add(new Obstacle(
                this.game,
                ObjectType.fromString(ObjectCategory.Obstacle, "debug_marker"),
                Vec2(hitbox.min.x, hitbox.min.y),
                0,
                1
            ));
            this.game.dynamicObjects.add(new Obstacle(
                this.game,
                ObjectType.fromString(ObjectCategory.Obstacle, "debug_marker"),
                Vec2(hitbox.max.x, hitbox.max.y),
                0,
                1
            ));
            this.game.dynamicObjects.add(new Obstacle(
                this.game,
                ObjectType.fromString(ObjectCategory.Obstacle, "debug_marker"),
                Vec2(hitbox.min.x + width, hitbox.min.y + height),
                0,
                1
            ));*/
        }
    }

    override damage(amount: number, source: GameObject, weaponUsed?: ObjectType): void {
        const definition = this.definition;
        if (this.health === 0 || definition.indestructible) return;

        const weaponDef = (weaponUsed?.definition as ItemDefinition);
        if (
            definition.impenetrable &&
            !(weaponDef.itemType === ItemType.Melee && (weaponDef as MeleeDefinition).piercingMultiplier)
        ) {
            return;
        }

        this.health -= amount;

        if (this.health <= 0 || this.dead) {
            this.health = 0;
            this.dead = true;

            this.scale = definition.scale.spawnMin;

            this.game.world.destroyBody(this.body);
            this.game.partialDirtyObjects.add(this);

            if (definition.explosion !== undefined) {
                this.game.addExplosion(
                    ObjectType.fromString<ObjectCategory.Explosion, ExplosionDefinition>(ObjectCategory.Explosion, definition.explosion),
                    this.position,
                    source
                );
            }

            for (const item of this.loot) {
                const position = vAdd(this.position, this.lootSpawnOffset);
                this.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString), position, item.count);
            }
        } else {
            this.healthFraction = this.health / this.maxHealth;
            const oldScale = this.scale;

            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            this.scale = this.healthFraction * (this.maxScale - definition.scale.destroy) + definition.scale.destroy;
            const scaleFactor = this.scale / oldScale;

            // Transform the hitbox
            // TODO Move this code to the Hitbox classes
            if (this.hitbox instanceof CircleHitbox) {
                this.hitbox.radius *= scaleFactor;
            } else if (this.hitbox instanceof RectangleHitbox) {
                const rotatedRect = transformRectangle(
                    this.position,
                    vSub(this.hitbox.min, this.position),
                    vSub(this.hitbox.max, this.position),
                    scaleFactor,
                    0
                );
                this.hitbox.min = rotatedRect.min;
                this.hitbox.max = rotatedRect.max;
                this.hitbox.width = this.hitbox.max.x - this.hitbox.min.x;
                this.hitbox.height = this.hitbox.max.y - this.hitbox.min.y;
            }

            // Transform the Planck.js Body
            if (this.body !== null) {
                const shape = this.body.getFixtureList()?.getShape() as Shape & { m_vertices: Vec2[] };
                if (this.hitbox instanceof CircleHitbox) {
                    shape.m_radius = shape.m_radius * scaleFactor;
                } else if (this.hitbox instanceof RectangleHitbox) {
                    // copium >:(
                    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
                    this.body.destroyFixture(this.body.getFixtureList()!);
                    this.createFixture(this.hitbox);
                }
            }

            this.game.partialDirtyObjects.add(this);
        }
    }

    interact(player: Player): void {
        if (this.door === undefined) return;
        if (!(this.hitbox instanceof RectangleHitbox)) {
            throw new Error("Door with non-rectangular hitbox");
        }

        let isOnOtherSide = false;
        switch (this.rotation) {
            case 0:
                isOnOtherSide = player.position.y > this.position.y;
                break;
            case 1:
                isOnOtherSide = player.position.x < this.position.x;
                break;
            case 2:
                isOnOtherSide = player.position.y < this.position.y;
                break;
            case 3:
                isOnOtherSide = player.position.x > this.position.x;
                break;
        }

        this.door.open = !this.door.open;
        if (this.door.open) {
            if (isOnOtherSide) {
                this.door.offset = 3;
                this.hitbox = this.door.openAltHitbox.clone();
            } else {
                this.door.offset = 1;
                this.hitbox = this.door.openHitbox.clone();
            }
        } else {
            this.door.offset = 0;
            this.hitbox = this.door.closedHitbox.clone();
        }

        // When pushing, ensure that they won't get stuck in the door.
        // If they do, move them to the opposite side regardless of their current position.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const hitbox = this.hitbox as RectangleHitbox;
        if (player?.hitbox.collidesWith(hitbox)) {
            const newPosition = player.position.clone();
            const radius = player.hitbox.radius;
            if (isOnOtherSide) {
                switch (this.rotation) {
                    case 0:
                        newPosition.y = hitbox.max.y + radius;
                        break;
                    case 1:
                        newPosition.x = hitbox.min.x - radius;
                        break;
                    case 2:
                        newPosition.y = hitbox.min.y - radius;
                        break;
                    case 3:
                        newPosition.x = hitbox.max.x + radius;
                        break;
                }
            } else {
                switch (this.rotation) {
                    case 0:
                        newPosition.y = hitbox.min.y - radius;
                        break;
                    case 1:
                        newPosition.x = hitbox.max.x + radius;
                        break;
                    case 2:
                        newPosition.y = hitbox.max.y + radius;
                        break;
                    case 3:
                        newPosition.x = hitbox.min.x - radius;
                        break;
                }
            }
            player.body.setPosition(newPosition);
        }

        // Destroy the old fixture
        // eslint moment
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain,@typescript-eslint/no-non-null-assertion
        if (this.body?.getFixtureList() !== null) this.body?.destroyFixture(this.body?.getFixtureList()!);

        // Create a new fixture
        this.createFixture(this.hitbox);

        this.game.partialDirtyObjects.add(this);
    }

    override serializePartial(stream: SuroiBitStream): void {
        stream.writeScale(this.scale);
        stream.writeBoolean(this.dead);
        if (this.isDoor && this.door !== undefined) {
            stream.writeBits(this.door.offset, 2);
        }
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeObstacleRotation(this.rotation, this.definition.rotationMode);
        if (this.definition.variations !== undefined) {
            stream.writeVariation(this.variation);
        }
    }
}
