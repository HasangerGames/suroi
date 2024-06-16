import { Assets, RendererType, Sprite, Spritesheet, type ColorSource, type Graphics, type Renderer, type SpritesheetData, type Texture, type WebGLRenderer } from "pixi.js";
import { HitboxType, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { MODE, PIXI_SCALE } from "./constants";
import $ from "jquery";

const textures: Record<string, Texture> = {};

const loadingText = $("#loading-text");

export async function loadTextures(renderer: Renderer, highResolution: boolean): Promise<void> {
    // If device doesn't support 4096x4096 textures, force low resolution textures since they are 2048x2048
    if (renderer.type as RendererType === RendererType.WEBGL) {
        const gl = (renderer as WebGLRenderer).gl;
        if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) {
            highResolution = false;
        }
    }

    // we pray
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const atlases: Record<string, SpritesheetData[]> = highResolution
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ? (await import("virtual:spritesheets-jsons-high-res")).atlases
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        : (await import("virtual:spritesheets-jsons-low-res")).atlases;

    const mainAtlas = atlases.main;

    const spritesheets = [
        ...mainAtlas,
        ...((MODE.reskin !== undefined ? atlases[MODE.reskin] : undefined) ?? [])
    ];

    let resolved = 0;
    const count = spritesheets.length;
    const loader = loadSpritesheet(renderer);

    await Promise.all(
        spritesheets.map(
            spritesheet => {
                // FIXME I have no idea why this nna is sound, someone please explain here why it is
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const image = spritesheet.meta.image!;

                return new Promise<void>(resolve => {
                    loader(spritesheet, image)
                        .then(() => {
                            const resolvedCount = ++resolved;
                            const progress = `(${resolvedCount} / ${count})`;

                            console.log(`Atlas ${image} loaded ${progress}`);
                            loadingText.text(`Loading Spritesheets ${progress}`);
                        })
                        .catch(err => {
                            ++resolved;
                            console.error(`Atlas ${image} failed to load`);
                            console.error(err);
                        })
                        .finally(resolve);
                });
            }
        )
    );
}

const loadSpritesheet = (renderer: Renderer) => async(data: SpritesheetData, path: string): Promise<void> => {
    console.log(`Loading spritesheet ${location.origin}/${path}`);

    await new Promise<void>(resolve => {
        void Assets.load<Texture>(path).then(texture => {
            void renderer.prepare.upload(texture);
            void new Spritesheet(texture, data).parse().then(sheetTextures => {
                for (const frame in sheetTextures) {
                    textures[frame] = sheetTextures[frame];
                }

                resolve();
            });
        });
    });
};

export class SuroiSprite extends Sprite {
    static getTexture(frame: string): Texture {
        if (!(frame in textures)) {
            console.warn(`Texture not found: "${frame}"`);
            return textures._missing_texture;
        }
        return textures[frame];
    }

    constructor(frame?: string) {
        super(frame ? SuroiSprite.getTexture(frame) : undefined);

        this.anchor.set(0.5);
        this.setPos(0, 0);
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
