import { Sprite, Texture, type ColorSource, type Graphics } from "pixi.js";
import { CircleHitbox, ComplexHitbox, RectangleHitbox, type Hitbox, PolygonHitbox } from "../../../../common/src/utils/hitbox";
import { type Vector, vMul } from "../../../../common/src/utils/vector";
import { PIXI_SCALE } from "./constants";

const textures: Record<string, Texture> = {};

export async function loadTextures(): Promise<void> {
    const svgs = import.meta.glob("../../../public/assets/img/game/*/*.svg", {
        eager: true,
        as: "url"
    });

    for (const key in svgs) {
        const svg = svgs[key];

        const pathsArray = key.split("/");
        const name = pathsArray[pathsArray.length - 1].replace(".svg", "");

        const texture = textures[name] = Texture.from(svg, {
            resolution: 1,
            resourceOptions: {
                scale: 1
            }
        });

        texture.baseTexture.on("loaded", () => {
            console.log(`Texture ${name} loaded.`);
        });
        texture.baseTexture.on("error", (error: ErrorEvent) => {
            console.log(`Texture ${name} failed to load. Error: ${error.message}`);
        });
    }
}

export class SuroiSprite extends Sprite {
    constructor(frame?: string) {
        let texture: Texture | undefined;

        if (frame) {
            texture = textures[frame] ?? textures._missing_texture;
        }
        super(texture);

        this.anchor.set(0.5);
        this.setPos(0, 0);
    }

    setFrame(frame: string): SuroiSprite {
        this.texture = textures[frame] ?? textures._missing_texture;
        return this;
    }

    setAnchor(anchor: Vector): SuroiSprite {
        this.anchor.copyFrom(anchor);
        return this;
    }

    setPos(x: number, y: number): SuroiSprite {
        this.position.set(x, y);
        return this;
    }

    setVPos(pos: Vector): SuroiSprite {
        this.position.set(pos.x, pos.y);
        return this;
    }

    setVisible(visible: boolean): SuroiSprite {
        this.visible = visible;
        return this;
    }

    setAngle(angle?: number): SuroiSprite {
        this.angle = angle ?? 0;
        return this;
    }

    setRotation(rotation?: number): SuroiSprite {
        this.rotation = rotation ?? 0;
        return this;
    }

    setTint(tint: ColorSource): SuroiSprite {
        this.tint = tint;
        return this;
    }

    setZIndex(zIndex: number): SuroiSprite {
        this.zIndex = zIndex;
        return this;
    }

    setAlpha(alpha: number): SuroiSprite {
        this.alpha = alpha;
        return this;
    }
}

export function toPixiCoords(pos: Vector): Vector {
    return vMul(pos, PIXI_SCALE);
}

export function drawHitbox<T extends Graphics>(hitbox: Hitbox, color: ColorSource, graphics: T): T {
    graphics.lineStyle({
        color,
        width: 2
    });

    graphics.beginFill();
    graphics.fill.alpha = 0;

    if (hitbox instanceof RectangleHitbox) {
        const min = toPixiCoords(hitbox.min);
        const max = toPixiCoords(hitbox.max);
        graphics.moveTo(min.x, min.y)
            .lineTo(max.x, min.y)
            .lineTo(max.x, max.y)
            .lineTo(min.x, max.y)
            .lineTo(min.x, min.y);
    } else if (hitbox instanceof CircleHitbox) {
        const pos = toPixiCoords(hitbox.position);
        graphics.arc(pos.x, pos.y, hitbox.radius * PIXI_SCALE, 0, Math.PI * 2);
    } else if (hitbox instanceof ComplexHitbox) {
        for (const h of hitbox.hitboxes) drawHitbox(h, color, graphics);
    } else if (hitbox instanceof PolygonHitbox) {
        graphics.drawPolygon(hitbox.points.map(point => toPixiCoords(point)));
    }

    graphics.closePath().endFill();

    return graphics;
}
