import { Buildings, type BuildingDefinition } from "../../common/src/definitions/buildings.js";
import { Decals } from "../../common/src/definitions/decals.js";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../../common/src/definitions/obstacles.js";
import { type Orientation, type Variation } from "../../common/src/typings.js";
import { CircleHitbox, ComplexHitbox, RectangleHitbox, type Hitbox } from "../../common/src/utils/hitbox.js";
import { River, Terrain } from "../../common/src/utils/terrain.js";
import { addAdjust, addOrientations, angleBetweenPoints, distance, lerp, lineIntersectsLine, velFromAngle } from "../../common/src/utils/math.js";
import { type ReferenceTo, ObstacleSpecialRoles, type ReifiableDef, MapObjectSpawnMode } from "../../common/src/utils/objectDefinitions.js";
import { SeededRandom, pickRandomInArray, random, randomFloat, randomRotation, randomVector } from "../../common/src/utils/random.js";
import { v, vAdd, vClone, type Vector } from "../../common/src/utils/vector.js";
import { MapPacket } from "../../common/src/packets/mapPacket.js";
import { LootTables, type WeightedItem } from "./data/lootTables.js";
import { Maps } from "./data/maps.js";
import { type Game } from "./game.js";
import { Building } from "./objects/building.js";
import { Decal } from "./objects/decal.js";
import { Obstacle } from "./objects/obstacle.js";
import { Logger, getLootTableLoot, getRandomIdString } from "./utils/misc.js";
import { ObjectCategory } from "../../common/src/constants.js";

export class Map {
    readonly game: Game;

    readonly width: number;
    readonly height: number;

    readonly oceanSize: number;
    readonly beachSize: number;

    readonly beachHitbox: ComplexHitbox;

    readonly seed: number;

    readonly terrain: Terrain;

    readonly packet: MapPacket;

    /**
    * A cached map packet buffer
    * Since the map is static, there's no reason to serialize a map packet for each player that joins the game
    */
    readonly buffer: ArrayBuffer;

    private readonly _beachPadding;

    constructor(game: Game, mapName: string) {
        this.game = game;

        const mapDefinition = Maps[mapName];

        const packet = this.packet = new MapPacket();

        this.seed = packet.seed = random(0, 2 ** 31);

        Logger.log(`Game ${game.id} | Map seed: ${this.seed}`);

        this.width = packet.width = mapDefinition.width;
        this.height = packet.height = mapDefinition.height;
        this.oceanSize = packet.oceanSize = mapDefinition.oceanSize;
        this.beachSize = packet.beachSize = mapDefinition.beachSize;

        // + 8 to account for the jagged points
        const beachPadding = this._beachPadding = mapDefinition.oceanSize + mapDefinition.beachSize + 8;
        const oceanSize = this.oceanSize + 8;

        this.beachHitbox = new ComplexHitbox(
            new RectangleHitbox(
                v(this.width - beachPadding, oceanSize),
                v(this.width - oceanSize, this.height - oceanSize)
            ),
            new RectangleHitbox(
                v(oceanSize, oceanSize),
                v(this.width - beachPadding, beachPadding)
            ),
            new RectangleHitbox(
                v(oceanSize, oceanSize),
                v(beachPadding, this.height - beachPadding)
            ),
            new RectangleHitbox(
                v(oceanSize, this.height - beachPadding),
                v(this.width - beachPadding, this.height - oceanSize)
            )
        );

        const rivers: River[] = [];

        if (mapDefinition.rivers) {
            const riverDef = mapDefinition.rivers;

            const riverPadding = 64;

            const riverRect = new RectangleHitbox(
                v(riverPadding, riverPadding),
                v(this.width - riverPadding, this.height - riverPadding)
            );

            const randomGenerator = new SeededRandom(this.seed);

            const widths: number[] = [];
            const amount = randomGenerator.getInt(riverDef.minAmount, riverDef.maxAmount);

            // generate a list of widths and sort by biggest, to make sure wide rivers generate first
            for (let i = 0; i < amount; i++) {
                const wide = randomGenerator.get() < riverDef.wideChance;
                widths.push(wide
                    ? randomGenerator.getInt(riverDef.minWideWidth, riverDef.maxWideWidth)
                    : randomGenerator.getInt(riverDef.minWidth, riverDef.maxWidth));
            }
            widths.sort((a, b) => b - a);

            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const center = v(halfWidth, halfHeight);
            const width = this.width - riverPadding;
            const height = this.height - riverPadding;

            let attempts = 0;
            while (rivers.length < amount && attempts < 100) {
                attempts++;
                let start: Vector;

                const horizontal = !!randomGenerator.getInt();
                const reverse = !!randomGenerator.getInt();

                if (horizontal) {
                    const topHalf = randomGenerator.get(riverPadding, halfHeight);
                    const bottomHalf = randomGenerator.get(halfHeight, height);
                    start = v(riverPadding, reverse ? bottomHalf : topHalf);
                } else {
                    const leftHalf = randomGenerator.get(riverPadding, halfWidth);
                    const rightHalf = randomGenerator.get(halfWidth, width);
                    start = v(reverse ? rightHalf : leftHalf, riverPadding);
                }

                const startAngle = angleBetweenPoints(center, start) + (reverse ? 0 : Math.PI);

                this.generateRiver(
                    start,
                    startAngle,
                    widths[rivers.length],
                    riverRect,
                    rivers,
                    randomGenerator
                );
            }
        }

        this.packet.rivers = rivers;

        this.terrain = new Terrain(
            this.width,
            this.height,
            mapDefinition.oceanSize,
            mapDefinition.beachSize,
            this.seed,
            rivers
        );

        // Generate buildings
        for (const building in mapDefinition.buildings) {
            this.generateBuildings(building, mapDefinition.buildings[building]);
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

                packet.places.push({
                    name: place.name,
                    position
                });
            }
        }

