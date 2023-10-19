import { ObjectCategory, PLAYER_RADIUS } from "../../common/src/constants";
import { type BuildingDefinition } from "../../common/src/definitions/buildings";
import { type ObstacleDefinition, RotationMode } from "../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../common/src/typings";
import {
    CircleHitbox,
    ComplexHitbox,
    type Hitbox,
    type PolygonHitbox,
    RectangleHitbox
} from "../../common/src/utils/hitbox";
import { generateTerrain, River, TerrainGrid } from "../../common/src/utils/mapUtils";
import { addAdjust, addOrientations, angleBetweenPoints, velFromAngle } from "../../common/src/utils/math";
import { log } from "../../common/src/utils/misc";
import { ObjectType } from "../../common/src/utils/objectType";
import {
    random,
    randomBoolean,
    randomFloat,
    randomPointInsideCircle,
    randomRotation,
    randomSign,
    randomVector,
    SeededRandom
} from "../../common/src/utils/random";
import { v, vAdd, vClone, type Vector } from "../../common/src/utils/vector";
import { Config, SpawnMode } from "./config";
import { LootTables } from "./data/lootTables";
import { Maps } from "./data/maps";
import { type Game } from "./game";
import { Building } from "./objects/building";
import { Decal } from "./objects/decal";
import { Obstacle } from "./objects/obstacle";
import { getLootTableLoot } from "./utils/misc";

export class Map {
    readonly game: Game;

    readonly width: number;
    readonly height: number;

    readonly oceanSize: number;
    readonly beachSize: number;

    readonly beachHitbox: Hitbox;

    readonly seed: number;

    readonly places: Array<{
        readonly name: string
        readonly position: Vector
    }> = [];

    readonly rivers: River[];

    readonly riverSpawnHitboxes: PolygonHitbox[];

    terrainGrid: TerrainGrid;

    constructor(game: Game, mapName: string) {
        const mapStartTime = Date.now();
        this.game = game;

        const mapDefinition = Maps[mapName];

        this.seed = random(0, 2 ** 31);

        this.width = mapDefinition.width;
        this.height = mapDefinition.height;
        this.oceanSize = mapDefinition.oceanSize;
        this.beachSize = mapDefinition.beachSize;

        this.terrainGrid = new TerrainGrid(this.width, this.height);

        const randomGenerator = new SeededRandom(this.seed);

        this.rivers = Array.from(
            { length: 3 },
            () => {
                const horizontal = randomBoolean();
                const riverPoints: Vector[] = [];
                const origin = v(
                    horizontal ? randomSign() * this.oceanSize : randomFloat(this.oceanSize, this.width - this.oceanSize),
                    horizontal ? randomFloat(this.oceanSize, this.height - this.oceanSize) : randomSign() * this.oceanSize
                );
                riverPoints.push(origin);

                /**
                 * This dictates the general angle the river takes, which ensures it ends on the other side of the map
                 */
                const mainAngle = angleBetweenPoints(v(this.width / 2, this.height / 2), origin) + randomGenerator.get(-0.5, 0.5);
                //fixme hardcoded constant
                for (let i = 1; i < 25; i++) {
                    riverPoints[i] = vAdd(
                        riverPoints[i - 1],
                        velFromAngle(
                            mainAngle + randomGenerator.get(-0.65, 0.65),
                            randomGenerator.get(50, 80)
                        )
                    );
                }

                return new River(
                    randomGenerator.get(30, 60),
                    riverPoints
                );
            }
        );

        const terrain = generateTerrain(
            this.width,
            this.height,
            this.oceanSize,
            this.beachSize,
            this.seed,
            this.rivers
        );

        for (const river of terrain.rivers) {
            this.terrainGrid.addFloor("water", river.water);
        }

        this.terrainGrid.addFloor("grass", terrain.grass);
        this.terrainGrid.addFloor("sand", terrain.beach);

        this.riverSpawnHitboxes = terrain.riverSpawnHitboxes;

        const beachPadding = mapDefinition.oceanSize + mapDefinition.beachSize;

        this.beachHitbox = new ComplexHitbox([
            new RectangleHitbox(v(0, 0), v(beachPadding, this.height)),
            new RectangleHitbox(v(0, 0), v(this.width, beachPadding)),
            new RectangleHitbox(v(this.width - beachPadding, 0), v(this.width, this.height)),
            new RectangleHitbox(v(0, this.height - beachPadding), v(this.width, this.height))
        ]);

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

            this.generateObstacles(
                obstacle,
                count,
                spawnConfig.spawnProbability,
                spawnConfig.radius,
                spawnConfig.squareRadius
            );
        }

        for (const obstacle in mapDefinition.obstacles) {
            this.generateObstacles(obstacle, mapDefinition.obstacles[obstacle]);
        }

        // Generate loots
        for (const loot in mapDefinition.loots) {
            this.generateLoots(loot, mapDefinition.loots[loot]);
        }

        if (mapDefinition.genCallback) mapDefinition.genCallback(this);

        if (mapDefinition.places) {
            for (const place of mapDefinition.places) {
                const position = v(
                    this.width * (place.position.x + randomFloat(-0.04, 0.04)),
                    this.height * (place.position.y + randomFloat(-0.04, 0.04)));

                this.places.push({
                    name: place.name,
                    position
                });
            }
        }

