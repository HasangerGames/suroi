import {
    type Body,
    Box,
    Circle,
    Vec2,
    type World
} from "planck";

import { type Obstacle } from "../objects/obstacle";

import {
    CircleHitbox,
    type Hitbox,
    RectangleHitbox
} from "../../../common/src/utils/hitbox";
import { type Orientation } from "../../../common/src/typings";
import { type Vector } from "../../../common/src/utils/vector";

export function v2v(v: Vector): Vec2 {
    return Vec2(v.x, v.y);
}

export function bodyFromHitbox(world: World,
    hitbox: Hitbox,
    orientation: Orientation = 0,
    scale = 1,
    noCollisions = false,
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
            userData: obstacle,
            isSensor: noCollisions
        });
    } else if (hitbox instanceof RectangleHitbox) {
        const width = (hitbox.max.x - hitbox.min.x) / 2;
        const height = (hitbox.max.y - hitbox.min.y) / 2;

        if (width === 0 || height === 0) return undefined;

        // obstacle.collision.halfWidth = width;
        // obstacle.collision.halfHeight = height;

        body = world.createBody({
            type: "static",
            position: Vec2(hitbox.min.x + width, hitbox.min.y + height),
            fixedRotation: true
        });

        body.createFixture({
            shape: Box(width, height),
            userData: obstacle,
            isSensor: noCollisions
        });
    }
    return body;
}
