import { ObjectCategory } from "../../common/src/constants";
import { Buildings, type BuildingDefinition } from "../../common/src/definitions/buildings";
import { Decals } from "../../common/src/definitions/decals";
import { Obstacles, RotationMode, type ObstacleDefinition } from "../../common/src/definitions/obstacles";
import { MapPacket } from "../../common/src/packets/mapPacket";
import { PacketStream } from "../../common/src/packets/packetStream";
import { type Orientation, type Variation } from "../../common/src/typings";
import { CircleHitbox, HitboxGroup, RectangleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { Angle, Collision, Geometry, Numeric, τ } from "../../common/src/utils/math";
import { MapObjectSpawnMode, ObstacleSpecialRoles, type ReferenceTo, type ReifiableDef } from "../../common/src/utils/objectDefinitions";
import { SeededRandom, pickRandomInArray, random, randomFloat, randomPointInsideCircle, randomRotation, randomVector } from "../../common/src/utils/random";
import { River, Terrain } from "../../common/src/utils/terrain";
import { Vec, type Vector } from "../../common/src/utils/vector";
import { LootTables, type WeightedItem } from "./data/lootTables";
import { Maps, ObstacleClump } from "./data/maps";
import { type Game } from "./game";
import { Building } from "./objects/building";
import { Decal } from "./objects/decal";
import { Obstacle } from "./objects/obstacle";
import { Events } from "./pluginManager";
import { CARDINAL_DIRECTIONS, Logger, getLootTableLoot, getRandomIDString } from "./utils/misc";

export class GameMap {
    readonly game: Game;

    private readonly quadBuildingLimit: Record<ReferenceTo<BuildingDefinition>, number> = {};

    private readonly majorBuildings: readonly string[];
    private readonly occupiedQuadrants: number[] = [];
    private readonly quadBuildings: { [key in 1 | 2 | 3 | 4]: string[] };

    private readonly occupiedBridgePositions: Vector[] = [];

    readonly width: number;
    readonly height: number;
    readonly oceanSize: number;
    readonly beachSize: number;

    readonly beachHitbox: HitboxGroup;

    readonly seed: number;

    readonly terrain: Terrain;

    readonly packet: MapPacket;

    /**
    * A cached map packet buffer
    * Since the map is static, there's no reason to serialize a map packet for each player that joins the game
    */
    readonly buffer: ArrayBuffer;

    private readonly _beachPadding;

    constructor(game: Game, mapName: keyof typeof Maps) {
        this.game = game;

        const mapDef = Maps[mapName];
        const packet = this.packet = new MapPacket();

        this.seed = packet.seed = random(0, 2 ** 31);

        Logger.log(`Game ${game.id} | Map seed: ${this.seed}`);

        this.width = packet.width = mapDef.width;
        this.height = packet.height = mapDef.height;
        this.oceanSize = packet.oceanSize = mapDef.oceanSize;
        this.beachSize = packet.beachSize = mapDef.beachSize;

        this.quadBuildingLimit = mapDef.quadBuildingLimit ?? {};
        this.majorBuildings = mapDef.majorBuildings ?? [];

        this.quadBuildings = {
            1: [],
            2: [],
            3: [],
            4: []
        };

        // + 8 to account for the jagged points
        const beachPadding = this._beachPadding = mapDef.oceanSize + mapDef.beachSize + 8;
        const oceanSize = this.oceanSize + 8;

        this.beachHitbox = new HitboxGroup(
            new RectangleHitbox(
                Vec.create(this.width - beachPadding, oceanSize),
                Vec.create(this.width - oceanSize, this.height - oceanSize)
            ),
            new RectangleHitbox(
                Vec.create(oceanSize, oceanSize),
                Vec.create(this.width - beachPadding, beachPadding)
            ),
            new RectangleHitbox(
                Vec.create(oceanSize, oceanSize),
                Vec.create(beachPadding, this.height - beachPadding)
            ),
            new RectangleHitbox(
                Vec.create(oceanSize, this.height - beachPadding),
                Vec.create(this.width - beachPadding, this.height - oceanSize)
            )
        );

        const rivers: River[] = [];

        if (mapDef.rivers) {
            const riverDef = mapDef.rivers;
            const riverPadding = 64;
            const randomGenerator = new SeededRandom(this.seed);
            const amount = randomGenerator.getInt(riverDef.minAmount, riverDef.maxAmount);

            // generate a list of widths and sort by biggest, to make sure wide rivers generate first
            const widths = Array.from(
                { length: amount },
                () => randomGenerator.get() < riverDef.wideChance
                    ? randomGenerator.getInt(riverDef.minWideWidth, riverDef.maxWideWidth)
                    : randomGenerator.getInt(riverDef.minWidth, riverDef.maxWidth)
            ).sort((a, b) => b - a);

            // extracted form loop
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const riverRect = new RectangleHitbox(
                Vec.create(riverPadding, riverPadding),
                Vec.create(this.width - riverPadding, this.height - riverPadding)
            );
            const center = Vec.create(halfWidth, halfHeight);
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
                    start = Vec.create(riverPadding, reverse ? bottomHalf : topHalf);
                } else {
                    const leftHalf = randomGenerator.get(riverPadding, halfWidth);
                    const rightHalf = randomGenerator.get(halfWidth, width);
                    start = Vec.create(reverse ? rightHalf : leftHalf, riverPadding);
                }

                const startAngle = Angle.betweenPoints(center, start) + (reverse ? 0 : Math.PI);

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

        this.packet.rivers.length = 0;
        this.packet.rivers.push(...rivers);

        this.terrain = new Terrain(
            this.width,
            this.height,
            mapDef.oceanSize,
            mapDef.beachSize,
            this.seed,
            rivers
        );

        Object.entries(mapDef.buildings ?? {}).forEach(([building, count]) => this.generateBuildings(building, count));

        for (const clump of mapDef.obstacleClumps ?? []) {
            this.generateObstacleClumps(clump);
        };

        Object.entries(mapDef.obstacles ?? {}).forEach(([obstacle, count]) => this.generateObstacles(obstacle, count));

        Object.entries(mapDef.loots ?? {}).forEach(([loot, count]) => this.generateLoots(loot, count));

        if (mapDef.genCallback) mapDef.genCallback(this);

        if (mapDef.places) {
            for (const place of mapDef.places) {
                const position = Vec.create(
                    this.width * (place.position.x + randomFloat(-0.04, 0.04)),
                    this.height * (place.position.y + randomFloat(-0.04, 0.04))
                );

                packet.places.push({
                    name: place.name,
                    position
                });
            }
        }

        const stream = new PacketStream(new ArrayBuffer(1 << 16));
        stream.serializeServerPacket(packet);
        this.buffer = stream.getBuffer();
    }

    addBuildingToQuad(quad: 1 | 2 | 3 | 4, idString: string): void {
        this.quadBuildings[quad].push(idString);
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
            const center = Vec.create(this.width / 2, this.height / 2);

            const distFactor = Geometry.distance(lastPoint, center) / (this.width / 2);

            const maxDeviation = Numeric.lerp(0.8, 0.1, distFactor);
            const minDeviation = Numeric.lerp(0.3, 0.1, distFactor);

            angle = angle + randomGenerator.get(
                -randomGenerator.get(minDeviation, maxDeviation),
                randomGenerator.get(minDeviation, maxDeviation)
            );

            const pos = Vec.add(lastPoint, Vec.fromPolar(angle, randomGenerator.getInt(30, 80)));

            let collided = false;

            // end the river if it collides with another river
            for (const river of rivers) {
                const points = river.points;
                for (let j = 1; j < points.length; j++) {
                    const intersection = Collision.lineIntersectsLine(lastPoint, pos, points[j - 1], points[j]);
                    if (intersection) {
                        const dist = Geometry.distance(intersection, riverPoints[i - 1]);
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

        const mapBounds = new RectangleHitbox(
            Vec.create(this.oceanSize, this.oceanSize),
            Vec.create(this.width - this.oceanSize, this.height - this.oceanSize)
        );
        rivers.push(new River(width, riverPoints, rivers, mapBounds));
    }

    // TODO Move this to a utility class and use it in gas.ts as well
    getQuadrant(x: number, y: number, width: number, height: number): number {
        if (x < width / 2 && y < height / 2) {
            return 1;
        } else if (x >= width / 2 && y < height / 2) {
            return 2;
        } else if (x < width / 2 && y >= height / 2) {
            return 3;
        } else {
            return 4;
        }
    }

    generateBuildings(definition: ReifiableDef<BuildingDefinition>, count: number): void {
        definition = Buildings.reify(definition);

        if (!definition.bridgeSpawnOptions) {
            const { idString, rotationMode } = definition;
            let attempts = 0;

            for (let i = 0; i < count; i++) {
                let validPositionFound = false;

                while (!validPositionFound && attempts < 100) {
                    let orientation = GameMap.getRandomBuildingOrientation(rotationMode);

                    const position = this.getRandomPosition(definition.spawnHitbox, {
                        orientation,
                        spawnMode: definition.spawnMode,
                        getOrientation: (newOrientation: Orientation) => {
                            orientation = newOrientation;
                        },
                        maxAttempts: 400
                    });

                    if (!position) {
                        Logger.warn(`Failed to find valid position for building ${idString}`);
                        continue;
                    }

                    const quad = this.getQuadrant(position.x, position.y, this.width, this.height) as 1 | 2 | 3 | 4;

                    if (idString in this.quadBuildingLimit) {
                        const limit = this.quadBuildingLimit[idString];
                        const count = this.quadBuildings[quad].filter((b: string) => b === idString).length;

                        if (count >= limit) {
                            attempts++;
                            continue;  // Try to find a different position
                        }
                    }

                    this.generateBuilding(definition, position, orientation);
                    this.addBuildingToQuad(quad, idString);
                    validPositionFound = true;
                }

                if (!validPositionFound) {
                    Logger.warn(`Failed to place building ${idString} after ${attempts} attempts`);
                }

                attempts = 0; // Reset attempts counter for the next building
            }
        } else {
            const { bridgeSpawnOptions } = definition;
            if (!bridgeSpawnOptions) {
                Logger.warn("Attempting to spawn non-bridge building as a bridge");
                return;
            }

            const { minRiverWidth, maxRiverWidth, landCheckDist } = bridgeSpawnOptions;

            let spawnedCount = 0;

            const generateBridge = (river: River) => (start: number, end: number): void => {
                if (spawnedCount >= count) return;
                let shortestDistance = Number.MAX_VALUE;
                let bestPosition = 0.5;
                let bestOrientation: Orientation = 0;
                for (let pos = start; pos <= end; pos += 0.05) {
                    // Find the best orientation
                    const direction = Vec.direction(river.getTangent(pos));
                    for (let orientation: Orientation = 0; orientation < 4; orientation++) {
                        const distance = Math.abs(Angle.minimize(direction, CARDINAL_DIRECTIONS[orientation]));
                        if (distance < shortestDistance) {
                            shortestDistance = distance;
                            bestPosition = pos;
                            bestOrientation = orientation as Orientation;
                        }
                    }
                }
                const position = river.getPosition(bestPosition);

                if (
                    this.occupiedBridgePositions.some(pos => Vec.equals(pos, position))
                    // Make sure there's dry land on either side of the bridge
                    || [
                        Vec.addAdjust(position, Vec.create(0, landCheckDist), bestOrientation),
                        Vec.addAdjust(position, Vec.create(0, -landCheckDist), bestOrientation)
                    ].some(point => this.terrain.getFloor(point) === "water")
                ) return;
                // checks if the distance between this position and the new bridge's position is less than bridgeSpawnOptions.minRiverWidth HOPEFULLY fixing the spawn problems
                if (this.occupiedBridgePositions.some(pos => Math.sqrt((pos.x - position.x) ** 2 + (pos.y - position.y) ** 2) < bridgeSpawnOptions.minRiverWidth)) {
                    return;
                }

                this.occupiedBridgePositions.push(position);
                this.generateBuilding(definition, position, bestOrientation);
                spawnedCount++;
            };

            this.terrain.rivers.filter(
                ({ width }) => minRiverWidth <= width && width <= maxRiverWidth
            )
                .map(generateBridge)
                .forEach(generator => {
                    generator(0.2, 0.4);
                    generator(0.6, 0.8);
                });
        }
    }

    generateBuilding(
        definition: ReifiableDef<BuildingDefinition>,
        position: Vector,
        orientation?: Orientation
    ): Building {
        definition = Buildings.reify(definition);
        orientation ??= GameMap.getRandomBuildingOrientation(definition.rotationMode);

        const building = new Building(this.game, definition, Vec.clone(position), orientation);

        for (const obstacleData of definition.obstacles) {
            const obstacleDef = Obstacles.fromString(getRandomIDString(obstacleData.idString));
            let obstacleRotation = obstacleData.rotation ?? GameMap.getRandomRotation(obstacleDef.rotationMode);

            if (obstacleDef.rotationMode === RotationMode.Limited) {
                obstacleRotation = Numeric.addOrientations(orientation, obstacleRotation as Orientation);
            }

            let lootSpawnOffset: Vector | undefined;

            if (obstacleData.lootSpawnOffset) lootSpawnOffset = Vec.addAdjust(Vec.create(0, 0), obstacleData.lootSpawnOffset, orientation);

            const obstacle = this.generateObstacle(
                obstacleDef,
                Vec.addAdjust(position, obstacleData.position, orientation),
                obstacleRotation,
                obstacleData.scale ?? 1,
                obstacleData.variation,
                lootSpawnOffset,
                building,
                obstacleData.puzzlePiece
            );

            if (obstacleDef.role === ObstacleSpecialRoles.Activatable
                || obstacleDef.role === ObstacleSpecialRoles.Door) {
                building.interactableObstacles.add(obstacle);
            }
        }

        for (const lootData of definition.lootSpawners) {
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
                    Vec.addAdjust(position, lootData.position, orientation),
                    { count: item.count, jitterSpawn: false }
                );
            }
        }

        for (const subBuilding of definition.subBuildings) {
            const finalOrientation = Numeric.addOrientations(orientation, subBuilding.orientation ?? 0);
            this.generateBuilding(
                getRandomIDString(subBuilding.idString),
                Vec.addAdjust(position, subBuilding.position, finalOrientation),
                finalOrientation
            );
        }

        for (const floor of definition.floors) {
            this.terrain.addFloor(floor.type, floor.hitbox.transform(position, 1, orientation));
        }

        for (const decal of definition.decals) {
            this.game.grid.addObject(new Decal(this.game, Decals.reify(decal.idString), Vec.addAdjust(position, decal.position, orientation), Numeric.addOrientations(orientation, decal.orientation ?? 0)));
        }

        if (!definition.hideOnMap) this.packet.objects.push(building);
        this.game.grid.addObject(building);
        this.game.pluginManager.emit(Events.Building_Generated, building);
        return building;
    }

    generateObstacles(definition: ReifiableDef<ObstacleDefinition>, count: number): void {
        definition = Obstacles.reify(definition);

        for (let i = 0; i < count; i++) {
            const scale = randomFloat(definition.scale?.spawnMin ?? 1, definition.scale?.spawnMax ?? 1);
            const variation = (definition.variations !== undefined ? random(0, definition.variations - 1) : 0) as Variation;
            const rotation = GameMap.getRandomRotation(definition.rotationMode);

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
        parentBuilding?: Building,
        puzzlePiece?: string | boolean
    ): Obstacle {
        definition = Obstacles.reify(definition);

        scale ??= randomFloat(definition.scale?.spawnMin ?? 1, definition.scale?.spawnMax ?? 1);
        if (variation === undefined && definition.variations) {
            variation = random(0, definition.variations - 1) as Variation;
        }

        rotation ??= GameMap.getRandomRotation(definition.rotationMode);

        const obstacle = new Obstacle(
            this.game,
            definition,
            Vec.clone(position),
            rotation,
            scale,
            variation,
            lootSpawnOffset,
            parentBuilding,
            puzzlePiece
        );

        if (!definition.hideOnMap && !definition.invisible) this.packet.objects.push(obstacle);
        this.game.grid.addObject(obstacle);
        this.game.updateObjects = true;
        this.game.pluginManager.emit(Events.Obstacle_Generated, obstacle);
        return obstacle;
    }

    generateObstacleClumps(clumpDef: ObstacleClump): void {
        const clumpAmount = clumpDef.clumpAmount;
        const firstObstacle = Obstacles.reify(clumpDef.clump.obstacles[0]);

        const { clump: { obstacles, minAmount, maxAmount, radius, jitter } } = clumpDef;

        for (let i = 0; i < clumpAmount; i++) {
            const position = this.getRandomPosition(
                new CircleHitbox(radius + jitter),
                {
                    spawnMode: firstObstacle.spawnMode
                }
            );

            if (!position) {
                Logger.warn("Spawn position cannot be found");
                continue;
            }

            const amountOfObstacles = random(minAmount, maxAmount);
            const offset = randomRotation();
            const step = τ / amountOfObstacles;

            for (let j = 0; j < amountOfObstacles; j++) {
                this.generateObstacle(
                    pickRandomInArray(obstacles),
                    Vec.add(
                        randomPointInsideCircle(position, jitter),
                        Vec.fromPolar(j * step + offset, radius)
                    )
                );
            }
        }
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
                    { count: item.count, jitterSpawn: false }
                );
            }
        }
    }

    getRandomPosition(
        initialHitbox: Hitbox,
        params?: {
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
        }
    ): Vector | undefined {
        let position: Vector | undefined = Vec.create(0, 0);

        const scale = params?.scale ?? 1;
        let orientation = params?.orientation ?? 0;
        const maxAttempts = params?.maxAttempts ?? 200;

        const collidableObjects = params?.collidableObjects ?? {
            [ObjectCategory.Obstacle]: true,
            [ObjectCategory.Building]: true
        };

        const spawnMode = params?.spawnMode ?? MapObjectSpawnMode.Grass;

        let getPosition: () => Vector | undefined;

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
                        orientation = GameMap.getRandomBuildingOrientation(RotationMode.Limited);
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

        if (params?.getPosition) getPosition = params.getPosition;

        let attempts = 0;
        let collided = true;

        while (collided && attempts < maxAttempts) {
            attempts++;
            collided = false;

            position = getPosition();

            if (!position || params?.collides?.(position)) {
                collided = true;
                continue;
            }

            const hitbox = initialHitbox.transform(position, scale, orientation);

            const objects = this.game.grid.intersectsHitbox(hitbox);
            for (const object of objects) {
                let objectHitbox: Hitbox | undefined;
                if ("spawnHitbox" in object) {
                    objectHitbox = object.spawnHitbox;
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
                        if (
                            spawnMode !== MapObjectSpawnMode.GrassAndSand
                            && (
                                river.bankHitbox.isPointInside(position)
                                || hitbox.collidesWith(river.bankHitbox)
                            )
                        ) {
                            collided = true;
                            break;
                        }

                        if (
                            spawnMode === MapObjectSpawnMode.GrassAndSand
                            && (
                                river.waterHitbox.isPointInside(position)
                                || hitbox.collidesWith(river.waterHitbox)
                            )
                        ) {
                            collided = true;
                            break;
                        }
                    }
                    break;
                }
                case MapObjectSpawnMode.River: {
                    if (hitbox instanceof CircleHitbox) {
                        const radius = hitbox.radius;
                        for (
                            const point of [
                                Vec.subComponent(position, 0, radius),
                                Vec.subComponent(position, radius, 0),
                                Vec.addComponent(position, 0, radius),
                                Vec.addComponent(position, radius, 0)
                            ]
                        ) {
                            for (const river of this.terrain.getRiversInHitbox(hitbox)) {
                                if (!river.waterHitbox.isPointInside(point)) {
                                    collided = true;
                                    break;
                                }
                            }
                            if (collided) break;
                        }
                    }
                    // TODO add code for other hitbox types
                    break;
                }
                case MapObjectSpawnMode.RiverBank: {
                    for (const river of this.terrain.getRiversInHitbox(hitbox)) {
                        if (
                            river.waterHitbox.isPointInside(position)
                            || hitbox.collidesWith(river.waterHitbox)
                        ) {
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
                return GameMap.getRandomRotation(mode);
        }
    }
}

interface RotationMapping {
    [RotationMode.Full]: number
    [RotationMode.Limited]: Orientation
    [RotationMode.Binary]: 0 | 1
    [RotationMode.None]: 0
}
