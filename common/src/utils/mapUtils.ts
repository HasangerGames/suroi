import { RectangleHitbox } from "./hitbox";
import { SeededRandom } from "./random";
import { Vector, v, vClone } from "./vector";

export function jaggedRectangle(hitbox: RectangleHitbox,
    spacing: number,
    variation: number,
    random: SeededRandom): Vector[] {

    const topLeft = vClone(hitbox.min);
    const topRight = v(hitbox.max.x, hitbox.min.y);
    const bottomRight = vClone(hitbox.max);
    const bottomLeft = v(hitbox.min.x, hitbox.max.y)

    const points: Vector[] = [];

    for (let x = topLeft.x + spacing; x < topRight.x; x += spacing) {
        points.push(v(x, topLeft.y + random.get(0, variation)));
    }
    for (let y = topRight.y + spacing; y < bottomRight.y; y += spacing) {
        points.push(v(topRight.x + random.get(0, variation), y));
    }
    for (let x = bottomRight.x - spacing; x > bottomLeft.x; x -= spacing) {
        points.push(v(x, bottomRight.y + random.get(0, variation)));
    }
    for (let y = bottomLeft.y - spacing; y > topLeft.y; y -= spacing) {
        points.push(v(bottomLeft.x + random.get(0, variation), y));
    }

    return points;
}
