import { Assets, Graphics, RendererType, RenderTexture, Sprite, Spritesheet, Texture, type ColorSource, type Renderer, type SpritesheetData, type WebGLRenderer } from "pixi.js";
import { HitboxType, RectangleHitbox, type Hitbox } from "../../../../common/src/utils/hitbox";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { MODE, PIXI_SCALE, WALL_STROKE_WIDTH } from "./constants";
import $ from "jquery";
import { getTranslatedString } from "../../translations";
import { Obstacles } from "../../../../common/src/definitions/obstacles";

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

    await Promise.all([
        ...spritesheets.map(
            spritesheet => {
                /**
                 * this is defined via vite-spritesheet-plugin, so it is never nullish
                 * @link `client/vite/vite-spritesheet-plugin/utils/spritesheet.ts:197`
                 */
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const image = spritesheet.meta.image!;

                return new Promise<void>(resolve => {
                    loader(spritesheet, image)
                        .then(() => {
                            const resolvedCount = ++resolved;
                            const progress = `(${resolvedCount} / ${count})`;

                            console.log(`Atlas ${image} loaded ${progress}`);
                            loadingText.text(getTranslatedString("loading_spritesheets", {
                                progress
                            }));
                        })
                        .catch(err => {
                            ++resolved;
                            console.error(`Atlas ${image} failed to load`);
                            console.error(err);
                        })
                        .finally(resolve);
                });
            }
        ),
        ...Obstacles.definitions
            .filter(obj => obj.wall)
            .map(def => new Promise<void>(resolve => {
                if (def.wall) {
                    const { color, borderColor, rounded } = def.wall;
                    const dimensions = (def.hitbox as RectangleHitbox).clone();
                    dimensions.scale(PIXI_SCALE);
                    const { x, y } = dimensions.min;
                    const [w, h] = [dimensions.max.x - x, dimensions.max.y - y];
                    const s = WALL_STROKE_WIDTH;

                    const wallTexture = RenderTexture.create({ width: w, height: h, antialias: true });
                    renderer.render({
                        target: wallTexture,
                        container: new Graphics()
                            .rect(0, 0, w, h)
                            .fill({ color: borderColor })
                            .fill({ color })[rounded ? "roundRect" : "rect"](s, s, w - s * 2, h - s * 2, s)
                    });

                    textures[def.idString] = wallTexture;
                    resolve();
                }
            })),
        new Promise<void>(resolve => {
            const vestTexture = RenderTexture.create({ width: 102, height: 102, antialias: true });
            renderer.render({
                target: vestTexture,
                container: new Graphics()
                    .arc(51, 51, 51, 0, Math.PI * 2)
                    .fill({ color: 0xffffff })
            });
            textures.vest_world = vestTexture;
            resolve();
        })
    ]);
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
                drawGroundGraphics(hitBox, graphics);
            }
            break;
    }
};

export function drawHitbox<T extends Graphics>(hitbox: Hitbox, color: ColorSource, graphics: T, alpha = 1): T {
    if (alpha === 0) return graphics;

    graphics.setStrokeStyle({
        color,
        width: 2,
        alpha
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
            for (const h of hitbox.hitboxes) drawHitbox(h, color, graphics, alpha);
            break;
        case HitboxType.Polygon:
            graphics.poly(hitbox.points.map(point => toPixiCoords(point)));
            break;
    }

    graphics.closePath();
    graphics.stroke();

    return graphics;
}
