import { type Hitbox, HitboxType } from "$common/utils/hitbox";
import { Vec, type Vector } from "$common/utils/vector";
import { type ColorSource, Graphics, Sprite } from "pixi.js";
import { PixiManager } from "../managers/pixiManager";
import { PIXI_SCALE } from "./constants";

export class SuroiSprite extends Sprite {
    constructor(frame?: string) {
        super(frame ? PixiManager.getTexture(frame) : undefined);
        this.anchor.set(0.5);
        this.setPos(0, 0);
    }

    setFrame(frame: string): this {
        this.texture = PixiManager.getTexture(frame);
        return this;
    }

    setAnchor(anchor: Vector): this {
        this.anchor.copyFrom(anchor);
        return this;
    }

    setPivot(pivot: Vector): this {
        this.pivot.copyFrom(pivot);
        return this;
    }

    setPos(x: number, y: number): this {
        this.position.set(x, y);
        return this;
    }

    setVPos(pos: Vector): this {
        this.position.set(pos.x, pos.y);
        return this;
    }

    setVisible(visible: boolean): this {
        this.visible = visible;
        return this;
    }

    setAngle(angle?: number): this {
        this.angle = angle ?? 0;
        return this;
    }

    setRotation(rotation?: number): this {
        this.rotation = rotation ?? 0;
        return this;
    }

    setScale(scaleX?: number, scaleY?: number): this {
        this.scale = Vec(scaleX ?? 1, scaleY ?? scaleX ?? 1);
        return this;
    }

    setTint(tint: ColorSource): this {
        this.tint = tint;
        return this;
    }

    setZIndex(zIndex: number): this {
        this.zIndex = zIndex;
        return this;
    }

    setAlpha(alpha: number): this {
        this.alpha = alpha;
        return this;
    }
}

export function toPixiCoords(pos: Vector): Vector {
    return Vec.scale(pos, PIXI_SCALE);
}

export function drawGroundGraphics(hitbox: Hitbox, graphics: Graphics, scale = PIXI_SCALE): void {
    switch (hitbox.type) {
        case HitboxType.Rect: {
            graphics.rect(
                hitbox.min.x * scale,
                hitbox.min.y * scale,
                (hitbox.max.x - hitbox.min.x) * scale,
                (hitbox.max.y - hitbox.min.y) * scale
            );
            break;
        }
        case HitboxType.Circle:
            graphics.arc(
                hitbox.position.x * scale,
                hitbox.position.y * scale,
                hitbox.radius * scale,
                0,
                Math.PI * 2
            );
            break;
        case HitboxType.Polygon:
            graphics.poly(
                hitbox.points.map(v => Vec.scale(v, scale))
            );
            break;
        case HitboxType.Group:
            for (const hitBox of hitbox.hitboxes) {
                drawGroundGraphics(hitBox, graphics, scale);
            }
            break;
    }
};

export function traceHitbox<T extends Graphics>(hitbox: Hitbox, graphics: T): T {
    switch (hitbox.type) {
        case HitboxType.Rect: {
            const min = toPixiCoords(hitbox.min);
            const max = toPixiCoords(hitbox.max);
            graphics
                .moveTo(min.x, min.y)
                .lineTo(max.x, min.y)
                .lineTo(max.x, max.y)
                .lineTo(min.x, max.y)
                .lineTo(min.x, min.y);
            break;
        }
        case HitboxType.Circle: {
            const pos = toPixiCoords(hitbox.position);
            graphics.arc(pos.x, pos.y, hitbox.radius * PIXI_SCALE, 0, Math.PI * 2);
            break;
        }
        case HitboxType.Polygon:
            graphics.poly(hitbox.points.map(point => toPixiCoords(point)));
            break;
    }
    return graphics;
}

export function drawHitbox<T extends Graphics>(hitbox: Hitbox, color: ColorSource, graphics: T, alpha = 1): T {
    if (alpha === 0) return graphics;

    graphics.setStrokeStyle({
        color,
        width: 2,
        alpha
    });
    graphics.beginPath();

    if (hitbox.type === HitboxType.Group) {
        for (const h of hitbox.hitboxes) {
            drawHitbox(h, color, graphics, alpha);
        }
    } else {
        traceHitbox(hitbox, graphics);
    }

    graphics.closePath();
    graphics.stroke();

    return graphics;
}
