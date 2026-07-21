import { GameMode } from "$common/schemas/misc";
import { Application, Assets, ColorMatrixFilter, Container, loadTextures, type Renderer, RendererType, Spritesheet, Texture, WebGLRenderer } from "pixi.js";
import { Game } from "../game";
import { GameConsole } from "../console/gameConsole";
import { UIManager } from "./uiManager";
import { MapManager } from "./mapManager";
import { EmoteWheelManager, MapPingWheelManager } from "./emoteWheelManager";
import { CameraManager } from "./cameraManager";
import { DebugRenderer } from "../utils/debugRenderer";
import { InputManager } from "./inputManager";
import { translate } from "../utils/translations/translations";
import { menuUi } from "../ui/menu.svelte";
import type { ImageSpritesheetImporter } from "../../../../vite/plugins/image-spritesheet-plugin";
import { GameModes } from "$common/definitions/gameModes";
import { m } from "$lib/paraglide/messages";

class PixiManagerClass {
    readonly pixi = new Application();

    private _initialized = false;
    async init(): Promise<void> {
        if (this._initialized) {
            throw new Error("Minimap has already been instantiated");
        }
        this._initialized = true;
        const renderMode = GameConsole.getBuiltInCVar("cv_renderer");
        const renderRes = GameConsole.getBuiltInCVar("cv_renderer_res");

        const pixi = this.pixi;
        await pixi.init({
            resizeTo: window,
            antialias: InputManager.isMobile
                ? GameConsole.getBuiltInCVar("mb_antialias")
                : GameConsole.getBuiltInCVar("cv_antialias"),
            autoDensity: true,
            preferWebGLVersion: renderMode === "webgl1" ? 1 : 2,
            preference: renderMode === "webgpu" ? "webgpu" : "webgl",
            resolution: renderRes === "auto" ? (window.devicePixelRatio || 1) : parseFloat(renderRes),
            hello: true,
            autoStart: false,
            canvas: document.getElementById("game-canvas") as HTMLCanvasElement,
            // we only use pixi click events (to spectate players on click)
            // so other events can be disabled for performance
            eventFeatures: {
                move: false,
                globalMove: false,
                wheel: false,
                click: true
            }
        });

        // Setting preferCreateImageBitmap to false reduces RAM usage in most browsers
        if (!GameConsole.getBuiltInCVar("cv_alt_texture_loading") && loadTextures.config) {
            loadTextures.config.preferCreateImageBitmap = false;
        }

        EmoteWheelManager.init();
        MapPingWheelManager.init();
        MapPingWheelManager.setupSlots();

        // HACK: the game ui covers the canvas
        // so send pointer events manually to make clicking to spectate players work
        UIManager.ui.gameUi[0].addEventListener("pointerdown", e => {
            pixi.canvas.dispatchEvent(new PointerEvent("pointerdown", {
                pointerId: e.pointerId,
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                screenY: e.screenY,
                screenX: e.screenX
            }));
        });

        pixi.ticker.add(Game.render.bind(Game));

        const gameContainer = new Container({ isRenderGroup: true });
        gameContainer.addChild(CameraManager.container);
        if (DEBUG_CLIENT) gameContainer.addChild(DebugRenderer.graphics);

        const uiContainer = new Container({ isRenderGroup: true });
        uiContainer.addChild(
            MapManager.container,
            MapManager.mask,
            ...Object.values(Game.netGraph).map(g => g.container),
            EmoteWheelManager.container,
            MapPingWheelManager.container
        );

        pixi.stage.addChild(gameContainer, uiContainer);

        MapManager.visible = !GameConsole.getBuiltInCVar("cv_minimap_minimized");
        MapManager.expanded = GameConsole.getBuiltInCVar("cv_map_expanded");
        UIManager.ui.gameUi.toggle(GameConsole.getBuiltInCVar("cv_draw_hud"));

        const resize = () => {
            MapManager.resize();
            CameraManager.resize(true);
        };
        this.pixi.renderer.on("resize", resize);
        resize();
    }

    private _textures: Record<string, Texture> = {};
    getTexture(frame: string): Texture {
        if (!this._textures[frame]) {
            console.warn(`Texture not found: "${frame}"`);
            frame = "_missing_texture";
        }
        return this._textures[frame];
    }

    async loadTextures(gameMode: GameMode): Promise<void> {
        let shouldLoadHighRes = InputManager.isMobile
                ? GameConsole.getBuiltInCVar("mb_high_res_textures")
                : GameConsole.getBuiltInCVar("cv_high_res_textures");

        // If device doesn't support 4096x4096 textures, force low resolution textures since they are 2048x2048
        if (this.pixi.renderer.type as RendererType === RendererType.WEBGL) {
            const gl = (this.pixi.renderer as WebGLRenderer).gl;
            if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) {
                shouldLoadHighRes = false;
            }
        }

        this._textures = {};

        const { importSpritesheet } = (
            shouldLoadHighRes
                ? await import("virtual:image-spritesheets-importer-high-res")
                : await import("virtual:image-spritesheets-importer-low-res")
        ) as ImageSpritesheetImporter;
        const { spritesheets } = await importSpritesheet(gameMode);

        let resolved = 0;
        const count = spritesheets.length;

        await Promise.all(spritesheets.map(async spritesheet => {
            // biome-ignore lint/style/noNonNullAssertion: this is defined via vite-spritesheet-plugin, so it is never nullish
            const image = spritesheet.meta.image!;

            console.log(`Loading spritesheet ${location.origin}/${image}`);

            try {
                const sheetTexture = await Assets.load<Texture>(image);
                await this.pixi.renderer.prepare.upload(sheetTexture);
                const spritesheetTextures = await new Spritesheet(sheetTexture, spritesheet).parse();
                Object.assign(this._textures, spritesheetTextures);

                const resolvedCount = ++resolved;
                const progress = `(${resolvedCount} / ${count})`;
                menuUi.connectingText = m.loading_spritesheets({ progress });
                console.log(`Atlas ${image} loaded ${progress}`);
            } catch (e) {
                ++resolved;
                console.error(`Atlas ${image} failed to load. Details:`, e);
            }
        }));
    }

    async loadGameMode(gameMode: GameMode): Promise<void> {
        await this.loadTextures(gameMode);

        // Apply filters to canvas
        const { canvasFilters } = GameModes[gameMode];
        let filter: ColorMatrixFilter | undefined;
        if (canvasFilters !== undefined) {
            filter = new ColorMatrixFilter();
            filter.saturate(-(1 - canvasFilters.saturation));
            filter.brightness(canvasFilters.brightness, true);
        }
        CameraManager.container.filters = filter ? [filter] : [];
        MapManager.container.filters = filter ? [filter] : [];
    }
}

export const PixiManager = new PixiManagerClass();
