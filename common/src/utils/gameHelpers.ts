import type { ObjectCategory } from "../constants";
import type { CommonGameObject, CommonObjectMapping } from "./gameObject";
import { Geometry } from "./math";
import { type Vector } from "./vector";

export interface RaycastResponse<T extends CommonGameObject> {
    object: T
    normal: Vector
    position: Vector
    distance: number
}

type Solid = CommonObjectMapping[ObjectCategory.Obstacle | ObjectCategory.Building];
export function raycastSolids<T extends CommonGameObject>(
    objects: Iterable<T>,
    start: Vector,
    end: Vector,
    filterFn: (object: T & Solid) => boolean
): RaycastResponse<T & Solid> | null {
    let res: RaycastResponse<Solid> | null = null;

    for (const object of objects) {
        if (!(object.isObstacle || object.isBuilding)) continue;
        if (!object.hitbox) continue;
        if (object.dead) continue;
        if (!filterFn(object as T & Solid)) continue;

        const rayRes = object.hitbox.intersectsLine(start, end);
        if (!rayRes) continue;

        const dist = Geometry.distanceSquared(start, rayRes.point);
        if (res === null || res.distance > dist) {
            res = {
                object: object,
                position: rayRes.point,
                normal: rayRes.normal,
                distance: dist
            };
        }
    }

    if (res) {
        res.distance = Math.sqrt(res.distance);
    }
    return res;
}
