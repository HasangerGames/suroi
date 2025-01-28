import { CircleHitbox, HitboxType, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Vec, type Vector } from "@common/utils/vector";
import { Graphics, type ColorSource } from "pixi.js";
import { traceHitbox } from "./pixi";
import { PIXI_SCALE } from "./constants";

enum ShapeType {
    Line,
    Ray,
    Hitbox
}

interface BaseShape {
    readonly color: ColorSource
    readonly alpha: number
}

interface LineShape extends BaseShape {
    readonly type: ShapeType.Line
    readonly a: Vector
    readonly b: Vector
}

interface RayShape extends BaseShape {
    readonly type: ShapeType.Ray
    readonly length: number
    readonly position: Vector
    readonly angle: number
}

interface HitboxShape extends BaseShape {
    readonly type: ShapeType.Hitbox
    readonly hitbox: Hitbox
}

type Shape = LineShape | RayShape | HitboxShape;

export class DebugRenderer {
    private readonly _shapes: Shape[] = [];

    readonly graphics = new Graphics();

    addLine(a: Vector, b: Vector, color: ColorSource = "red", alpha = 1): this {
        if (!DEBUG_CLIENT) return this;

        this._shapes.push({
            type: ShapeType.Line,
            a,
            b,
            color,
            alpha
        });
        return this;
    }

    addRay(
        position: Vector,
        angle: number,
        length: number,
        color: ColorSource = "red",
        alpha = 1
    ): this {
        if (!DEBUG_CLIENT) return this;

        this._shapes.push({
            type: ShapeType.Ray,
            position,
            angle,
            length,
            color,
            alpha
        });
        return this;
    }

    addHitbox(hitbox: Hitbox, color: ColorSource = "red", alpha = 1): this {
        if (!DEBUG_CLIENT) return this;

        this._shapes.push({
            type: ShapeType.Hitbox,
            hitbox,
            color,
            alpha
        });
        return this;
    }

    addCircle(
        radius: number,
        position: Vector,
        color: ColorSource = "red",
        alpha = 1
    ): this {
        if (!DEBUG_CLIENT) return this;

        this._shapes.push({
            type: ShapeType.Hitbox,
            hitbox: new CircleHitbox(radius, position),
            color,
            alpha
        });
        return this;
    }

    addRectangle(
        position: Vector,
        width: number,
        height: number,
        color: ColorSource = "red",
        alpha = 1
    ): this {
        if (!DEBUG_CLIENT) return this;

        this._shapes.push({
            type: ShapeType.Hitbox,
            hitbox: RectangleHitbox.fromRect(width, height, position),
            color,
            alpha
        });
        return this;
    }

    render(): void {
        if (!DEBUG_CLIENT) return;

        const gfx = this.graphics.clear();

        for (const shape of this._shapes) {
            gfx.beginPath();
            switch (shape.type) {
                case ShapeType.Line:
                    gfx.moveTo(shape.a.x * PIXI_SCALE, shape.a.y * PIXI_SCALE)
                        .lineTo(shape.b.x * PIXI_SCALE, shape.b.y * PIXI_SCALE);
                    break;
                case ShapeType.Ray: {
                    gfx.moveTo(shape.position.x * PIXI_SCALE, shape.position.y * PIXI_SCALE);
                    const end = Vec.add(shape.position, Vec.fromPolar(shape.angle, shape.length));
                    gfx.lineTo(end.x * PIXI_SCALE, end.y * PIXI_SCALE);
                    break;
                }
                case ShapeType.Hitbox:
                    if (shape.hitbox.type === HitboxType.Group) {
                        for (const hitbox of shape.hitbox.hitboxes) {
                            gfx.beginPath();
                            traceHitbox(hitbox, gfx);
                            gfx.closePath();
                            gfx.stroke({
                                color: shape.color,
                                alpha: shape.alpha,
                                pixelLine: true
                            });
                        }
                    } else {
                        traceHitbox(shape.hitbox, gfx);
                    }
                    break;
            }
            gfx.closePath();
            gfx.stroke({
                color: shape.color,
                alpha: shape.alpha,
                pixelLine: true
            });
        }

        this._shapes.length = 0;
    }
}
