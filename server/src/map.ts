import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { ObjectType } from "../../common/src/utils/objectType";
import { v, type Vector } from "../../common/src/utils/vector";
import { type Variation } from "../../common/src/typings";
import {
    random,
    randomFloat,
    randomPointInsideCircle,
    randomRotation,
    randomVector
} from "../../common/src/utils/random";
import { Obstacles, type ObstacleDefinition } from "../../common/src/definitions/obstacles";
import { CircleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { Obstacle } from "./objects/obstacle";
import { MAP_HEIGHT, MAP_WIDTH, ObjectCategory, PLAYER_RADIUS } from "../../common/src/constants";
import { Config, SpawnMode } from "./config";
import { Box, Vec2 } from "planck";
import { Scopes } from "../../common/src/definitions/scopes";
import { Loots } from "../../common/src/definitions/loots";
import { getLootTableLoot } from "./utils/misc";
import { LootTables } from "./data/lootTables";

export class Map {
    game: Game;

    readonly width = MAP_WIDTH;
    readonly height = MAP_HEIGHT;

    constructor(game: Game) {
        const mapStartTime = Date.now();
        this.game = game;

        // Create world boundaries
        this.createWorldBoundary(this.width / 2, 0, this.width / 2, 0);
        this.createWorldBoundary(0, this.height / 2, 0, this.height / 2);
        this.createWorldBoundary(this.width / 2, this.height, this.width / 2, 0);
        this.createWorldBoundary(this.width, this.height / 2, 0, this.height / 2);

        if (!Config.disableMapGeneration) {
            this.generateObstacles("oil_tank", 3, undefined, 200, true);
            this.generateObstacles("oil_tank", 6);
            this.generateObstacles("oak_tree", 140);
            this.generateObstacles("pine_tree", 12);
            this.generateObstacles("birch_tree", 16);
            this.generateObstacles("rock", 140);
            this.generateObstacles("bush", 85);
            this.generateObstacles("blueberry_bush", 20);
            this.generateObstacles("regular_crate", 120);
            this.generateObstacles("aegis_crate", random(3, 4));
            this.generateObstacles("flint_crate", random(3, 4));
            this.generateObstacles("barrel", 70);
            this.generateObstacles("super_barrel", 20);
            this.generateObstacles("gauze_crate", 1);
            this.generateObstacles("cola_crate", 1);
            this.generateObstacles("melee_crate", 1);
            this.generateObstacles("gold_rock", 1);

            // ground loot
            this.generateLoots("ground_loot", 40);
        } else {
            // Obstacle debug code goes here

            // Generate all Obstacles
            const obstaclePos = Vec2(this.width / 2 - 140, this.height / 2);

            for (const obstacle of Obstacles.definitions) {
                for (let i = 0; i < (obstacle.variations ?? 1); i++) {
                    this.obstacleTest(obstacle.idString, obstaclePos.clone(), 0, 1, i as Variation);

                    obstaclePos.x += 20;
                    if (obstaclePos.x > this.width / 2 - 20) {
                        obstaclePos.x = this.width / 2 - 140;
                        obstaclePos.y -= 20;
                    }
                }
            }

            // Generate all Loots
            const itemPos = Vec2(this.width / 2, this.height / 2);
            for (const item of Loots.definitions) {
                this.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString), itemPos, 511);

                itemPos.x += 10;
                if (itemPos.x > this.width / 2 + 100) {
                    itemPos.x = this.width / 2;
                    itemPos.y -= 10;
                }
            }
        }

        log(`Map generation took ${Date.now() - mapStartTime}ms`, true);

        // Calculate visible objects
        const visibleObjectsStartTime = Date.now();
        for (const zoomLevel of Scopes.map(scope => scope.zoomLevel)) {
            this.game.visibleObjects[zoomLevel] = {};
            const xCullDist = zoomLevel * 1.8; const yCullDist = zoomLevel * 1.35;

            for (let x = 0; x <= this.width / 10; x++) {
                this.game.visibleObjects[zoomLevel][x * 10] = {};
                for (let y = 0; y <= this.height / 10; y++) {
                    const visibleObjects = new Set<GameObject>();
                    const minX = (x * 10) - xCullDist;
                    const minY = (y * 10) - yCullDist;
                    const maxX = (x * 10) + xCullDist;
                    const maxY = (y * 10) + yCullDist;

                    for (const object of this.game.staticObjects) {
                        if (object.position.x > minX &&
                            object.position.x < maxX &&
                            object.position.y > minY &&
                            object.position.y < maxY) {
                            visibleObjects.add(object);
                        }
                    }

                    this.game.visibleObjects[zoomLevel][x * 10][y * 10] = visibleObjects;
                }
            }
        }

        log(`Calculating visible objects took ${Date.now() - visibleObjectsStartTime}ms`);
    }

    private generateObstacles(idString: string, count: number, spawnProbability?: number, radius?: number, squareRadius?: boolean): void {
        const type = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, idString);

        for (let i = 0; i < count; i++) {
            if (Math.random() < (spawnProbability ?? 1)) {
                const definition: ObstacleDefinition = type.definition;
                const scale = randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
                const variation: Variation = (definition.variations !== undefined ? random(0, definition.variations - 1) : 0) as Variation;
                let rotation: number;

                switch (definition.rotationMode) {
                    case "full":
                        rotation = randomRotation();
                        break;
                    case "limited":
                        rotation = random(0, 3);
                        break;
                    case "binary":
                        rotation = random(0, 1);
                        break;
                    case "none":
                    default:
                        rotation = 0;
                        break;
                }

                let position = this.getRandomPositionFor(type, scale);
                if (radius !== undefined && squareRadius !== undefined) {
                    position = this.getRandomPositionInRadiusFor(type, scale, radius, squareRadius);
                }

                const obstacle: Obstacle = new Obstacle(
                    this.game,
                    type,
                    position,
                    rotation,
                    scale,
                    variation
                );

                this.game.staticObjects.add(obstacle);
            }
        }
    }

    private obstacleTest(idString: string, position: Vec2, rotation: number, scale: number, variation: Variation): Obstacle {
        const type = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, idString);
        const obstacle: Obstacle = new Obstacle(
            this.game,
            type,
            position,
            rotation,
            scale,
            variation
        );
        this.game.staticObjects.add(obstacle);
        return obstacle;
    }

    private generateLoots(table: string, count: number): void {
        if (LootTables[table] === undefined) {
            throw new Error(`Unknown Loot Table: ${table}`);
        }

        for (let i = 0; i < count; i++) {
            const loot = getLootTableLoot(LootTables[table].loot);

            const position = this.getRandomPositionFor(ObjectType.categoryOnly(ObjectCategory.Loot));

            for (const item of loot) {
                this.game.addLoot(
                    ObjectType.fromString(ObjectCategory.Loot, item.idString),
                    position,
                    item.count);
            }
        }
    }

    getRandomPositionFor(type: ObjectType, scale = 1): Vector {
        let collided = true;
        let position: Vector = v(0, 0);
        let attempts = 0;
        let initialHitbox: Hitbox | undefined;

        // Set up the hitbox
        switch (type.category) {
            case ObjectCategory.Obstacle: {
                const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
                initialHitbox = definition.spawnHitbox ?? definition.hitbox;
                break;
            }
            case ObjectCategory.Player: {
                initialHitbox = new CircleHitbox(PLAYER_RADIUS);
                break;
            }
            case ObjectCategory.Loot: {
                initialHitbox = new CircleHitbox(5);
            }
        }

        if (initialHitbox === undefined) {
            throw new Error(`Unsupported object category: ${type.category}`);
        }

        let getPosition: () => Vector;
        if (type.category === ObjectCategory.Obstacle || type.category === ObjectCategory.Loot ||
             (type.category === ObjectCategory.Player && Config.spawn.mode === SpawnMode.Random)) {
            getPosition = (): Vector => randomVector(12, this.width - 12, 12, this.height - 12);
        } else if (type.category === ObjectCategory.Player && Config.spawn.mode === SpawnMode.Radius) {
            const spawn = Config.spawn as { readonly mode: SpawnMode.Radius, readonly position: Vec2, readonly radius: number };
            getPosition = (): Vector => randomPointInsideCircle(spawn.position, spawn.radius);
        } else {
            getPosition = (): Vector => v(0, 0);
        }

        // Find a valid position
        while (collided && attempts <= 200) {
            attempts++;

            if (attempts >= 200) {
                console.warn(`[WARNING] Maximum spawn attempts exceeded for: ${type.idString}`);
            }

            collided = false;
            position = getPosition();

            const hitbox: Hitbox = initialHitbox.transform(position, scale);
            for (const object of this.game.staticObjects) {
                if (object instanceof Obstacle) {
                    if (object.spawnHitbox.collidesWith(hitbox)) {
                        collided = true;
                    }
                }
            }
        }

        return position;
    }

    getRandomPositionInRadiusFor(type: ObjectType, scale = 1, radius: number, squareRadius: boolean): Vector { // TODO Combine with getRandomPositionFor
        let collided = true;
        let position: Vector = v(0, 0);
        let attempts = 0;
        let initialHitbox: Hitbox | undefined;

        if (radius > this.width || radius > this.height) {
            radius = Math.min(this.width, this.height);
        }
        // Set up the hitbox
        switch (type.category) {
            case ObjectCategory.Obstacle: {
                const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
                initialHitbox = definition.spawnHitbox ?? definition.hitbox;
                break;
            }
            case ObjectCategory.Player: {
                initialHitbox = new CircleHitbox(PLAYER_RADIUS);
                break;
            }
            case ObjectCategory.Loot: {
                initialHitbox = new CircleHitbox(5);
            }
        }

        if (initialHitbox === undefined) {
            throw new Error(`Unsupported object category: ${type.category}`);
        }

        let getPosition: () => Vector;
        if (squareRadius) {
            getPosition = (): Vector => randomVector(this.width / 2 - radius, this.width / 2 + radius, this.height / 2 - radius, this.height / 2 + radius);
        } else {
            getPosition = (): Vector => randomPointInsideCircle(new Vec2(this.width / 2, this.height / 2), radius);
        }

        // Find a valid position
        while (collided && attempts <= 200) {
            attempts++;

            if (attempts >= 200) {
                console.warn(`[WARNING] Maximum spawn attempts exceeded for: ${type.idString}`);
            }

            collided = false;
            position = getPosition();

            const hitbox: Hitbox = initialHitbox.transform(position, scale);
            for (const object of this.game.staticObjects) {
                if (object instanceof Obstacle) {
                    if (object.spawnHitbox.collidesWith(hitbox)) {
                        collided = true;
                    }
                }
            }
        }

        return position;
    }

    private createWorldBoundary(x: number, y: number, width: number, height: number): void {
        const boundary = this.game.world.createBody({
            type: "static",
            position: Vec2(x, y)
        });

        boundary.createFixture({
            shape: Box(width, height),
            userData: {
                is: {
                    player: false,
                    obstacle: true,
                    bullet: false,
                    loot: false
                },
                collidesWith: {
                    player: true,
                    obstacle: false,
                    bullet: true,
                    loot: true
                }
            }
        });
    }
}
