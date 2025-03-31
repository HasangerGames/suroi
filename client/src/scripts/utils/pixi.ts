import { type Mode } from "@common/definitions/modes";
import { Obstacles } from "@common/definitions/obstacles";
import { HitboxType, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { Vec, type Vector } from "@common/utils/vector";
import { Assets, Container, Graphics, ImageSource, RendererType, RenderTexture, Sprite, Spritesheet, Texture, type ColorSource, type Renderer, type SpritesheetData, type WebGLRenderer } from "pixi.js";
import { PIXI_SCALE, WALL_STROKE_WIDTH } from "./constants";
import { GameConsole } from "../console/gameConsole";
import { getTranslatedString } from "./translations/translations";
import { UIManager } from "../managers/uiManager";

let spritesheetsLoaded = false;

const spritesheetCallbacks: Array<() => void> = [];

export async function spritesheetLoad(): Promise<void> {
    if (spritesheetsLoaded) return;
    return new Promise(resolve => spritesheetCallbacks.push(resolve));
}

export async function loadTextures(modeName: Mode, renderer: Renderer, highResolution: boolean): Promise<void> {
    // If device doesn't support 4096x4096 textures, force low resolution textures since they are 2048x2048
    if (renderer.type as RendererType === RendererType.WEBGL) {
        const gl = (renderer as WebGLRenderer).gl;
        if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) {
            highResolution = false;
        }
    }

    const atlases: Record<string, SpritesheetData[]> = (
        highResolution
            ? await import("virtual:spritesheets-jsons-high-res")
            : await import("virtual:spritesheets-jsons-low-res")
    // we pray
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ).atlases as Record<string, SpritesheetData[]>;

    const spritesheets = atlases[modeName];

    let resolved = 0;
    const count = spritesheets.length;

    await Promise.all([
        ...spritesheets.map(async spritesheet => {
            // this is defined via vite-spritesheet-plugin, so it is never nullish
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const image = spritesheet.meta.image!;

            console.log(`Loading spritesheet ${location.origin}/${image}`);

            try {
                let sheetTexture: Texture;
                // Workaround to reduce memory usage in Chromium-based browsers
                // This actually increases usage in Firefox and has strange effects in WebKit,
                // so we use the usual loading method for everything else
                if (GameConsole.getBuiltInCVar("cv_alt_texture_loading")) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const { w: width, h: height } = spritesheet.meta.size!;
                    const canvas = new OffscreenCanvas(width, height);
                    const ctx = canvas.getContext("2d");
                    if (ctx === null) {
                        throw new Error("Unable to initialize canvas");
                    }

                    const img: HTMLImageElement = await new Promise(resolve => {
                        const img = new Image();
                        img.src = image;
                        img.onload = () => resolve(img);
                    });
                    ctx.drawImage(img, 0, 0, width, height);

                    const resource = canvas.transferToImageBitmap();
                    sheetTexture = new Texture({
                        source: new ImageSource({ resource, width, height })
                    });
                } else {
                    sheetTexture = await Assets.load<Texture>(image);
                }
                await renderer.prepare.upload(sheetTexture);
                const textures = await new Spritesheet(sheetTexture, spritesheet).parse();
                for (const [key, texture] of Object.entries(textures)) {
                    Assets.cache.set(key, texture);
                }

                const resolvedCount = ++resolved;
                const progress = `(${resolvedCount} / ${count})`;
                UIManager.ui.loaderText.text(getTranslatedString("loading_spritesheets", { progress }));
                console.log(`Atlas ${image} loaded ${progress}`);

                if (resolvedCount === count) {
                    spritesheetsLoaded = true;
                    for (const resolve of spritesheetCallbacks) resolve();
                }
            } catch (e) {
                ++resolved;
                console.error(`Atlas ${image} failed to load. Details:`, e);
            }
        }),

        //
        // Walls
        //
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
                            .fill({ color: borderColor })[rounded ? "roundRect" : "rect"](s, s, w - s * 2, h - s * 2, s)
                            .fill({ color })
                    });

                    Assets.cache.set(def.idString, wallTexture);
                }
                resolve();
            })),

        //
        // Gun mounts
        //
        ...Obstacles.definitions
            .filter(obj => obj.gunMount)
            .map(def => new Promise<void>(resolve => {
                if (def.gunMount === undefined) return;

                const spriteWidth = def.gunMount.type === "melee" ? 153.394 : 166.75;
                const spriteHeight = def.gunMount.type === "melee" ? 81.035 : 74.5;

                const mountTexture = RenderTexture.create({ width: spriteWidth, height: spriteHeight, antialias: true });

                const MOUNT_BORDER_COLOR = 0x302412;
                const MOUNT_FILL_COLOR = 0x785a2e;

                const mountBorderRadius = 5;

                const container = new Container();

                switch (def.gunMount.type) {
                    case "gun": {
                        const mainRect = new Graphics()
                            .roundRect(7.5, 4.2, 150, 11, (mountBorderRadius - 1))
                            .fill({ color: MOUNT_FILL_COLOR });

                        const mainBorderRect = new Graphics()
                            .roundRect(0, 0, 166, 20, mountBorderRadius)
                            .fill({ color: MOUNT_BORDER_COLOR });

                        container.addChild(mainBorderRect, mainRect);

                        for (let i = 0; i < 3; i++) {
                            const xPosConstant = [1, 63, 126][i];

                            const borderRect = new Graphics()
                                .roundRect(14 + xPosConstant, 16, 13, 60, (mountBorderRadius * 1.25))
                                .fill({ color: MOUNT_BORDER_COLOR });

                            container.addChild(borderRect);

                            for (let j = 0; j < 2; j++) {
                                const yPos = [24, 54][j];
                                const rect = new Graphics()
                                    .roundRect(16.5 + xPosConstant, yPos, 8, 16, (mountBorderRadius - 3))
                                    .fill({ color: MOUNT_FILL_COLOR });

                                container.addChild(rect);
                            }
                        }
                        break;
                    }

                    case "melee": {
                        const mainRect = new Graphics()
                            .roundRect(31, 9.2, 92, 11, (mountBorderRadius - 1))
                            .fill({ color: MOUNT_FILL_COLOR });

                        const mainBorderRect = new Graphics()
                            .roundRect(24.3, 5, 104, 20, mountBorderRadius)
                            .fill({ color: MOUNT_BORDER_COLOR });

                        for (let i = 0; i < 2; i++) {
                            const xPosConstant = [25.25, 87][i];

                            const borderRect = new Graphics()
                                .roundRect(14 + xPosConstant, 18, 13, 60, mountBorderRadius * 1.1)
                                .fill({ color: MOUNT_BORDER_COLOR });

                            container.addChild(borderRect);

                            for (let j = 0; j < 2; j++) {
                                const yPos = [28, 60][j];
                                const rect = new Graphics()
                                    .roundRect(16.5 + xPosConstant, yPos, 8, 14, (mountBorderRadius - 3))
                                    .fill({ color: MOUNT_FILL_COLOR });

                                container.addChild(rect);
                            }
                        }
                        container.addChild(mainBorderRect, mainRect);
                        break;
                    }
                }

                renderer.render({
                    target: mountTexture,
                    container: container
                });
                Assets.cache.set(def.idString, mountTexture);
                resolve();
            }))
    ]);
}

export class SuroiSprite extends Sprite {
    static getTexture(frame: string): Texture {
        if (!Assets.cache.has(frame)) {
            console.warn(`Texture not found: "${frame}"`);
            frame = "_missing_texture";
        }
        return Texture.from(frame);
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
