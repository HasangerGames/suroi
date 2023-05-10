import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { ObjectType } from "../../common/src/utils/objectType";
import { v, type Vector } from "../../common/src/utils/vector";
import { type Orientation } from "../../common/src/typings";
import {
    randomFloat, randomVector, randomRotation
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
            this.generateObstacles(ObjectType.fromString(ObjectCategory.Obstacle, "tree_oak"), 500);
        } else {
            // Obstacle debug code goes here
        }
        log(`Map generation took ${Date.now() - mapStartTime}ms`);

        // Calculate visible objects
        const visibleObjectsStartTime = Date.now();
        const supportedZoomLevels: number[] = [28];
        for (const zoomLevel of supportedZoomLevels) {
            this.game.visibleObjects[zoomLevel] = {};
            const xCullDist = zoomLevel * 1.55; const yCullDist = zoomLevel * 1.25;
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

    private generateObstacles(type: ObjectType, count: number): void {
        for (let i = 0; i < count; i++) {
            const definition: ObstacleDefinition = type.definition as ObstacleDefinition;
            const scale = randomFloat(definition.scale.min, definition.scale.max);
            const obstacle: Obstacle = new Obstacle(
                this.game,
                type,
                this.getRandomPositionFor(type, scale),
                randomRotation(),
                scale
            );
            this.game.staticObjects.add(obstacle);
        }
    }

    private getRandomPositionFor(type: ObjectType, scale: number, orientation?: Orientation): Vector {
        let collided = true;
        let position: Vector = v(0, 0);
        let attempts = 0;
        const hitbox: Hitbox = (type.definition as ObstacleDefinition).hitbox;
        while (collided && attempts <= 200) {
            collided = false;
            attempts++;
            if (attempts >= 200) {
                console.warn(`[WARNING] Maximum spawn attempts exceeded for: ${type.idString}`);
            }
            position = randomVector(0, this.width, 0, this.height);
            for (const object of this.game.staticObjects) {
                if ((object.hitbox?.collidesWith(hitbox)) === true) collided = true;
            }
        }
        return position;
    }
}
