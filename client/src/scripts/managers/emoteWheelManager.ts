import { InputActions } from "@common/constants.js";
import { Emotes, type EmoteDefinition } from "@common/definitions/emotes.js";
import { MapPings } from "@common/definitions/mapPings.js";
import { TAU } from "@common/utils/math.js";
import type { ReferenceTo } from "@common/utils/objectDefinitions";
import { Vec, type Vector } from "@common/utils/vector.js";
import { Color, Container, Graphics, type ColorSource } from "pixi.js";
import { SuroiSprite } from "../utils/pixi";
import { InputManager } from "./inputManager";
import { UIManager } from "./uiManager";
import { Game } from "../game";
import { MapManager } from "./mapManager";
import { CameraManager } from "./cameraManager";
import { PIXI_SCALE } from "../utils/constants";
import { GameConsole } from "../console/gameConsole";

class EmoteWheelManagerClass {
    static readonly COLORS = {
        background: new Color({ h: 0, s: 0, l: 9, a: 0.46 }),
        stroke: new Color({ h: 0, s: 0, l: 75, a: 0.5 }),
        selection: 0xff7500
    } satisfies Record<string, ColorSource>;

    static readonly DIMENSIONS = {
        outerRingRadius: 130,
        innerRingRadius: 20,
        emotePadding: 8,
        tickPadding: 8,
        strokeWidth: 5,
        closeButtonSize: 6
    } satisfies Record<string, number>;

    backgroundGraphics = new Graphics();
    tickGraphics = new Graphics();
    selectionGraphics = new Graphics();
    closeGraphics = new Graphics();
    emoteSlotSprites = new Container<SuroiSprite>();

    container = new Container();

    private _enabled = false;
    get enabled(): boolean { return this._enabled; }
    set enabled(enabled: boolean) {
        this._enabled = enabled;

        if (EmoteWheelManager.enabled) {
            if (MapPingWheelManager.enabled) {
                MapPingWheelManager.show();
                EmoteWheelManager.close();
            } else if (!GameConsole.getBuiltInCVar("cv_hide_emotes")) {
                EmoteWheelManager.show();
                MapPingWheelManager.close();
            }
        } else {
            EmoteWheelManager.close();
            MapPingWheelManager.close();
        }
    }

    active = false;
    selection?: number;

    emotes: Array<ReferenceTo<EmoteDefinition>> = [];
    _slotAngle = 0;

    private _initialized = false;
    init(): void {
        if (this._initialized) {
            throw new Error("EmoteWheelManager has already been initialized");
        }
        this._initialized = true;

        const { DIMENSIONS, COLORS } = EmoteWheelManagerClass;
        const s = DIMENSIONS.closeButtonSize;

        this.backgroundGraphics
            .circle(0, 0, DIMENSIONS.outerRingRadius)
            .fill({ color: COLORS.background })
            .circle(0, 0, DIMENSIONS.innerRingRadius)
            .stroke({ width: DIMENSIONS.strokeWidth, color: COLORS.stroke })
            .moveTo(-s, -s)
            .lineTo(s, s)
            .moveTo(s, -s)
            .lineTo(-s, s)
            .stroke({ width: 3.5, color: COLORS.stroke, cap: "round" });

        this.closeGraphics
            .circle(0, 0, DIMENSIONS.innerRingRadius)
            .stroke({ width: DIMENSIONS.strokeWidth, color: COLORS.selection })
            .moveTo(-s, -s)
            .lineTo(s, s)
            .moveTo(s, -s)
            .lineTo(-s, s)
            .stroke({ width: 3.5, color: COLORS.selection, cap: "round" });

        this.closeGraphics.visible = false;

        this.container.addChild(
            this.backgroundGraphics,
            this.tickGraphics,
            this.selectionGraphics,
            this.closeGraphics,
            this.emoteSlotSprites
        );

        this.container.visible = false;
    }