        packet.serialize();
        this.buffer = packet.getBuffer();
    }

    generateRiver(
        startPos: Vector,
        startAngle: number,
        width: number,
        bounds: RectangleHitbox,
        rivers: River[],
        randomGenerator: SeededRandom
    ): void {
        const riverPoints: Vector[] = [];

        riverPoints.push(startPos);

        let angle = startAngle;

        for (let i = 1; i < 60; i++) {
            const lastPoint = riverPoints[i - 1];
            const center = v(this.width / 2, this.height / 2);

            const distFactor = distance(lastPoint, center) / (this.width / 2);

            const maxDeviation = lerp(0.8, 0.1, distFactor);
            const minDeviation = lerp(0.3, 0.1, distFactor);

            angle = angle + randomGenerator.get(
                -randomGenerator.get(minDeviation, maxDeviation),
                randomGenerator.get(minDeviation, maxDeviation)
            );

            const pos = vAdd(lastPoint, velFromAngle(angle, randomGenerator.getInt(30, 80)));

            let collided = false;

            // end the river if it collides with another river
            for (const river of rivers) {
                const points = river.points;
                for (let j = 1; j < points.length; j++) {
                    const intersection = lineIntersectsLine(lastPoint, pos, points[j - 1], points[j]);
                    if (intersection) {
                        const dist = distance(intersection, riverPoints[i - 1]);
                        if (dist > 16) riverPoints[i] = intersection;
                        collided = true;
                        break;
                    }
                }
                if (collided) break;
            }
            if (collided) break;
            riverPoints[i] = pos;

            if (!bounds.isPointInside(pos)) break;
        }
        if (riverPoints.length < 20 || riverPoints.length > 59) return;

        rivers.push(new River(width, riverPoints, rivers));
    }

    generateBuildings(definition: ReifiableDef<BuildingDefinition>, count: number): void {
        definition = Buildings.reify(definition);
        const rotationMode = definition.rotationMode ?? RotationMode.Limited;

        for (let i = 0; i < count; i++) {
            let orientation = Map.getRandomBuildingOrientation(rotationMode);

            const position = this.getRandomPosition(definition.spawnHitbox, {
                orientation,
                spawnMode: definition.spawnMode,
                getOrientation: (newOrientation: Orientation) => {
                    orientation = newOrientation;
                },
                maxAttempts: 400
            });
            if (!position) {
                Logger.warn(`Failed to find valid position for building ${definition.idString}`);
                continue;
            }
            this.generateBuilding(definition, position, orientation);
        }
    }

    generateBuilding(
        definition: ReifiableDef<BuildingDefinition>,
        position: Vector,
        orientation?: Orientation
    ): Building {
        definition = Buildings.reify(definition);
        orientation ??= Map.getRandomBuildingOrientation(definition.rotationMode ?? RotationMode.Limited);

        const building = new Building(this.game, definition, vClone(position), orientation);

        for (const obstacleData of definition.obstacles ?? []) {
            const obstacleDef = Obstacles.fromString(getRandomIdString(obstacleData.idString));
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
                getRandomIdString(subBuilding.idString),
                addAdjust(position, subBuilding.position, finalOrientation),
                finalOrientation
            );
        }

        for (const floor of definition.floors ?? []) {
            this.terrain.addFloor(floor.type, floor.hitbox.transform(position, 1, orientation));
        }

        for (const decal of definition.decals ?? []) {
            this.game.grid.addObject(new Decal(this.game, Decals.reify(decal.id), addAdjust(position, decal.position, orientation), addOrientations(orientation, decal.orientation ?? 0)));
        }

        if (!definition.hideOnMap) this.packet.objects.push(building);
        this.game.grid.addObject(building);
        return building;
    }

    generateObstacles(definition: ReifiableDef<ObstacleDefinition>, count: number): void {
        definition = Obstacles.reify(definition);

        for (let i = 0; i < count; i++) {
            const scale = randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
            const variation = (definition.variations !== undefined ? random(0, definition.variations - 1) : 0) as Variation;
            const rotation = Map.getRandomRotation(definition.rotationMode);

            let orientation: Orientation = 0;

            if (definition.rotationMode === RotationMode.Limited) {
                orientation = rotation as Orientation;
            }

            const hitbox = definition.spawnHitbox ?? definition.hitbox;

            const position = this.getRandomPosition(hitbox, {
                scale,
                orientation,
                spawnMode: definition.spawnMode
            });

            if (!position) {
                Logger.warn(`Failed to find valid position for obstacle ${definition.idString}`);
                continue;
            }

            this.generateObstacle(definition, position, undefined, scale, variation);
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
        definition = Obstacles.reify(definition);

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

        if (!definition.hideOnMap) this.packet.objects.push(obstacle);
        this.game.grid.addObject(obstacle);
        this.game.updateObjects = true;
        return obstacle;
    }

    generateLoots(table: keyof typeof LootTables, count: number): void {
        if (!(table in LootTables)) {
            throw new Error(`Unknown loot table: '${table}'`);
        }

        for (let i = 0; i < count; i++) {
            const loot = getLootTableLoot(LootTables[table].loot.flat());
            //                                                   ^^^^^^ dubious?

            const position = this.getRandomPosition(
                new CircleHitbox(5),
                { spawnMode: MapObjectSpawnMode.GrassAndSand }
            );

            if (!position) {
                Logger.warn(`Failed to find valid position for loot generated from table '${table}'`);
                continue;
            }

            for (const item of loot) {
                this.game.addLoot(
                    item.idString,
                    position,
                    item.count
                );
            }
        }
    }

    getRandomPosition(initialHitbox: Hitbox, params?: {
        getPosition?: () => Vector
        collides?: (position: Vector) => boolean
        collidableObjects?: Partial<Record<ObjectCategory, boolean>>
        spawnMode?: MapObjectSpawnMode
        scale?: number
        orientation?: Orientation
        maxAttempts?: number
        // used for beach spawn mode
        // so it can retry on different orientations
        getOrientation?: (orientation: Orientation) => void
    }): Vector | undefined {
        let position = v(0, 0);

        const scale = params?.scale ?? 1;
        let orientation = params?.orientation ?? 0;
        const maxAttempts = params?.maxAttempts ?? 200;

        const collidableObjects = params?.collidableObjects ?? {
            [ObjectCategory.Obstacle]: true,
            [ObjectCategory.Building]: true
        };

        const spawnMode = params?.spawnMode ?? MapObjectSpawnMode.Grass;

        let getPosition: () => Vector;

        const rect = initialHitbox.toRectangle();
        const width = rect.max.x - rect.min.x;
        const height = rect.max.y - rect.min.y;

        switch (spawnMode) {
            case MapObjectSpawnMode.Grass: {
                getPosition = () => randomVector(
                    this._beachPadding + width,
                    this.width - this._beachPadding - width,
                    this._beachPadding + height,
                    this.height - this._beachPadding - height
                );
                break;
            }
            case MapObjectSpawnMode.GrassAndSand: {
                getPosition = () => randomVector(
                    this.oceanSize + width,
                    this.width - this.oceanSize - width,
                    this.oceanSize + height,
                    this.height - this.oceanSize - height
                );
                break;
            }
            // TODO: evenly distribute objects based on river size
            case MapObjectSpawnMode.River: {
                getPosition = () => pickRandomInArray(this.terrain.rivers).waterHitbox.randomPoint();
                break;
            }
            case MapObjectSpawnMode.RiverBank: {
                getPosition = () => pickRandomInArray(this.terrain.rivers).bankHitbox.randomPoint();
                break;
            }
            case MapObjectSpawnMode.Beach: {
                getPosition = () => {
                    if (params?.getOrientation) {
                        orientation = Map.getRandomBuildingOrientation(RotationMode.Limited);
                        params.getOrientation(orientation);
                    }

                    const beachRect = this.beachHitbox.hitboxes[orientation].clone() as RectangleHitbox;
                    switch (orientation) {
                        case 1:
                        case 3: {
                            beachRect.min.x += width;
                            beachRect.max.x -= width;
                            break;
                        }
                        case 0:
                        case 2: {
                            beachRect.min.y += width;
                            beachRect.max.y -= height;
                            break;
                        }
                    }

                    return beachRect.randomPoint();
                };
                break;
            }
        }

        if (params?.getPosition) getPosition = params?.getPosition;

        let attempts = 0;
        let collided = true;

        while (collided && attempts < maxAttempts) {
            attempts++;
            collided = false;

            position = getPosition();

            if (params?.collides?.(position)) {
                collided = true;
                continue;
            }

            const hitbox = initialHitbox.transform(position, scale, orientation);

            const objects = this.game.grid.intersectsHitbox(hitbox);
            for (const object of objects) {
                let objectHitbox: Hitbox | undefined;
                if ("spawnHitbox" in object) {
                    objectHitbox = object.spawnHitbox as Hitbox;
                } else if (object.hitbox) {
                    objectHitbox = object.hitbox;
                }
                if (objectHitbox === undefined) continue;

                if (collidableObjects[object.type] && hitbox.collidesWith(objectHitbox)) {
                    collided = true;
                    break;
                }
            }

            if (collided) continue;

            switch (spawnMode) {
                case MapObjectSpawnMode.Grass:
                case MapObjectSpawnMode.GrassAndSand:
                case MapObjectSpawnMode.Beach: {
                    for (const river of this.terrain.getRiversInHitbox(hitbox)) {
                        if (spawnMode !== MapObjectSpawnMode.GrassAndSand &&
                            (river.bankHitbox.isPointInside(position) ||
                                hitbox.collidesWith(river.bankHitbox))) {
                            collided = true;
                            break;
                        }

                        if (spawnMode === MapObjectSpawnMode.GrassAndSand &&
                            (river.waterHitbox.isPointInside(position) ||
                                hitbox.collidesWith(river.waterHitbox))) {
                            collided = true;
                            break;
                        }
                    }
                    break;
                }
                case MapObjectSpawnMode.RiverBank: {
                    for (const river of this.terrain.getRiversInHitbox(hitbox)) {
                        if (river.waterHitbox.isPointInside(position) ||
                            hitbox.collidesWith(river.waterHitbox)) {
                            collided = true;
                            break;
                        }
                    }
                    break;
                }
            }
        }
        return attempts < maxAttempts ? position : undefined;
    }

    static getRandomRotation<T extends RotationMode>(mode: T): RotationMapping[T] {
        switch (mode) {
            case RotationMode.Full:
                // @ts-expect-error not sure why ts thinks the return type should be 0
                return randomRotation();
            case RotationMode.Limited:
                // @ts-expect-error see above
                return random(0, 3);
            case RotationMode.Binary:
                // @ts-expect-error see above
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
