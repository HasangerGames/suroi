import { BaseTexture, Sprite, type SpriteSheetJson, Spritesheet, type Texture } from "pixi.js";
import { type Vector, vMul } from "../../../../common/src/utils/vector";
import { PIXI_SCALE } from "./constants";
import { CircleHitbox, ComplexHitbox, type Hitbox, RectangleHitbox } from "../../../../common/src/utils/hitbox";

declare const ATLAS_HASH: string;

const textures: Record<string, Texture> = {};

export async function loadAtlases(): Promise<void> {
    for (const atlas of ["main", "buildings"]) {
        const path = `img/atlases/${atlas}.${ATLAS_HASH}`;

        const spritesheetData = await (await fetch(`./${path}.json`)).json() as SpriteSheetJson;

        console.log(`Loading atlas: ${location.toString()}${path}.png`);

        const spriteSheet = new Spritesheet(BaseTexture.from(`./${path}.png`), spritesheetData);

        await spriteSheet.parse();

        for (const frame in spriteSheet.textures) {
            if (textures[frame]) console.warn(`Duplicated atlas frame key: ${frame}`);

            textures[frame] = spriteSheet.textures[frame];
        }
    }
}

export class SuroiSprite extends Sprite {
    constructor(frame?: string) {
        let texture: Texture | undefined;

        if (frame) {
            if (!textures[frame]) frame = "_missing_texture.svg";
            texture = textures[frame];
        }
        super(texture);

        this.anchor.set(0.5);
        this.setPos(0, 0);
    }

    setFrame(frame: string): SuroiSprite {
        if (!textures[frame]) frame = "_missing_texture.svg";
        this.texture = textures[frame];
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

    setDepth(depth: number): SuroiSprite {
        this.zIndex = depth;
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

export function drawnHitbox(hitbox: Hitbox, graphics?: Graphics): Graphics {
    if (!graphics) {
        graphics = new Graphics();
        graphics.lineStyle({
            color: 0xff0000,
            alpha: 0.5,
            width: 2
        });
        graphics.fill.alpha = 0;
    }
    if (hitbox instanceof RectangleHitbox) {
        const min = toPixiCoords(hitbox.min);
        const max = toPixiCoords(hitbox.max);
        graphics.moveTo(min.x, min.y)
            .lineTo(max.x, min.y)
            .lineTo(max.x, max.y)
            .lineTo(min.x, max.y);
    } else if (hitbox instanceof CircleHitbox) {
        const pos = toPixiCoords(hitbox.position);
        graphics.arc(pos.x, pos.y, hitbox.radius * PIXI_SCALE, 0, Math.PI * 2);
    } else if (hitbox instanceof ComplexHitbox) {
        for (const h of hitbox.hitBoxes) drawnHitbox(h, graphics);
    }
    graphics.closePath().endFill();

    return graphics;
}
