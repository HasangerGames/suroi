import { Sprite, Spritesheet, type Texture, type ColorSource, type Graphics, type SpritesheetData, Assets } from "pixi.js";
import { atlases } from "virtual:spritesheets-jsons";
import { Reskins } from "../../../../common/src/definitions/modes";
import { HitboxType, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { MODE, PIXI_SCALE } from "./constants";

const textures: Record<string, Texture> = {};

export async function loadTextures(): Promise<void> {
    const promises: Array<Promise<void>> = [];

    for (const atlas of atlases as SpritesheetData[]) {
        const image = atlas.meta.image!;

        console.log(`Loading atlas ${location.origin}/${image}`);

        promises.push(
            new Promise<void>(resolve => {
                Assets.load<Texture>(image)
                    .then(texture => {
                        new Spritesheet(texture, atlas)
                            .parse()
                            .then(sheetTextures => {
                                for (const frame in sheetTextures) {
                                    textures[frame] = sheetTextures[frame];
                                }
                                console.log(`Atlas ${image} loaded.`);

                                resolve();
                            })
                            .catch(console.error);
                    })
                    .catch(console.error);
            })
        );
    }

    await Promise.all(promises);
}

export class SuroiSprite extends Sprite {
    constructor(frame?: string) {
        super(frame ? SuroiSprite.getTexture(frame) : undefined);

        this.anchor.set(0.5);
        this.setPos(0, 0);
    }

    static getTexture(frame: string): Texture {
        if (MODE.reskin && Reskins[MODE.reskin]?.textures.includes(frame)) frame += `_${MODE.reskin}`;
        return textures[frame] ?? textures._missing_texture;
    }

    setFrame(frame: string): this {
        this.texture = SuroiSprite.getTexture(frame);
        return this;
    }

    setAnchor(anchor: Vector): this {
        this.anchor.copyFrom(anchor);
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

    setScale(scale?: number): this {
        this.scale = Vec.create(scale ?? 1, scale ?? 1);
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

export function drawHitbox<T extends Graphics>(hitbox: Hitbox, color: ColorSource, graphics: T): T {
    graphics.setStrokeStyle({
        color,
        width: 2
    });
    graphics.beginPath();

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
        case HitboxType.Group:
            for (const h of hitbox.hitboxes) drawHitbox(h, color, graphics);
            break;
        case HitboxType.Polygon:
            graphics.poly(hitbox.points.map(point => toPixiCoords(point)));
            break;
    }

    graphics.closePath();
    graphics.stroke();

    return graphics;
}
