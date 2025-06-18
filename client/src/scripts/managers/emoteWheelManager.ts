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

    enabled = false;
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
        }

        this.selectionGraphics
            .arc(0, 0, DIMENSIONS.innerRingRadius, -this._slotAngle / 2, this._slotAngle / 2)
            .arc(0, 0, DIMENSIONS.outerRingRadius, this._slotAngle / 2, -this._slotAngle / 2, true)
            .closePath()
            .stroke({ width: 5, color: COLORS.selection, cap: "round" });
    }

    show(): void {
        if (this.active) return;

        this.container.visible = true;
        this.active = true;

        this.container.position = InputManager.mousePosition;
    }

    /**
     * Closes the emote wheel and attempt to send emote
     */
    close(): void {
        if (!this.active) return;

        this.container.visible = false;
        this.active = false;

        if (this.selection === undefined) return;
        this.emitEmote(this.emotes.at(this.selection));
        this.selection = undefined;
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

        const position = InputManager.mousePosition;
        if (this._oldPosition && Vec.equals(position, this._oldPosition)) return;

        this._oldPosition = position;

        const { DIMENSIONS } = EmoteWheelManagerClass;
        const { blockEmoting } = UIManager;
        const dist = Vec.sub(position, this.container.position);
        const len = Vec.squaredLength(dist);
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
        console.log({
            type: InputActions.MapPing,
            ping: MapPings.reify(ping),
            position: this.position
        });
    }

    override show(): void {
        if (this.active) return;

        super.show();
        if (!this.onMinimap) {
            this.position = Vec.clone(InputManager.gameMousePosition);
        }
    }

    override close(): void {
        super.close();
        this.onMinimap = false;
    }
}

export const EmoteWheelManager = new EmoteWheelManagerClass();
export const MapPingWheelManager = new MapPingWheelManagerClass();
