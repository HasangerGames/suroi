import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { ObjectType } from "../../common/src/utils/objectType";
import { v, vClone, type Vector } from "../../common/src/utils/vector";
import { type Variation, type Orientation } from "../../common/src/typings";
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
import { type BuildingDefinition } from "../../common/src/definitions/buildings";
import { Building } from "./objects/building";
import { addAdjust, addOrientations } from "../../common/src/utils/math";

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

        // Generate buildings

        for (const building in mapDefinition.buildings) {
            this.generateBuildings(building, mapDefinition.buildings[building]);
        }

        // Generate Obstacles
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

        // Generate loots
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

    generateBuildings(idString: string, count: number): void {
        const type = ObjectType.fromString<ObjectCategory.Building, BuildingDefinition>(ObjectCategory.Building, idString);

        for (let i = 0; i < count; i++) {
            const orientation = this.getRandomRotation("limited") as Orientation;
            const position = this.getRandomPositionFor(type, 1, orientation);

            this.generateBuilding(type, position, orientation);
        }
    }

    generateBuilding(type: ObjectType<ObjectCategory.Building, BuildingDefinition>, position: Vector, orientation?: Orientation): Building {
        if (orientation === undefined) orientation = this.getRandomRotation("limited") as Orientation;

        const building = new Building(this.game, type, vClone(position), orientation);

        const definition = type.definition;

        for (const obstacleData of definition.obstacles) {
            const obstaclePos = addAdjust(position, obstacleData.position, orientation);

            const obstacleType = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, obstacleData.id);

            let obstacleRotation = obstacleData.rotation ?? this.getRandomRotation(obstacleType.definition.rotationMode);

            if (obstacleType.definition.rotationMode === "limited") {
                obstacleRotation = addOrientations(orientation, obstacleRotation as Orientation);
            }

            this.generateObstacle(
                obstacleType,
                obstaclePos,
                obstacleRotation,
                obstacleData.scale ?? 1,
                obstacleData.variation,
                orientation,
                addAdjust(v(0, 0), obstacleData.lootSpawnOffset ?? v(0, 0), orientation)
            );
        }

        if (definition.lootSpawners) {
            for (const lootData of definition.lootSpawners) {
                const loot = getLootTableLoot(LootTables[lootData.table].loot);

                for (const item of loot) {
                    this.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString),
                        addAdjust(position, lootData.position, orientation),
                        item.count);
                }
            }
        }

        this.game.staticObjects.add(building);
        return building;
    }

    generateObstacles(
        idString: string,
        count: number,
        spawnProbability?: number,
        radius?: number,
        squareRadius?: boolean
    ): void {
        const type = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, idString);

        for (let i = 0; i < count; i++) {
            if (Math.random() < (spawnProbability ?? 1)) {
                const definition: ObstacleDefinition = type.definition;
                const scale = randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
                const variation: Variation = (definition.variations !== undefined ? random(0, definition.variations - 1) : 0) as Variation;

                const rotation = this.getRandomRotation(definition.rotationMode);

                let orientation: Orientation = 0;

                if (definition.rotationMode === "limited") {
                    orientation = rotation as Orientation;
                }

                let position = this.getRandomPositionFor(type, scale, orientation);
                if (radius !== undefined) {
                    position = this.getRandomPositionInRadiusFor(type, scale, orientation, radius, squareRadius);
                }

                this.generateObstacle(type, position, undefined, scale, variation);
            }
        }
    }

    generateObstacle(
        type: string | ObjectType<ObjectCategory.Obstacle, ObstacleDefinition>,
        position: Vector,
        rotation?: number,
        scale?: number,
        variation?: Variation,
        orientation?: Orientation,
        lootSpawnOffset?: Vector
    ): Obstacle {
        if (typeof type === "string") {
            type = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, type);
        }

        const definition: ObstacleDefinition = type.definition;

        if (scale === undefined) scale = randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
        if (variation === undefined && definition.variations) {
            variation = random(0, definition.variations - 1) as Variation;
        }

        if (rotation === undefined) rotation = this.getRandomRotation(definition.rotationMode);

        const obstacle: Obstacle = new Obstacle(
            this.game,
            type,
            vClone(position),
            rotation,
            scale,
            variation,
            lootSpawnOffset
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

    getRandomPositionFor(type: ObjectType, scale = 1, orientation: Orientation = 0, getPosition?: () => Vector): Vector {
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
                break;
            }
            case ObjectCategory.Building: {
                initialHitbox = (type.definition as BuildingDefinition).spawnHitbox;
                break;
            }
        }

        if (initialHitbox === undefined) {
            throw new Error(`Unsupported object category: ${type.category}`);
        }

        if (!getPosition) {
            if (type.category === ObjectCategory.Obstacle ||
                type.category === ObjectCategory.Loot ||
                type.category === ObjectCategory.Building ||
            (type.category === ObjectCategory.Player && Config.spawn.mode === SpawnMode.Random)) {
                let offset = 12;
                if (type.category === ObjectCategory.Building) offset = 50;

                getPosition = (): Vector => randomVector(offset, this.width - offset, offset, this.height - offset);
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

            const hitbox = initialHitbox.transform(position, scale, orientation);

            for (const object of this.game.staticObjects) {
                if (object instanceof Obstacle || object instanceof Building) {
                    if (object.spawnHitbox.collidesWith(hitbox)) {
                        collided = true;
                        break;
                    }
                }
            }
        }

        return position;
    }

    getRandomPositionInRadiusFor(type: ObjectType, scale = 1, orientation: Orientation = 0, radius: number, squareRadius?: boolean): Vector {
        if (radius > this.width || radius > this.height) {
            radius = Math.min(this.width, this.height);
        }

        let getPosition: () => Vector;
        if (squareRadius) {
            getPosition = (): Vector => randomVector(this.width / 2 - radius, this.width / 2 + radius, this.height / 2 - radius, this.height / 2 + radius);
        } else {
            getPosition = (): Vector => randomPointInsideCircle(new Vec2(this.width / 2, this.height / 2), radius);
        }

        return this.getRandomPositionFor(type, scale, orientation, getPosition);
    }

    getRandomRotation(mode: ObstacleDefinition["rotationMode"]): number {
        switch (mode) {
            case "full":
                return randomRotation();
            case "limited":
                return random(0, 3);
            case "binary":
                return random(0, 1);
            case "none":
            default:
                return 0;
        }
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
                    object: false
                },
                collidesWith: {
                    player: true,
                    obstacle: false,
                    bullet: true,
                    object: true
                }
            }
        });
    }
}
