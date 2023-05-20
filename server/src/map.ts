import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { ObjectType } from "../../common/src/utils/objectType";
import { v, type Vector } from "../../common/src/utils/vector";
import { type Orientation, type Variation } from "../../common/src/typings";
import {
    randomFloat, randomVector, randomRotation, random
} from "../../common/src/utils/random";
import { type ObstacleDefinition } from "../../common/src/definitions/obstacles";
import { type Hitbox } from "../../common/src/utils/hitbox";
import { Obstacle } from "./objects/obstacle";
import { Config } from "./configuration";
import { ObjectCategory } from "../../common/src/constants";

export class Map {
    game: Game;

    readonly width = 720;
    readonly height = 720;

    constructor(game: Game) {
        const mapStartTime = Date.now();
        this.game = game;

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!Config.debug.disableMapGeneration) {
            this.generateObstacles("tree_oak", 200);
            this.generateObstacles("tree_pine", 15);
            this.generateObstacles("rock", 200);
            this.generateObstacles("bush", 150);
            this.generateObstacles("crate_regular", 125);
            this.generateObstacles("barrel", 75);
            this.generateObstacles("super_barrel", 25);
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
            let rotation: number | undefined;
            // TODO For objects with limited rotation, send orientation instead of rotation (2 bits vs. 8; saving of 6 bits)
            // TODO Also, add extra limited rotation (2 possible states = only 1 bit)
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

    private getRandomPositionFor(type: ObjectType, scale: number, orientation?: Orientation): Vector {
        let collided = true;
        let position: Vector = v(0, 0);
        let attempts = 0;
        const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
        const initialHitbox: Hitbox = definition.spawnHitbox ?? definition.hitbox;
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