        log(`Game #${this.game.id} | Map generation took ${Date.now() - mapStartTime}ms`);
    }

    generateBuildings(idString: string, count: number): void {
        const type = ObjectType.fromString<ObjectCategory.Building, BuildingDefinition>(ObjectCategory.Building, idString);

        for (let i = 0; i < count; i++) {
            const orientation = this.getRandomRotation(RotationMode.Limited) as Orientation;
            const position = this.getRandomPositionFor(type, 1, orientation);

            this.generateBuilding(type, position, orientation);
        }
    }

    generateBuilding(type: ObjectType<ObjectCategory.Building, BuildingDefinition>, position: Vector, orientation?: Orientation): Building {
        if (orientation === undefined) orientation = this.getRandomRotation(RotationMode.Limited) as Orientation;

        const building = new Building(this.game, type, vClone(position), orientation);

        const definition = type.definition;

        for (const obstacleData of definition.obstacles) {
            const obstaclePos = addAdjust(position, obstacleData.position, orientation);

            const obstacleType = ObjectType.fromString<ObjectCategory.Obstacle, ObstacleDefinition>(ObjectCategory.Obstacle, obstacleData.id);

            let obstacleRotation = obstacleData.rotation ?? this.getRandomRotation(obstacleType.definition.rotationMode);

            if (obstacleType.definition.rotationMode === RotationMode.Limited) {
                obstacleRotation = addOrientations(orientation, obstacleRotation as Orientation);
            }

            let lootSpawnOffset: Vector | undefined;

            if (obstacleData.lootSpawnOffset) lootSpawnOffset = addAdjust(v(0, 0), obstacleData.lootSpawnOffset, orientation);

            this.generateObstacle(
                obstacleType,
                obstaclePos,
                obstacleRotation,
                obstacleData.scale ?? 1,
                obstacleData.variation,
                lootSpawnOffset,
                building
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

        if (definition.subBuildings) {
            for (const subBuilding of definition.subBuildings) {
                const finalOrientation = addOrientations(orientation, subBuilding.orientation ?? 0);
                this.generateBuilding(
                    ObjectType.fromString(ObjectCategory.Building, subBuilding.id),
                    addAdjust(position, subBuilding.position, finalOrientation),
                    finalOrientation
                );
            }
        }

        if (definition.decals) {
            for (const decal of definition.decals) {
                this.game.grid.addObject(new Decal(this.game, ObjectType.fromString(ObjectCategory.Decal, decal.id), addAdjust(position, decal.position, orientation), decal.rotation));
            }
        }

        for (const floor of definition.floors) {
            const hitbox = floor.hitbox.transform(position, 1, orientation);
            this.terrainGrid.addFloor(floor.type, hitbox);
        }

        if (!definition.hideOnMap) this.game.minimapObjects.add(building);
        this.game.grid.addObject(building);
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

                if (definition.rotationMode === RotationMode.Limited) {
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
        lootSpawnOffset?: Vector,
        parentBuilding?: Building
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
            lootSpawnOffset,
            parentBuilding
        );
        if (!definition.hideOnMap) this.game.minimapObjects.add(obstacle);
        this.game.grid.addObject(obstacle);
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

    getRandomPositionFor(
        type: ObjectType,
        scale = 1,
        orientation: Orientation = 0,
        getPosition?: () => Vector
    ): Vector {
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
                getPosition = (): Vector => randomVector(this.oceanSize,
                    this.width - this.oceanSize,
                    this.oceanSize,
                    this.height - this.oceanSize);
            } else if (type.category === ObjectCategory.Player && Config.spawn.mode === SpawnMode.Radius) {
                const spawn = Config.spawn as { readonly mode: SpawnMode.Radius, readonly position: Vector, readonly radius: number };
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
            const rectHitbox = hitbox.toRectangle();

            if (hitbox.collidesWith(this.beachHitbox)) {
                collided = true;
                continue;
            }

            for (const object of this.game.grid.intersectsRect(rectHitbox)) {
                if (object instanceof Obstacle || object instanceof Building) {
                    if (object.spawnHitbox.collidesWith(hitbox)) {
                        collided = true;
                        break;
                    }
                }
            }

            for (const river of this.riverSpawnHitboxes) {
                if (river.isPointInside(position) || river.collidesWith(rectHitbox)) {
                    collided = true;
                    break;
                }
            }
        }

        return position;
    }

    getRandomPositionInRadiusFor(
        type: ObjectType,
        scale = 1,
        orientation: Orientation = 0,
        radius: number,
        squareRadius?: boolean
    ): Vector {
        if (radius > this.width || radius > this.height) {
            radius = Math.min(this.width, this.height);
        }

        let getPosition: () => Vector;
        if (squareRadius) {
            getPosition = (): Vector => randomVector(this.width / 2 - radius, this.width / 2 + radius, this.height / 2 - radius, this.height / 2 + radius);
        } else {
            getPosition = (): Vector => randomPointInsideCircle(v(this.width / 2, this.height / 2), radius);
        }

        return this.getRandomPositionFor(type, scale, orientation, getPosition);
    }

    getRandomRotation(mode: RotationMode): number {
        switch (mode) {
            case RotationMode.Full:
                return randomRotation();
            case RotationMode.Limited:
                return random(0, 3);
            case RotationMode.Binary:
                return random(0, 1);
            case RotationMode.None:
            default:
                return 0;
        }
    }
}
