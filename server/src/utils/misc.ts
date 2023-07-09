import {
    type Body,
    Box,
    Circle,
    Vec2,
    type World
} from "planck";

import { type Obstacle } from "../objects/obstacle";

import { CircleHitbox, type Hitbox, RectangleHitbox } from "../../../common/src/utils/hitbox";
import { type Orientation } from "../../../common/src/typings";
import { type Vector } from "../../../common/src/utils/vector";
import path from "path";
import fs from "fs";

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

// Apparently this function is not used but i didn't want to remove it lol

/**
 * Recursively read a directory.
 * @param dir The absolute path to the directory.
 * @returns An array representation of the directory's contents.
 */
export const readDirectory = (dir: string): string[] => {
    let results: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const res = readDirectory(filePath);
            results = results.concat(res);
        } else results.push(filePath);
    }

    return results;
};
