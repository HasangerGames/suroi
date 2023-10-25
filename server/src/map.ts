import { ObjectCategory, PLAYER_RADIUS } from "../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../common/src/definitions/buildings";
import { Decals } from "../../common/src/definitions/decals";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../common/src/typings";
import { CircleHitbox, ComplexHitbox, type PolygonHitbox, RectangleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { River, TerrainGrid, generateTerrain } from "../../common/src/utils/mapUtils";
import { addAdjust, addOrientations, angleBetweenPoints, velFromAngle } from "../../common/src/utils/math";
import { log } from "../../common/src/utils/misc";
import { reifyDefinition, type ReferenceTo, ObstacleSpecialRoles } from "../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../common/src/utils/objectType";
import { SeededRandom, pickRandomInArray, random, randomBoolean, randomFloat, randomPointInsideCircle, randomRotation, randomVector } from "../../common/src/utils/random";
import { v, vAdd, vClone, type Vector } from "../../common/src/utils/vector";
import { Config, SpawnMode } from "./config";
import { LootTables, type WeightedItem } from "./data/lootTables";
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

    readonly oceanHitbox: Hitbox;

    readonly seed = random(0, 2 ** 31);

    readonly places: Array<{
        readonly name: string
        readonly position: Vector
    }> = [];

    readonly rivers: River[];

    readonly riverSpawnHitboxes: PolygonHitbox[];

    readonly terrainGrid: TerrainGrid;

    constructor(game: Game, mapName: string) {
        const mapStartTime = Date.now();
        this.game = game;

        const mapDefinition = Maps[mapName];

        this.seed = random(0, 2 ** 31);

        this.width = mapDefinition.width;
        this.height = mapDefinition.height;
        this.oceanSize = mapDefinition.oceanSize;
        this.beachSize = mapDefinition.beachSize;

        const beachPadding = mapDefinition.oceanSize + mapDefinition.beachSize;

        this.oceanHitbox = new ComplexHitbox(
            new RectangleHitbox(v(0, 0), v(beachPadding, this.height)),
            new RectangleHitbox(v(0, 0), v(this.width, beachPadding)),
            new RectangleHitbox(v(this.width - beachPadding, 0), v(this.width, this.height)),
            new RectangleHitbox(v(0, this.height - beachPadding), v(this.width, this.height))
        );

        this.terrainGrid = new TerrainGrid(this.width, this.height);

        const randomGenerator = new SeededRandom(this.seed);

        let hasWideRiver = false;

        const mapRect = new RectangleHitbox(
            v(mapDefinition.oceanSize, mapDefinition.oceanSize),
            v(this.width - mapDefinition.oceanSize, this.height - mapDefinition.oceanSize)
        );

        this.rivers = Array.from(
            { length: mapDefinition.rivers ?? 0 },
            () => {
                const riverPoints: Vector[] = [];

                const padding = mapDefinition.oceanSize - 10;
                let start: Vector;

                const horizontal = randomBoolean();
                const reverse = randomBoolean();

                const halfWidth = this.width / 2;
                const halfHeight = this.height / 2;
                const width = this.width - padding;
                const height = this.height - padding;
                if (horizontal) {
                    const topHalf = randomFloat(padding, halfHeight);
                    const bottomHalf = randomFloat(halfHeight, height);
                    start = v(padding, reverse ? bottomHalf : topHalf);
                } else {
                    const leftHalf = randomFloat(padding, halfWidth);
                    const rightHalf = randomFloat(halfWidth, width);
                    start = v(reverse ? rightHalf : leftHalf, padding);
                }

                riverPoints.push(start);

                const mainAngle = angleBetweenPoints(v(this.width / 2, this.height / 2), start);
                const maxDeviation = 0.5;

                for (
                    let i = 1, angle = mainAngle + randomGenerator.get(-maxDeviation, maxDeviation);
                    i < 50;
                    i++, angle = angle + randomGenerator.get(-maxDeviation, maxDeviation)
                ) {
                    riverPoints[i] = vAdd(riverPoints[i - 1], velFromAngle(angle, randomGenerator.get(50, 60)));

                    if (!mapRect.isPointInside(riverPoints[i])) break;
                }

                const wide = !hasWideRiver && randomBoolean();
                if (wide) hasWideRiver = true;
                return new River(
                    wide ? randomGenerator.get(50, 60) : randomGenerator.get(20, 30),
                    wide ? 15 : 9,
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
        for (const river of terrain.rivers) {
            this.terrainGrid.addFloor("sand", river.bank);
        }
        this.terrainGrid.addFloor("grass", terrain.grass);
        this.terrainGrid.addFloor("sand", terrain.beach);

        this.riverSpawnHitboxes = terrain.riverSpawnHitboxes;

        // TODO Make a specialBuildings property
        if (mapName === "main") {
            const width = this.width; const height = this.height; const shoreDist = 285; const sideDist = 1024;
            const initialHitbox = Buildings.getByIDString("port").spawnHitbox;
            let collided = true;
            let position: Vector | undefined;
            let orientation: Orientation | undefined;
            for (let attempts = 0; collided && attempts < 200; attempts++) {
                orientation = random(0, 3) as Orientation;
                switch (orientation) {
                    case 0:
                        position = v(width - shoreDist, randomFloat(sideDist, height - sideDist));
                        break;
                    case 1:
                        position = v(randomFloat(sideDist, width - sideDist), shoreDist);
                        break;
                    case 2:
                        position = v(shoreDist, randomFloat(sideDist, height - sideDist));
                        break;
                    case 3:
                        position = v(randomFloat(sideDist, width - sideDist), height - shoreDist);
                        break;
                }

                collided = false;
                const hitbox = initialHitbox.transform(position, 1, orientation);
                for (const river of this.riverSpawnHitboxes) {
                    if (river.isPointInside(position) || river.collidesWith(hitbox)) {
                        collided = true;
                        break;
                    }
                }
            }
            if (position !== undefined && orientation !== undefined) this.generateBuilding("port", position, orientation);
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
                    this.height * (place.position.y + randomFloat(-0.04, 0.04))
                );

                this.places.push({
                    name: place.name,
                    position
                });
            }
        }

        log(`Game #${this.game.id} | Map generation took ${Date.now() - mapStartTime}ms`);
    }

    generateBuildings(
        definition: BuildingDefinition | ReferenceTo<BuildingDefinition>,
        count: number
    ): void {
        definition = reifyDefinition(definition, Buildings);
        const rotationMode = definition.rotationMode ?? RotationMode.Limited;

        for (let i = 0; i < count; i++) {
            const orientation = Map.getRandomBuildingOrientation(rotationMode);

            this.generateBuilding(
                definition,
                this.getRandomPositionFor(
                    ObjectType.fromString<ObjectCategory.Building, BuildingDefinition>(ObjectCategory.Building, definition.idString),
                    1,
                    orientation
                ),
                orientation
            );
        }
    }

    generateBuilding(
        definition: BuildingDefinition | ReferenceTo<BuildingDefinition>,
        position: Vector,
        orientation?: Orientation
    ): Building {
        definition = reifyDefinition(definition, Buildings);
        orientation ??= Map.getRandomBuildingOrientation(definition.rotationMode ?? RotationMode.Limited);

        const building = new Building(this.game, definition, vClone(position), orientation);

        for (const obstacleData of definition.obstacles ?? []) {
            const obstacleDef = Obstacles.getByIDString(obstacleData.idString);
            let obstacleRotation = obstacleData.rotation ?? Map.getRandomRotation(obstacleDef.rotationMode);

            if (obstacleDef.rotationMode === RotationMode.Limited) {
                obstacleRotation = addOrientations(orientation, obstacleRotation as Orientation);
            }

            let lootSpawnOffset: Vector | undefined;

            if (obstacleData.lootSpawnOffset) lootSpawnOffset = addAdjust(v(0, 0), obstacleData.lootSpawnOffset, orientation);

            const obstacle = this.generateObstacle(
                obstacleDef,
                addAdjust(position, obstacleData.position, orientation),
                obstacleRotation,
                obstacleData.scale ?? 1,
                obstacleData.variation,
                lootSpawnOffset,
                building
            );

            if (obstacleDef.role === ObstacleSpecialRoles.Activatable ||
                obstacleDef.role === ObstacleSpecialRoles.Door) {
                building.interactableObstacles.add(obstacle);
            }
        }

        for (const lootData of definition.lootSpawners ?? []) {
            const table = LootTables[lootData.table];
            const drops = table.loot;

            for (
                const item of Array.from(
                    { length: random(table.min, table.max) },
                    () => getLootTableLoot(drops as WeightedItem[]) // fixme This will break if multiple tables are specified
                ).flat()
            ) {
                this.game.addLoot(
                    item.idString,
                    addAdjust(position, lootData.position, orientation),
                    item.count
                );
            }
        }

        for (const subBuilding of definition.subBuildings ?? []) {
            const finalOrientation = addOrientations(orientation, subBuilding.orientation ?? 0);
            this.generateBuilding(
                subBuilding.idString,
                addAdjust(position, subBuilding.position, finalOrientation),
                finalOrientation
            );
        }

        for (const floor of definition.floors ?? []) {
            this.terrainGrid.addFloor(floor.type, floor.hitbox.transform(position, 1, orientation));
        }

        for (const decal of definition.decals ?? []) {
            this.game.grid.addObject(new Decal(this.game, reifyDefinition(decal.id, Decals), addAdjust(position, decal.position, orientation), addOrientations(orientation, decal.rotation ?? 0)));
        }

        if (!definition.hideOnMap) this.game.minimapObjects.add(building);
        this.game.grid.addObject(building);
        return building;
    }

    generateObstacles(
        definition: ReferenceTo<ObstacleDefinition> | ObstacleDefinition,
        count: number,
        spawnProbability?: number,
        radius?: number,
        squareRadius?: boolean
    ): void {
        definition = reifyDefinition(definition, Obstacles);
        const type = ObjectType.fromString(ObjectCategory.Obstacle, definition.idString);

        for (let i = 0; i < count; i++) {
            if (Math.random() < (spawnProbability ??= 1)) {
                const scale = randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
                const variation = (definition.variations !== undefined ? random(0, definition.variations - 1) : 0) as Variation;
                const rotation = Map.getRandomRotation(definition.rotationMode);

                let orientation: Orientation = 0;

                if (definition.rotationMode === RotationMode.Limited) {
                    orientation = rotation as Orientation;
                }

                let position = this.getRandomPositionFor(type, scale, orientation);
                if (radius !== undefined) {
                    position = this.getRandomPositionInRadiusFor(type, scale, orientation, radius, squareRadius);
                }

                this.generateObstacle(definition, position, undefined, scale, variation);
            }
        }
    }

    generateObstacle(
        definition: ReferenceTo<ObstacleDefinition> | ObstacleDefinition,
        position: Vector,
        rotation?: number,
        scale?: number,
        variation?: Variation,
        lootSpawnOffset?: Vector,
        parentBuilding?: Building
    ): Obstacle {
        definition = reifyDefinition(definition, Obstacles);

        scale ??= randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
        if (variation === undefined && definition.variations) {
            variation = random(0, definition.variations - 1) as Variation;
        }

        rotation ??= Map.getRandomRotation(definition.rotationMode);

        const obstacle = new Obstacle(
            this.game,
            definition,
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
            const loot = getLootTableLoot(LootTables[table].loot.flat());

            const position = this.getRandomPositionFor(ObjectType.fromString(ObjectCategory.Loot, loot[0].idString));

            for (const item of loot) {
                this.game.addLoot(
                    item.idString,
                    position,
                    item.count
                );
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
            if (
                type.category === ObjectCategory.Obstacle ||
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

            if (hitbox.collidesWith(this.oceanHitbox)) {
                collided = true;
                continue;
            }

            for (const object of this.game.grid.intersectsHitbox(rectHitbox)) {
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
        switch (true) {
            case radius === 0: {
                getPosition = () => v(0, 0);
                break;
            }
            case squareRadius: {
                getPosition = () => randomVector(this.width / 2 - radius, this.width / 2 + radius, this.height / 2 - radius, this.height / 2 + radius);
                break;
            }
            default: {
                getPosition = () => randomPointInsideCircle(v(this.width / 2, this.height / 2), radius);
                break;
            }
        }

        return this.getRandomPositionFor(type, scale, orientation, getPosition);
    }

    static getRandomRotation<T extends RotationMode>(mode: T): RotationMapping[T] {
        switch (mode) {
            case RotationMode.Full:
                //@ts-expect-error not sure why ts thinks the return type should be 0
                return randomRotation();
            case RotationMode.Limited:
                //@ts-expect-error see above
                return random(0, 3);
            case RotationMode.Binary:
                //@ts-expect-error see above
                return random(0, 1);
            case RotationMode.None:
            default:
                return 0;
        }
    }

    static getRandomBuildingOrientation(mode: NonNullable<BuildingDefinition["rotationMode"]>): Orientation {
        switch (mode) {
            case RotationMode.Binary:
                return pickRandomInArray([0, 2]);
            case RotationMode.Limited:
            case RotationMode.None:
            default:
                return Map.getRandomRotation(mode);
        }
    }
}

interface RotationMapping {
    [RotationMode.Full]: number
    [RotationMode.Limited]: Orientation
    [RotationMode.Binary]: 0 | 1
    [RotationMode.None]: 0
}
