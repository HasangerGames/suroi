import type { ObjectCategory } from "../constants";
import type { MeleeDefinition } from "../definitions/items/melees";
import type { CommonGameObject, CommonObjectMapping } from "./gameObject";
import { CircleHitbox } from "./hitbox";
import { Geometry } from "./math";
import { Vec, type Vector } from "./vector";
import { adjacentOrEquivLayer } from "./layer";

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

export function getMeleeHitbox(player: CommonObjectMapping[ObjectCategory.Player], definition: MeleeDefinition): CircleHitbox {
    const position = Vec.add(
        player.position,
        Vec.scale(Vec.rotate(definition.offset, player.rotation), player.sizeMod)
    );
    return new CircleHitbox(definition.radius * player.sizeMod, position);
}

type MeleeObject = (
    CommonObjectMapping[ObjectCategory.Player] |
    CommonObjectMapping[ObjectCategory.Obstacle] |
    CommonObjectMapping[ObjectCategory.Building] |
    CommonObjectMapping[ObjectCategory.Projectile]
);

interface MeleeTarget<T extends MeleeObject> {
    object: T
    position: Vector
    direction: Vector
    distance: number
}

export function getMeleeTargets<T extends MeleeObject>(
    hitbox: CircleHitbox,
    definition: MeleeDefinition,
    player: CommonObjectMapping[ObjectCategory.Player],
    teamMode: boolean,
    objects: Iterable<CommonGameObject>,
    debugRenderer?: { addLine: (a: Vector, b: Vector, color: number, alpha?: number) => void }
): MeleeTarget<T>[] {
    const targets: MeleeTarget<T>[] = [];

    const raycastLength = Geometry.distance(player.position, hitbox.position) + hitbox.radius;

    for (const object of objects) {
        if (!(object.isPlayer || object.isObstacle || object.isBuilding || object.isProjectile)) continue;
        if (object.dead || !object.damageable) continue;
        if (object === player) continue;
        if (object.isObstacle && (object.definition.isStair || object.definition.noMeleeCollision)) continue;
        if (object.isProjectile && !object.definition.c4) continue;
        if (!adjacentOrEquivLayer(object, player.layer)) continue;
        if (!object.hitbox) continue;

        const intersection = hitbox.getIntersection(object.hitbox);
        if (!intersection) continue;

        const hitPosition = Vec.add(
            hitbox.position,
            Vec.scale(intersection.dir, hitbox.radius - intersection.pen)
        );

        const direction = Vec.normalize(Vec.sub(hitPosition, player.position));
        const raycastEnd = Vec.add(player.position, Vec.scale(direction, raycastLength));

        debugRenderer?.addLine(player.position, raycastEnd, 0x0000ff);

        let raycast: { position: Vector, distance: number, normal: Vector } | null = null;

        const obstacleRaycast = raycastSolids(
            objects,
            player.position,
            raycastEnd,
            object => {
                if (!adjacentOrEquivLayer(object, player.layer)) return false;
                // ignore obstacles the player cant collide with for the raycasting only
                // so eg bushes wont prevent hitting stuff inside them
                if (object.isObstacle && (
                    object.definition.noCollisions
                    || object.definition.isStair
                    || object.definition.noMeleeCollision
                )) return false;

                return true;
            }
        );

        raycast = obstacleRaycast;

        if (obstacleRaycast) {
            debugRenderer?.addLine(player.position, obstacleRaycast.position, 0xff0000);
            // for players and C4's we must check if the obstacle raycast distance is lower than the object raycast distance
            // to check if its behind a wall
            if (object.isPlayer || object.isProjectile) {
                const targetRaycast = object.hitbox.intersectsLine(player.position, raycastEnd);
                if (!targetRaycast) continue;

                debugRenderer?.addLine(player.position, targetRaycast.point, 0xffff00);

                const toTargetDist = Geometry.distance(targetRaycast.point, player.position);

                raycast = {
                    distance: toTargetDist,
                    normal: targetRaycast.normal,
                    position: targetRaycast.point
                };

                // arbitrary 0.05 to fix a rare case where you can't hit players that are perfectly
                // touching a wall because the distance between the player raycast and wall raycast is really similar
                if (toTargetDist - 0.05 > obstacleRaycast.distance) continue;

                // otherwise just check if the obstacle we are hitting is the raycasted obstacle
            } else if (obstacleRaycast.object !== object) {
                continue;
            }
        }
        const finalHitPosition = raycast?.position ?? hitPosition;

        targets.push({
            object: object as unknown as T,
            // prefer the raycast position and direction since its more accurate
            position: finalHitPosition,
            direction: raycast?.normal ?? Vec.invert(intersection.dir),
            distance: raycast?.distance ?? Geometry.distance(player.position, finalHitPosition)
        });
    }

    targets.sort((a, b) => {
        // give teammates a lower priority
        if (teamMode && a.object.isPlayer && a.object.teamID === player.teamID) return Infinity;
        if (teamMode && b.object.isPlayer && b.object.teamID === player.teamID) return -Infinity;

        // sort by closest to player
        return a.distance - b.distance;
    });

    return targets.splice(0, definition.maxTargets ?? 1);
}
