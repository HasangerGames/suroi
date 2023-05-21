import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { ObjectType } from "../../common/src/utils/objectType";
import { v, type Vector } from "../../common/src/utils/vector";
import { type Variation } from "../../common/src/typings";
import {
    random, randomFloat, randomRotation, randomVector
} from "../../common/src/utils/random";
import { type ObstacleDefinition } from "../../common/src/definitions/obstacles";
import { CircleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { Obstacle } from "./objects/obstacle";
import { ObjectCategory } from "../../common/src/constants";
import { Debug } from "./.config/config";

export class Map {
    game: Game;

    readonly width = 720;
    readonly height = 720;

    constructor(game: Game) {
        const mapStartTime = Date.now();
        this.game = game;

        if (!Debug.disableMapGeneration) {
            this.generateObstacles("tree_oak", 200);
            this.generateObstacles("tree_pine", 15);
            this.generateObstacles("rock", 200);
            this.generateObstacles("bush", 150);
            this.generateObstacles("crate_regular", 125);
            this.generateObstacles("barrel", 75);
            this.generateObstacles("super_barrel", 25);
            this.generateObstacles("crate_health", 25);
        } else {
            // Obstacle debug code goes here
        }
        log(`Map generation took ${Date.now() - mapStartTime}ms`, true);

        // Calculate visible objects
        const visibleObjectsStartTime = Date.now();
        const supportedZoomLevels: number[] = [48];

        for (const zoomLevel of supportedZoomLevels) {
            this.game.visibleObjects[zoomLevel] = {};
            const xCullDist = zoomLevel * 1.75; const yCullDist = zoomLevel * 1.35;

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

    private generateObstacles(idString: string, count: number): void {
        const type: ObjectType = ObjectType.fromString(ObjectCategory.Obstacle, idString);
        for (let i = 0; i < count; i++) {
            const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
            const scale = randomFloat(definition.scale.spawnMin, definition.scale.spawnMax);
            const variation: Variation = (definition.variations !== undefined ? random(0, definition.variations - 1) : 0) as Variation;

            /**
             * @todo For objects with limited rotation, send orientation instead of rotation (2 bits vs. 8), saving 6 bits.
             * @todo Add extra limited rotation (2 possible states = 1 bit).
             */
            let rotation: number | undefined;
            switch (definition.rotation) {
                case "full":
                    rotation = randomRotation();
                    break;
                case "limited":
                    switch (random(1, 4)) {
                        case 1:
                            rotation = -Math.PI;
                            break;
                        case 2:
                            rotation = -Math.PI / 2;
                            break;
                        case 3:
                            rotation = Math.PI / 2;
                            break;
                        case 4:
                            rotation = Math.PI;
                            break;
                    }
                    break;
                case "none":
                default:
                    rotation = 0;
                    break;
            }

            if (rotation === undefined) {
                throw new Error("Unknown rotation type");
            }

            const obstacle: Obstacle = new Obstacle(
                this.game,
                type,
                this.getRandomPositionFor(type, scale),
                rotation,
                scale,
                variation
            );

            this.game.staticObjects.add(obstacle);
        }
    }

    getRandomPositionFor(type: ObjectType, scale = 1): Vector {
        let collided = true;
        let position: Vector = v(0, 0);
        let attempts = 0;
        let initialHitbox: Hitbox | undefined;

        // Set up the hitbox
        if (type.category === ObjectCategory.Obstacle) {
            const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
            initialHitbox = definition.spawnHitbox ?? definition.hitbox;
        } else if (type.category === ObjectCategory.Player) {
            initialHitbox = new CircleHitbox(2.5);
        }
        if (initialHitbox === undefined) {
            throw new Error(`Unsupported object category: ${type.category}`);
        }

        // Find a valid position
        while (collided && attempts <= 200) {
            attempts++;

            if (attempts >= 200) {
                console.warn(`[WARNING] Maximum spawn attempts exceeded for: ${type.idString}`);
            }

            collided = false;
            position = randomVector(10, this.width - 10, 10, this.height - 10);

            const hitbox: Hitbox = initialHitbox.transform(position, scale);
            for (const object of this.game.staticObjects) {
                if (object.spawnHitbox.collidesWith(hitbox)) collided = true;
            }
        }

        return position;
    }
}
