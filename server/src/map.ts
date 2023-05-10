import { type Game } from "./game";
import { log } from "../../common/src/utils/misc";
import { type GameObject } from "./types/gameObject";
import { type ObjectType } from "../../common/src/utils/objectType";
import { type Vector } from "../../common/src/utils/vector";
import { type Orientation } from "../../common/src/typings";

export class Map {
    game: Game;

    readonly width = 720;
    readonly height = 720;

    constructor(game: Game) {
        const mapStartTime = Date.now();
        this.game = game;

        //if (!Config.debug.disableMapGeneration) {

        //} else {
        // Obstacle debug code goes here
        //}
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

    getRandomPositionFor(type: ObjectType, scale: number, orientation?: Orientation): Vector {
        /*let foundPosition = false;
        let thisPos: Vector;
        let attempts = 0;
        while (!foundPosition && attempts <= 200) {
            attempts++;
            if (attempts >= 200) {
                console.warn("[WARNING] Maximum spawn attempts exceeded for: ", object);
            }

            thisPos = randomVector(0, this.width, 0, this.height);
            let shouldContinue = false;

            for (const thisBound of thisBounds) {
                if (thisBound.type === CollisionType.Rectangle) {
                    const newBound = rotateRect(thisPos, thisBound.originalMin, thisBound.originalMax, scale, orientation);
                    thisBound.min = newBound.min;
                    thisBound.max = newBound.max;
                }

                for (const that of this.game.staticObjects) {
                    if (that instanceof Building) {
                        // obstacles and players should still spawn on top of bunkers
                        if ((kind === ObjectKind.Obstacle || kind === ObjectKind.Player) && that.layer === 1) continue;
                        for (const thatBound of that.mapObstacleBounds) {
                            if (thisBound.type === CollisionType.Circle) {
                                if (rectCollision(thatBound.min, thatBound.max, thisPos, thisBound.rad)) {
                                    shouldContinue = true;
                                }
                            } else if (thisBound.type === CollisionType.Rectangle) {
                                if (rectRectCollision(thatBound.min, thatBound.max, thisBound.min, thisBound.max)) {
                                    shouldContinue = true;
                                }
                            }
                        }
                    } else if (that instanceof Obstacle) {

                    }

                    if (shouldContinue) break;
                }

                if (shouldContinue) break;
            }

            if (shouldContinue) continue;
            foundPosition = true;
        }
        return thisPos!;*/
        return {
            x: 0,
            y: 0
        };
    }
}
