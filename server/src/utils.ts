import {
    v, vAdd, type Vector, vMul
} from "../../common/src/utils/vector";
import {
    type Body, Box, Circle, Vec2, type World
} from "planck";
import {
    CircleHitbox, type Hitbox, RectangleHitbox
} from "../../common/src/utils/hitbox";
import { type Orientation } from "../../common/src/typings";
import { type Obstacle } from "./objects/obstacle";

export function v2v(v: Vector): Vec2 {
    return Vec2(v.x, v.y);
}

export function bodyFromHitbox(world: World,
    hitbox: Hitbox,
    orientation: Orientation = 0,
    scale = 1,
    obstacle: Obstacle
): Body | undefined {
    let body: Body | undefined;
    if (hitbox instanceof CircleHitbox) {
        body = world.createBody({
            type: "static",
            position: v2v(hitbox.position),
            fixedRotation: true
        });
        body.createFixture({
            shape: Circle(hitbox.radius * scale),
            userData: obstacle
        });
    } else if (hitbox instanceof RectangleHitbox) {
        const width = (hitbox.max.x - hitbox.min.x) / 2;
        const height = (hitbox.max.y - hitbox.min.y) / 2;
        if (width === 0 || height === 0) return undefined;
        //obstacle.collision.halfWidth = width;
        //obstacle.collision.halfHeight = height;
        body = world.createBody({
            type: "static",
            position: Vec2(hitbox.min.x + width, hitbox.min.y + height),
            fixedRotation: true
        });
        body.createFixture({
            shape: Box(width, height),
            userData: obstacle
        });
    }
    return body;
}

export function addAdjust(position1: Vector, position2: Vector, orientation: Orientation): Vector {
    if (orientation === 0) return vAdd(position1, position2);
    let xOffset: number, yOffset: number;
    switch (orientation) {
        case 1:
            xOffset = -position2.y;
            // noinspection JSSuspiciousNameCombination
            yOffset = position2.x;
            break;
        case 2:
            xOffset = -position2.x;
            yOffset = -position2.y;
            break;
        case 3:
            // noinspection JSSuspiciousNameCombination
            xOffset = position2.y;
            yOffset = -position2.x;
            break;
    }
    return vAdd(position1, v(xOffset, yOffset));
}

export function transformRectangle(pos: Vector, min: Vector, max: Vector, scale: number, orientation: Orientation): { min: Vector, max: Vector } {
    min = vMul(min, scale);
    max = vMul(max, scale);
    if (orientation !== 0) {
        const minX = min.x; const minY = min.y;
        const maxX = max.x; const maxY = max.y;
        switch (orientation) {
            case 1:
                min = Vec2(minX, maxY);
                max = Vec2(maxX, minY);
                break;
            case 2:
                min = Vec2(maxX, maxY);
                max = Vec2(minX, minY);
                break;
            case 3:
                min = Vec2(maxX, minY);
                max = Vec2(minX, maxY);
                break;
        }
    }
    return {
        min: addAdjust(pos, min, orientation),
        max: addAdjust(pos, max, orientation)
    };
}
