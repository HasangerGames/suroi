import { GameConstants, Layer, ObjectCategory } from "@common/constants";
import { Buildings, type BuildingDefinition } from "@common/definitions/buildings";
import { Obstacles, RotationMode, type ObstacleDefinition } from "@common/definitions/obstacles";
import { ObstacleModeVariations } from "@common/definitions/modes";
import { MapPacket, type MapPacketData } from "@common/packets/mapPacket";
import { PacketStream } from "@common/packets/packetStream";
import { type Orientation, type Variation } from "@common/typings";
import { CircleHitbox, GroupHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { equalLayer } from "@common/utils/layer";
import { Angle, Collision, Geometry, Numeric, τ } from "@common/utils/math";
import { type Mutable, type SMutable } from "@common/utils/misc";
import { MapObjectSpawnMode, NullString, type ReferenceTo, type ReifiableDef } from "@common/utils/objectDefinitions";
import { SeededRandom, pickRandomInArray, random, randomFloat, randomPointInsideCircle, randomRotation, randomVector } from "@common/utils/random";
import { River, Terrain } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { Config } from "./config";
import { getLootFromTable } from "./data/lootTables";
import { MapDefinition, MapName, Maps, ObstacleClump, RiverDefinition } from "./data/maps";
import { type Game } from "./game";
import { Building } from "./objects/building";
import { Obstacle } from "./objects/obstacle";
import { CARDINAL_DIRECTIONS, Logger, getRandomIDString } from "./utils/misc";

export class GameMap {
    readonly game: Game;

    private readonly mapDef: MapDefinition;
    private readonly quadBuildings: Record<1 | 2 | 3 | 4, string[]> = { 1: [], 2: [], 3: [], 4: [] };
    private readonly quadMajorBuildings: Array<1 | 2 | 3 | 4> = [];
    private readonly majorBuildingPositions: Vector[] = [];

    private readonly occupiedBridgePositions: Vector[] = [];

    private readonly clearings: RectangleHitbox[] = [];

    readonly width: number;
    readonly height: number;
    readonly oceanSize: number;
    readonly beachSize: number;

    readonly beachHitbox: GroupHitbox<RectangleHitbox[]>;

    readonly seed: number;

    readonly terrain: Terrain;

    private readonly _packet: Omit<MapPacketData, "objects"> & { readonly objects: Mutable<MapPacketData["objects"]> };

    /**
     * A cached map packet buffer
     * Since the map is static, there's no reason to serialize a map packet for each player that joins the game
     */
    readonly buffer: ArrayBuffer;

    private readonly _beachPadding;

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
            default:
                return GameMap.getRandomRotation(mode);
        }
    }

    constructor(game: Game, mapData: typeof Config["map"]) {
        this.game = game;

        const [name, ...params] = mapData.split(":") as [MapName, ...string[]];
        const mapDef: MapDefinition = Maps[name];

        // @ts-expect-error I don't know why this rule exists
        type PacketType = this["_packet"];

        const packet = {
            objects: []
        } as SMutable<PacketType>;
        this._packet = packet;

        this.seed = packet.seed = random(0, 2 ** 31);

        Logger.log(`Game ${game.id} | Map seed: ${this.seed}`);

        this.width = packet.width = mapDef.width;
        this.height = packet.height = mapDef.height;
        this.oceanSize = packet.oceanSize = mapDef.oceanSize;
        this.beachSize = packet.beachSize = mapDef.beachSize;

        this.mapDef = mapDef;

        // + 8 to account for the jagged points
        const beachPadding = this._beachPadding = mapDef.oceanSize + mapDef.beachSize + Numeric.min(mapDef.oceanSize + mapDef.beachSize, 8);
        const oceanSize = mapDef.oceanSize + Numeric.min(mapDef.oceanSize, 8);

        this.beachHitbox = new GroupHitbox(
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

        if (mapDef.rivers || mapDef.trails) {
            const seededRandom = new SeededRandom(this.seed);

            if (mapDef.trails) rivers.push(...this._generateRivers(mapDef.trails, seededRandom, true));
            if (mapDef.rivers) rivers.push(...this._generateRivers(mapDef.rivers, seededRandom));
        }

        packet.rivers = rivers;

        this.terrain = new Terrain(
            this.width,
            this.height,
            mapDef.oceanSize,
            mapDef.beachSize,
            this.seed,
            rivers
        );

        this._generateClearings(mapDef.clearings);

        Object.entries(mapDef.buildings ?? {}).forEach(([building, count]) => this._generateBuildings(building, count));

        for (const clump of mapDef.obstacleClumps ?? []) {
            this._generateObstacleClumps(clump);
        }

        Object.entries(mapDef.obstacles ?? {}).forEach(([obstacle, count]) => this._generateObstacles(obstacle, count));

        Object.entries(mapDef.loots ?? {}).forEach(([loot, count]) => this._generateLoots(loot, count));

        mapDef.onGenerate?.(this, params);

        if (mapDef.places) {
            packet.places = mapDef.places.map(({ name, position }) => {
                const absPosition = Vec.create(
                    this.width * (position.x + randomFloat(-0.04, 0.04)),
                    this.height * (position.y + randomFloat(-0.04, 0.04))
                );

                return { name, position: absPosition };
            });
        }

        const stream = new PacketStream(new ArrayBuffer(1 << 16));
        stream.serializeServerPacket(MapPacket.create(packet));
        this.buffer = stream.getBuffer();
    }

    private _generateRivers(definition: RiverDefinition, randomGenerator: SeededRandom, isTrail = false): River[] {
        const {
            minAmount,
            maxAmount,
            maxWideAmount,
            wideChance,
            minWidth,
            maxWidth,
            minWideWidth,
            maxWideWidth
        } = definition;
        const rivers: River[] = [];
        const amount = randomGenerator.getInt(minAmount, maxAmount);

        // generate a list of widths and sort by biggest, to make sure wide rivers generate first
        let wideAmount = 0;
        const widths = Array.from(
            { length: amount },
            () => {
                if (wideAmount < maxWideAmount && randomGenerator.get() < wideChance) {
                    wideAmount++;
                    return randomGenerator.getInt(minWideWidth, maxWideWidth);
                } else {
                    return randomGenerator.getInt(minWidth, maxWidth);
                }
            }
        ).sort((a, b) => b - a);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const center = Vec.create(halfWidth, halfHeight);

        const padding = isTrail ? GameConstants.trailPadding : GameConstants.riverPadding;
        const width = this.width - padding;
        const height = this.height - padding;
        const bounds = new RectangleHitbox(
            Vec.create(padding, padding),
            Vec.create(width, height)
        );

        let i = 0;
        let attempts = 0;
        while (i < amount && attempts < 100) {
            attempts++;
            let start: Vector;

            const horizontal = !!randomGenerator.getInt();
            const reverse = !!randomGenerator.getInt();

            if (horizontal) {
                const topHalf = randomGenerator.get(padding, halfHeight);
                const bottomHalf = randomGenerator.get(halfHeight, height);
                start = Vec.create(padding, reverse ? bottomHalf : topHalf);
            } else {
                const leftHalf = randomGenerator.get(padding, halfWidth);
                const rightHalf = randomGenerator.get(halfWidth, width);
                start = Vec.create(reverse ? rightHalf : leftHalf, padding);
            }

            const startAngle = Angle.betweenPoints(center, start) + (reverse ? 0 : Math.PI);

            const riverWidth = widths[i];

            if (this._generateRiver(
                start,
                startAngle,
                riverWidth,
                bounds,
                isTrail,
                rivers,
                randomGenerator
            )) i++;
        }

        return rivers;
    }

    private _generateRiver(
        startPos: Vector,
        startAngle: number,
        width: number,
        bounds: RectangleHitbox,
        isTrail: boolean,
        rivers: River[],
        randomGenerator: SeededRandom
    ): boolean {
        const riverPoints: Vector[] = [];

        riverPoints.push(startPos);

        let angle = startAngle;
        const points = isTrail ? 25 : 60;

        for (let i = 1; i < points; i++) {
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

            // end the river if it collides with another river
            let collided = false;
            for (const river of rivers) {
                if (river.isTrail !== isTrail) continue; // Trails should only end when colliding with other trails, same for rivers
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

            if (!bounds.isPointInside(pos)) {
                riverPoints[i] = Vec.create(
                    Numeric.clamp(pos.x, bounds.min.x, bounds.max.x),
                    Numeric.clamp(pos.y, bounds.min.y, bounds.max.y)
                );
                break;
            }

            riverPoints[i] = pos;
        }
        if (riverPoints.length < 20 || riverPoints.length > 59) return false;

        const mapBounds = new RectangleHitbox(
            Vec.create(this.oceanSize, this.oceanSize),
            Vec.create(this.width - this.oceanSize, this.height - this.oceanSize)
        );

        rivers.push(new River(width, riverPoints, rivers, mapBounds, isTrail));

        return true;
    }

    // TODO Move this to a utility class and use it in gas.ts as well
    getQuadrant(x: number, y: number, width: number, height: number): 1 | 2 | 3 | 4 {
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

    private _generateClearings(clearingDef: MapDefinition["clearings"]): void {
        if (!clearingDef) return;

        const {
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            count,
            obstacles
        } = clearingDef;

        for (let i = 0; i < count; i++) {
            const width = randomFloat(minWidth, maxWidth);
            const height = randomFloat(minHeight, maxHeight);
            let hitbox = RectangleHitbox.fromRect(width, height);

            let position;
            let attempts = 0;
            let validPositionFound = false;
            while (!validPositionFound && attempts < 100) {
                if ((position = this.getRandomPosition(hitbox)) !== undefined) {
                    validPositionFound = true;
                    this.clearings.push(hitbox = RectangleHitbox.fromRect(width, height, position));
                    break;
                }
                attempts++;
            }

            if (attempts >= 100 && !validPositionFound) {
                Logger.warn("Failed to find valid position for clearing");
                continue;
            }

            for (const obstacle of obstacles) {
                this._generateObstacles(
                    obstacle.idString,
                    random(obstacle.min, obstacle.max),
                    () => hitbox.randomPoint()
                );
            }
        }
    }

    private _generateBuildings(definition: ReifiableDef<BuildingDefinition>, count: number): void {
        const buildingDef = Buildings.reify(definition);

        if (!buildingDef.bridgeHitbox) {
            const { idString, rotationMode } = buildingDef;
            const { majorBuildings = [], quadBuildingLimit = {} } = this.mapDef;

            let attempts = 0;
            for (let i = 0; i < count; i++) {
                let position: Vector | undefined;
                let orientation: Orientation | undefined;
                let validPositionFound = false;

                while (!validPositionFound && attempts < 100) {
                    orientation = GameMap.getRandomBuildingOrientation(rotationMode);

                    position = this.getRandomPosition(buildingDef.spawnHitbox, {
                        orientation,
                        spawnMode: buildingDef.spawnMode,
                        orientationConsumer: (newOrientation: Orientation) => {
                            orientation = newOrientation;
                        },
                        maxAttempts: 400
                    });

                    if (position === undefined) {
                        Logger.warn(`Failed to find valid position for building ${idString}`);
                        continue;
                    }

                    const quad = this.getQuadrant(position.x, position.y, this.width, this.height);

                    if (majorBuildings.includes(idString)) {
                        if (
                            this.quadMajorBuildings.includes(quad)
                            // undefined position would cause continue above
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            || this.majorBuildingPositions.some(pos => Geometry.distanceSquared(pos, position!) < 150000)
                        ) {
                            attempts++;
                            continue;
                        } else {
                            this.quadMajorBuildings.push(quad);
                            this.majorBuildingPositions.push(position);
                        }
                    } else if (idString in quadBuildingLimit) {
                        if (this.quadBuildings[quad].filter(b => b === idString).length >= quadBuildingLimit[idString]) {
                            attempts++;
                            continue;
                        } else {
                            this.quadBuildings[quad].push(idString);
                        }
                    }

                    validPositionFound = true;
                }

                if (!validPositionFound && position === undefined) {
                    Logger.warn(`Failed to place building ${idString} after ${attempts} attempts`);
                }

                if (position !== undefined) this.generateBuilding(buildingDef, position, orientation);

                attempts = 0; // Reset attempts counter for the next building
            }
        } else {
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

                const spawnHitbox = buildingDef.spawnHitbox.transform(position, 1, bestOrientation);

                if (
                    this.occupiedBridgePositions.some(pos => Vec.equals(pos, position))
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    || (this.isInRiver(buildingDef.bridgeHitbox!.transform(position, 1, bestOrientation)))
                    || (spawnHitbox.collidesWith(this.beachHitbox))
                ) return;

                // checks if the bridge hitbox collides with another object and if so does not spawn it
                for (const object of this.game.grid.intersectsHitbox(spawnHitbox)) {
                    const objectHitbox = "spawnHitbox" in object && object.spawnHitbox;

                    if (!objectHitbox) continue;
                    if (spawnHitbox.collidesWith(objectHitbox)) return;
                }

                this.occupiedBridgePositions.push(position);
                this.generateBuilding(buildingDef, position, bestOrientation);
                spawnedCount++;
            };

            this.terrain.rivers
                .filter(({ isTrail }) => !isTrail)
                .map(generateBridge)
                .forEach(generator => {
                    generator(0.1, 0.4);
                    generator(0.6, 0.9);
                });
        }
    }

    generateBuilding(
        definition: ReifiableDef<BuildingDefinition>,
        position: Vector,
        orientation?: Orientation,
        layer?: number
    ): Building | undefined {
        definition = Buildings.reify(definition);
        orientation ??= GameMap.getRandomBuildingOrientation(definition.rotationMode);
        layer ??= 0;

        if (
            this.game.pluginManager.emit(
                "building_will_generate",
                {
                    definition,
                    position,
                    orientation,
                    layer
                }
            )
        ) return;

        const building = new Building(this.game, definition, Vec.clone(position), orientation, layer);

        for (const obstacleData of definition.obstacles) {
            let idString = getRandomIDString<
                ObstacleDefinition,
                ReferenceTo<ObstacleDefinition> | typeof NullString
            >(obstacleData.idString);
            if (idString === NullString) continue;
            const gameMode = GameConstants.modeName;
            if (obstacleData.modeVariant) {
                idString = `${idString}${ObstacleModeVariations[gameMode] ?? ""}`;
            }

            const obstacleDef = Obstacles.fromString(idString);
            let obstacleRotation = obstacleData.rotation ?? GameMap.getRandomRotation(obstacleDef.rotationMode);

            if (obstacleDef.rotationMode === RotationMode.Limited) {
                obstacleRotation = Numeric.addOrientations(orientation, obstacleRotation as Orientation);
            }

            let lootSpawnOffset: Vector | undefined;

            if (obstacleData.lootSpawnOffset) lootSpawnOffset = Vec.addAdjust(Vec.create(0, 0), obstacleData.lootSpawnOffset, orientation);

            const obstacle = this.generateObstacle(
                obstacleDef,
                Vec.addAdjust(position, obstacleData.position, orientation),
                {
                    rotation: obstacleRotation,
                    layer: layer + (obstacleData.layer ?? 0),
                    scale: obstacleData.scale ?? 1,
                    variation: obstacleData.variation,
                    lootSpawnOffset,
                    parentBuilding: building,
                    puzzlePiece: obstacleData.puzzlePiece,
                    locked: obstacleData.locked,
                    activated: obstacleData.activated
                }
            );

            if (
                obstacle && (
                    obstacleDef.isActivatable
                    || obstacleDef.isDoor
                )
            ) {
                building.interactableObstacles.add(obstacle);
            }
        }

        for (const lootData of definition.lootSpawners) {
            for (const item of getLootFromTable(lootData.table)) {
                this.game.addLoot(
                    item.idString,
                    Vec.addAdjust(position, lootData.position, orientation),
                    layer,
                    { count: item.count, jitterSpawn: false }
                );
            }
        }

        for (const subBuilding of definition.subBuildings) {
            const idString = getRandomIDString<
                BuildingDefinition,
                ReferenceTo<BuildingDefinition> | typeof NullString
            >(subBuilding.idString);

            if (idString === NullString) continue;

            const finalOrientation = Numeric.addOrientations(orientation, subBuilding.orientation ?? 0);
            this.generateBuilding(
                idString,
                Vec.addAdjust(position, subBuilding.position, finalOrientation),
                finalOrientation,
                layer + (subBuilding.layer ?? 0)
            );
        }

        for (const floor of definition.floors) {
            this.terrain.addFloor(floor.type, floor.hitbox.transform(position, 1, orientation), floor.layer ?? layer);
        }

        if (!definition.hideOnMap) this._packet.objects.push(building);
        this.game.grid.addObject(building);
        this.game.pluginManager.emit("building_did_generate", building);

        return building;
    }

    private _generateObstacles(definition: ReifiableDef<ObstacleDefinition>, count: number, getPosition?: () => Vector): void {
        // i don't know why "definition = Obstacles.reify(definition)" doesn't work anymore, but it doesn't
        const def = Obstacles.reify(definition);

        const { scale = { spawnMin: 1, spawnMax: 1 }, variations, rotationMode } = def;
        const { spawnMin, spawnMax } = scale;
        const effSpawnHitbox = def.spawnHitbox ?? def.hitbox;

        for (let i = 0; i < count; i++) {
            const scale = randomFloat(spawnMin, spawnMax);
            const variation = (variations !== undefined ? random(0, variations - 1) : 0) as Variation;
            const rotation = GameMap.getRandomRotation(rotationMode);

            let orientation: Orientation = 0;

            if (rotationMode === RotationMode.Limited) {
                orientation = rotation as Orientation;
            }

            const position = this.getRandomPosition(effSpawnHitbox, {
                getPosition,
                scale,
                orientation,
                spawnMode: def.spawnMode,
                ignoreClearings: this.mapDef.clearings?.allowedObstacles?.includes(def.idString)
            });

            if (!position) {
                Logger.warn(`Failed to find valid position for obstacle ${def.idString}`);
                continue;
            }

            this.generateObstacle(def, position, { layer: Layer.Ground, scale, variation });
        }
    }

    generateObstacle(
        definition: ReferenceTo<ObstacleDefinition> | ObstacleDefinition,
        position: Vector,
        {
            rotation,
            layer,
            scale,
            variation,
            lootSpawnOffset,
            parentBuilding,
            puzzlePiece,
            locked,
            activated
        }: {
            rotation?: number
            layer?: number
            scale?: number
            variation?: Variation
            lootSpawnOffset?: Vector
            parentBuilding?: Building
            puzzlePiece?: string | boolean
            locked?: boolean
            activated?: boolean
        } = {}
    ): Obstacle | undefined {
        const def = Obstacles.reify(definition);
        layer ??= 0;

        scale ??= randomFloat(def.scale?.spawnMin ?? 1, def.scale?.spawnMax ?? 1);
        if (variation === undefined && def.variations !== undefined) {
            variation = random(0, def.variations - 1) as Variation;
        }

        rotation ??= GameMap.getRandomRotation(def.rotationMode);

        if (
            this.game.pluginManager.emit(
                "obstacle_will_generate",
                {
                    type: def,
                    position,
                    rotation,
                    layer,
                    scale,
                    variation,
                    lootSpawnOffset,
                    parentBuilding,
                    puzzlePiece,
                    locked,
                    activated
                }
            )
        ) return;

        const obstacle = new Obstacle(
            this.game,
            def,
            Vec.clone(position),
            rotation,
            layer,
            scale,
            variation,
            lootSpawnOffset,
            parentBuilding,
            puzzlePiece,
            locked,
            activated
        );

        if (!def.hideOnMap && !def.invisible && obstacle.layer === Layer.Ground) this._packet.objects.push(obstacle);
        this.game.grid.addObject(obstacle);
        this.game.updateObjects = true;
        this.game.pluginManager.emit("obstacle_did_generate", obstacle);
        return obstacle;
    }

    private _generateObstacleClumps(clumpDef: ObstacleClump): void {
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

    private _generateLoots(table: string, count: number): void {
        for (let i = 0; i < count; i++) {
            const loot = getLootFromTable(table);

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
                    Layer.Ground,
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
            layer?: Layer
            orientation?: Orientation
            maxAttempts?: number
            // used for beach spawn mode
            // so it can retry on different orientations
            orientationConsumer?: (orientation: Orientation) => void
            ignoreClearings?: boolean
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

        const getPosition = params?.getPosition ?? (() => {
            switch (spawnMode) {
                case MapObjectSpawnMode.Grass: {
                    return () => randomVector(
                        this._beachPadding + width,
                        this.width - this._beachPadding - width,
                        this._beachPadding + height,
                        this.height - this._beachPadding - height
                    );
                }
                case MapObjectSpawnMode.GrassAndSand: {
                    return () => randomVector(
                        this.oceanSize + width,
                        this.width - this.oceanSize - width,
                        this.oceanSize + height,
                        this.height - this.oceanSize - height
                    );
                }
                // TODO: evenly distribute objects based on river size
                case MapObjectSpawnMode.River: {
                    // rivers that aren't trails must have a waterHitbox
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return () => pickRandomInArray(this.terrain.rivers.filter(({ isTrail }) => !isTrail))?.waterHitbox!.randomPoint();
                }
                case MapObjectSpawnMode.RiverBank: {
                    return () => pickRandomInArray(this.terrain.rivers.filter(({ isTrail }) => !isTrail)).bankHitbox.randomPoint();
                }
                case MapObjectSpawnMode.Beach: {
                    return () => {
                        params?.orientationConsumer?.(
                            orientation = GameMap.getRandomBuildingOrientation(RotationMode.Limited)
                        );

                        const beachRect = this.beachHitbox.hitboxes[orientation].clone();
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
                }
                case MapObjectSpawnMode.Trail: {
                    return () => pickRandomInArray(this.terrain.rivers.filter(({ isTrail }) => isTrail)).bankHitbox.randomPoint();
                }
            }
        })();

        const rect = initialHitbox.toRectangle();
        const width = rect.max.x - rect.min.x;
        const height = rect.max.y - rect.min.y;

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

                if (
                    collidableObjects[object.type]
                    && equalLayer(object.layer, params?.layer ?? Layer.Ground)
                    && hitbox.collidesWith(objectHitbox)) {
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
                            (spawnMode !== MapObjectSpawnMode.GrassAndSand || river.isTrail)
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
                                river.waterHitbox?.isPointInside(position)
                                || river.waterHitbox?.collidesWith(hitbox)
                            )
                        ) {
                            collided = true;
                            break;
                        }
                    }
                    if (!params?.ignoreClearings) {
                        for (const clearing of this.clearings) {
                            if (clearing.collidesWith(hitbox)) {
                                collided = true;
                                break;
                            }
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
                                if (!river.waterHitbox?.isPointInside(point)) {
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
                case MapObjectSpawnMode.RiverBank:
                case MapObjectSpawnMode.Trail: {
                    if (this.isInRiver(hitbox)) {
                        collided = true;
                        break;
                    }
                    break;
                }
            }
        }

        return attempts < maxAttempts ? position : undefined;
    }

    private isInRiver(hitbox: Hitbox): boolean {
        for (const river of this.terrain.getRiversInHitbox(hitbox)) {
            if (river.waterHitbox?.collidesWith(hitbox)) {
                return true;
            }
        }
        return false;
    }
}

interface RotationMapping {
    [RotationMode.Full]: number
    [RotationMode.Limited]: Orientation
    [RotationMode.Binary]: 0 | 1
    [RotationMode.None]: 0
}
