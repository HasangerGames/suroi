import { BaseTexture, Sprite, type SpriteSheetJson, Spritesheet, Texture, type Graphics, type ColorSource } from "pixi.js";
import { type Vector, vMul } from "../../../../common/src/utils/vector";
import { PIXI_SCALE } from "./constants";
import { CircleHitbox, ComplexHitbox, type Hitbox, RectangleHitbox } from "../../../../common/src/utils/hitbox";
import { Buildings } from "../../../../common/src/definitions/buildings";

declare const ATLAS_HASH: string;

const textures: Record<string, Texture> = {};

async function loadImage(key: string, path: string): Promise<void> {
    console.log(`Loading image ${path}`);
    textures[key] = await Texture.fromURL(path);
}

export async function loadAtlases(): Promise<void> {
    for (const atlas of ["main"]) {
        const path = `img/atlases/${atlas}.${ATLAS_HASH}`;

        const spritesheetData = await (await fetch(`./${path}.json`)).json() as SpriteSheetJson;

        console.log(`Loading atlas: ${location.toString()}${path}.png`);

        const spriteSheet = new Spritesheet(BaseTexture.from(`./${path}.png`), spritesheetData);

        await spriteSheet.parse();

        for (const frame in spriteSheet.textures) {
            const frameName = frame.replace(/(.svg|.png)/, "");
            if (textures[frameName]) console.warn(`Duplicated atlas frame key: ${frame}`);
            textures[frameName] = spriteSheet.textures[frame];
        }
    }
    for (const building of Buildings.definitions) {
        for (const image of building.floorImages) {
            await loadImage(image.key, require(`/public/img/buildings/${image.key}.svg`));
        }
        for (const image of building.ceilingImages) {
            await loadImage(image.key, require(`/public/img/buildings/${image.key}.svg`));
            if (image.residue) await loadImage(image.residue, require(`/public/img/buildings/${image.residue}.svg`));
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

export function drawHitbox(hitbox: Hitbox, color: ColorSource, graphics: Graphics): Graphics {
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
    }
    graphics.closePath().endFill();

    return graphics;
}
