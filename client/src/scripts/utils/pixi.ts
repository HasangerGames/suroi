import { BaseTexture, Sprite, type SpriteSheetJson, Spritesheet, type Texture } from "pixi.js";

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
