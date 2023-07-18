import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { ObjectType } from "../../common/src/utils/objectType";
import { v, vClone, type Vector } from "../../common/src/utils/vector";
import { type Variation } from "../../common/src/typings";
import {
    random,
    randomFloat,
    randomPointInsideCircle,
    randomRotation,
    randomVector
} from "../../common/src/utils/random";
import { type ObstacleDefinition } from "../../common/src/definitions/obstacles";
import { CircleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { Obstacle } from "./objects/obstacle";
import { MAP_HEIGHT, MAP_WIDTH, ObjectCategory, PLAYER_RADIUS } from "../../common/src/constants";
import { Config, SpawnMode } from "./config";
import { Box, Vec2 } from "planck";
import { Scopes } from "../../common/src/definitions/scopes";
import { getLootTableLoot } from "./utils/misc";
import { LootTables } from "./data/lootTables";
import { Maps } from "./data/maps";

export class Map {
    game: Game;

    readonly width = MAP_WIDTH;
    readonly height = MAP_HEIGHT;

    constructor(game: Game, mapName: string) {
        const mapStartTime = Date.now();
        this.game = game;

        // Create world boundaries
        this.createWorldBoundary(this.width / 2, 0, this.width / 2, 0);
        this.createWorldBoundary(0, this.height / 2, 0, this.height / 2);
        this.createWorldBoundary(this.width / 2, this.height, this.width / 2, 0);
        this.createWorldBoundary(this.width, this.height / 2, 0, this.height / 2);

        const mapDefinition = Maps[mapName];

        if (mapDefinition === undefined) {
            throw new Error(`Unknown map: ${mapName}`);
        }

        for (const obstacle in mapDefinition.specialObstacles) {
            const spawnConfig = mapDefinition.specialObstacles[obstacle];

            let count: number;

            if ("count" in spawnConfig) {
                count = spawnConfig.count;
            } else {
                count = random(spawnConfig.min, spawnConfig.max);
            }

            this.generateObstacles(obstacle,
                count,
                spawnConfig.spawnProbability,
                spawnConfig.radius,
                spawnConfig.squareRadius);
        }

        for (const obstacle in mapDefinition.obstacles) {
            this.generateObstacles(obstacle, mapDefinition.obstacles[obstacle]);
        }

        for (const loot in mapDefinition.loots) {
            this.generateLoots(loot, mapDefinition.loots[loot]);
        }

        if (mapDefinition.genCallback) mapDefinition.genCallback(this);

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

    generateObstacles(idString: string, count: number, spawnProbability?: number, radius?: number, squareRadius?: boolean): void {
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
                if (radius !== undefined) {
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

    obstacleTest(idString: string, position: Vector, rotation: number, scale: number, variation: Variation): Obstacle {
        const type = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, idString);
        const obstacle: Obstacle = new Obstacle(
            this.game,
            type,
            vClone(position),
            rotation,
            scale,
            variation
        );
        this.game.staticObjects.add(obstacle);
        return obstacle;
    }

    generateLoots(table: string, count: number): void {
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

    getRandomPositionFor(type: ObjectType, scale = 1, getPosition?: () => Vector): Vector {
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

        if (!getPosition) {
            if (type.category === ObjectCategory.Obstacle || type.category === ObjectCategory.Loot ||
                 (type.category === ObjectCategory.Player && Config.spawn.mode === SpawnMode.Random)) {
                getPosition = (): Vector => randomVector(12, this.width - 12, 12, this.height - 12);
            } else if (type.category === ObjectCategory.Player && Config.spawn.mode === SpawnMode.Radius) {
                const spawn = Config.spawn as { readonly mode: SpawnMode.Radius, readonly position: Vec2, readonly radius: number };
                getPosition = (): Vector => randomPointInsideCircle(spawn.position, spawn.radius);
            } else {
                getPosition = (): Vector => v(0, 0);
            }
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

    getRandomPositionInRadiusFor(type: ObjectType, scale = 1, radius: number, squareRadius?: boolean): Vector {
        if (radius > this.width || radius > this.height) {
            radius = Math.min(this.width, this.height);
        }

        let getPosition: () => Vector;
        if (squareRadius) {
            getPosition = (): Vector => randomVector(this.width / 2 - radius, this.width / 2 + radius, this.height / 2 - radius, this.height / 2 + radius);
        } else {
            getPosition = (): Vector => randomPointInsideCircle(new Vec2(this.width / 2, this.height / 2), radius);
        }

        return this.getRandomPositionFor(type, scale, getPosition);
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
