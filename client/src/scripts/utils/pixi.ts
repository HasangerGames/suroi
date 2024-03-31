import { Sprite, Spritesheet, type Texture, type ColorSource, type Graphics, type SpritesheetData, Assets, type Renderer, RendererType, type WebGLRenderer } from "pixi.js";
import { HitboxType, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { MODE, PIXI_SCALE } from "./constants";

const textures: Record<string, Texture> = {};

export async function loadTextures(renderer: Renderer, highResolution: boolean): Promise<void> {
    // If device doesn't support 4096x4096 textures
    // force low resolution textures since they are 2048x2048
    if (renderer.type === RendererType.WEBGL) {
        const gl = (renderer as WebGLRenderer).gl;
        if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) {
            highResolution = false;
        }
    }

    let atlases: Record<string, SpritesheetData[]>;

    if (highResolution) {
        atlases = (await import("virtual:spritesheets-jsons-high-res")).atlases;
    } else {
        atlases = (await import("virtual:spritesheets-jsons-low-res")).atlases;
    }

    const promises: Array<Promise<void>> = [];
    const mainAtlas = atlases.main;

    for (const sheet of mainAtlas) {
        promises.push(loadSpritesheet(sheet, renderer));
    }

    await Promise.all(promises);

    // load mode reskins after main mode assets have loaded
    if (MODE.reskin) {
        for (const sheet of atlases[MODE.reskin]) {
            await loadSpritesheet(sheet, renderer);
        }
    }
}

async function loadSpritesheet(data: SpritesheetData, renderer: Renderer): Promise<void> {
    const image = data.meta.image!;

    console.log(`Loading spritesheet ${location.origin}/${image}`);

    return await new Promise<void>(resolve => {
        void Assets.load<Texture>(image).then(texture => {
            void renderer.prepare.upload(texture);
            void new Spritesheet(texture, data).parse().then(sheetTextures => {
                for (const frame in sheetTextures) {
                    textures[frame] = sheetTextures[frame];
                }
                console.log(`Atlas ${image} loaded.`);

                resolve();
            });
        });
    });
}

export class SuroiSprite extends Sprite {
    constructor(frame?: string) {
        super(frame ? SuroiSprite.getTexture(frame) : undefined);

        this.anchor.set(0.5);
        this.setPos(0, 0);
    }

    static getTexture(frame: string): Texture {
        if (!textures[frame]) {
            console.warn(`Texture not found: "${frame}"`);
            return textures._missing_texture;
        }
        return textures[frame];
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
