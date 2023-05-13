import Vector2 = Phaser.Math.Vector2;
import { type Vector } from "matter";

export function v2v(v: Vector): Vector2 {
    return new Vector2(v.x, v.y);
}