    setupSlots(): void {
        this.tickGraphics.clear();
        this.selectionGraphics.clear();
        this.emoteSlotSprites.removeChildren();

        this._slotAngle = TAU / this.emotes.length;

        const { DIMENSIONS, COLORS } = EmoteWheelManagerClass;

        const midpoint = (DIMENSIONS.outerRingRadius - DIMENSIONS.innerRingRadius) / 2 + DIMENSIONS.innerRingRadius + 5;
        /*
         * To explain the math behind this:
         *
         * Using the sine law,
         *
         * sin a   sin b
         * ----- = -----
         *   A       B
         *     sin a * B
         * A = ---------
         *       sin b
         *
         * B is the midpoint variable defined before
         * a is this._slotAngle
         * b is (180 - a) / 2
         * A is the emote size
         */
        const bAngle = (180 - this._slotAngle) / 2;
        const emoteSize = (Math.sin(this._slotAngle) * midpoint) / Math.sin(bAngle);

        for (let _i = 0; _i < this.emotes.length; _i++) {
            const angle = _i * this._slotAngle + this._slotAngle / 2;
            const innerPoint = Vec.fromPolar(angle, DIMENSIONS.innerRingRadius + DIMENSIONS.tickPadding + DIMENSIONS.strokeWidth / 2);
            const outerPoint = Vec.fromPolar(angle, DIMENSIONS.outerRingRadius - DIMENSIONS.tickPadding);
            this.tickGraphics
                .moveTo(innerPoint.x, innerPoint.y)
                .lineTo(outerPoint.x, outerPoint.y)
                .stroke({ width: DIMENSIONS.strokeWidth, color: COLORS.stroke });

            const emote = this.emotes[_i];
            const sprite = new SuroiSprite(emote)
                .setVPos(Vec.fromPolar(_i * this._slotAngle, midpoint));
            sprite.width = emoteSize - DIMENSIONS.emotePadding;
            sprite.height = emoteSize - DIMENSIONS.emotePadding;
            this.emoteSlotSprites.addChild(sprite);

            if (!InputManager.isMobile) continue;

            sprite.eventMode = "static";
            sprite.on("pointerdown", () => {
                this.selection = this.emotes.indexOf(emote);
                EmoteWheelManager._enabled = false;
                EmoteWheelManager.close();
                MapPingWheelManager._enabled = false;
                MapPingWheelManager.close(false);

                UIManager.ui.emoteButton.addClass("btn-primary").removeClass("btn-alert");
                UIManager.ui.pingToggle.addClass("btn-primary").removeClass("btn-danger");
                UIManager.updateRequestableItems();

                setTimeout(() => {
                    UIManager.ui.game.one("pointerdown", e => {
                        let position: Vector | undefined;
                        // fuck you
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const globalPos = Vec(e.clientX!, e.clientY!);
                        MapPingWheelManager.updatePosition(globalPos);
                        position = MapPingWheelManager.position;
                        if (!position) {
                            const pixiPos = CameraManager.container.toLocal(globalPos);
                            position = Vec.scale(pixiPos, 1 / PIXI_SCALE);
                        }

                        InputManager.addAction({
                            type: InputActions.MapPing,
                            ping: MapPings.fromString(emote),
                            position
                        });
                    });
                }, 250);
            });
        }

        if (InputManager.isMobile) return;

        this.selectionGraphics
            .arc(0, 0, DIMENSIONS.innerRingRadius, -this._slotAngle / 2, this._slotAngle / 2)
            .arc(0, 0, DIMENSIONS.outerRingRadius, this._slotAngle / 2, -this._slotAngle / 2, true)
            .closePath()
            .stroke({ width: 5, color: COLORS.selection, cap: "round" });
    }

    show(): void {
        if (this.active) return;

        let position: Vector;
        if (InputManager.isMobile) {
            position = Vec(Game.pixi.screen.width / 2, Game.pixi.screen.height / 2);
        } else {
            // this whole mess makes it so the position doesn't change when switching between wheels
            if (EmoteWheelManager.active) {
                position = EmoteWheelManager.container.position;
            } else if (MapPingWheelManager.active) {
                position = MapPingWheelManager.container.position;
            } else {
                position = InputManager.mousePosition;
            }
        }
        this.container.position = position;
        this.container.visible = true;
        this.active = true;
    }

    /**
     * Closes the emote wheel and attempt to send emote
     */
    close(emitEmote = true): void {
        if (!this.active) return;

        this.container.visible = false;
        this.active = false;

        if (this.selection === undefined || !emitEmote) return;
        this.emitEmote(this.emotes.at(this.selection));
        this.selection = undefined;
        UIManager.updateRequestableItems();
    }

    /**
     * Sends an emote packet
     */
    emitEmote(emote?: string): void {
        if (MapPingWheelManager.active || !emote) return;

        InputManager.addAction({
            type: InputActions.Emote,
            emote: Emotes.reify(emote)
        });
    }

    private _oldPosition?: Vector;

    update(): void {
        if (!this.active) return;

        this.container.tint = UIManager.blockEmoting ? 0xb1b1b1 : 0xffffff;

        if (InputManager.isMobile) return;

        const position = InputManager.mousePosition;
        if (this._oldPosition && Vec.equals(position, this._oldPosition)) return;

        this._oldPosition = position;

        const { DIMENSIONS } = EmoteWheelManagerClass;
        const { blockEmoting } = UIManager;
        const dist = Vec.sub(position, this.container.position);
        const len = Vec.squaredLen(dist);
        const selected = len > DIMENSIONS.innerRingRadius ** 2;

        this.closeGraphics.visible = !selected && !blockEmoting;
        this.selectionGraphics.visible = selected && !blockEmoting;

        if (selected && !blockEmoting) {
            const selectionIndex = Math.round(Vec.direction(dist) / this._slotAngle);
            this.selection = selectionIndex;
            this.selectionGraphics.rotation = selectionIndex * this._slotAngle;
        } else {
            this.selection = undefined;
        }
    }
}

class MapPingWheelManagerClass extends EmoteWheelManagerClass {
    override emotes = MapPings.definitions.filter(p => p.isPlayerPing).map(({ idString }) => idString);

    onMinimap = false;
    position?: Vector;

    override emitEmote(ping?: string): void {
        if (!ping || !this.position) return;

        InputManager.addAction({
            type: InputActions.MapPing,
            ping: MapPings.reify(ping),
            position: this.position
        });
        UIManager.updateRequestableItems();
    }

    override show(): void {
        if (this.active) return;

        super.show();

        if (InputManager.isMobile) return;

        this.updatePosition(InputManager.mousePosition);
        if (!this.position) {
            this.position = Vec.clone(InputManager.gameMousePosition);
        }
    }

    updatePosition(globalPos: Vector): void {
        const position = MapManager.sprite.toLocal(globalPos);

        if (MapManager.expanded) {
            const { x, y } = position;
            const { width, height } = MapManager;
            this.onMinimap = x >= 0 && x <= width && y >= 0 && y <= height;
        } else {
            const { x, y } = globalPos;
            const { margins, minimapWidth, minimapHeight } = MapManager;
            this.onMinimap = x >= margins.x && x <= minimapWidth + margins.x && y >= margins.y && y <= minimapHeight + margins.y;
        }

        this.position = this.onMinimap ? position : undefined;
    }
}

export const EmoteWheelManager = new EmoteWheelManagerClass();
export const MapPingWheelManager = new MapPingWheelManagerClass();
