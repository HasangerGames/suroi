import { type ColorSource, Container, Graphics } from "pixi.js";
import { Game } from "../game.ts";
import { SuroiSprite } from "../utils/pixi.ts";
import { Emotes, type EmoteDefinition } from "@common/definitions/emotes.js";
import { Vec } from "@common/utils/vector.js";
import { TAU } from "@common/utils/math.js";
import { InputActions } from "@common/constants.js";
import { MapPings } from "@common/definitions/mapPings.js";

/**
 * Manages the emote wheel
 * Rendered in the pixi instance
 */
export class EmoteWheelManager {
  container: Container = new Container();

  static readonly COLORS = {
    background: { h: 0, s: 0, l: 0.7, a: 0.5 },
    stroke: 0x222222,
    selection: 0xff0000
  } satisfies Record<string, ColorSource>;
  static readonly DIMENSIONS = {
    outerRingRadius: 150,
    innerRingRadius: 40,
    padding: 10,
    emotePadding: 5,
    strokeWidthSmall: 3,
    strokeWidthLarge: 5
  } satisfies Record<string,number>;
  
  backgroundGraphics: Graphics = new Graphics();
  tickGraphics: Graphics = new Graphics();
  selectionGraphics: Graphics = new Graphics();
  closeGraphics: Graphics = new Graphics();
  closeSprite: SuroiSprite = new SuroiSprite();
  emoteSlotSprites: Container<SuroiSprite> = new Container();

  open = false;
  selection: number | null = null;

  emotes: { idString: string }[] = []
  _slotAngle: number = 0;

  /**
   * Creates the emote wheel manager
   * Use `this.init()` to actually initialize it
   */
  constructor(public game: Game) {}

  /**
   * Initializes the emote wheel
   */
  init() {
    this.backgroundGraphics
      .circle(0, 0, EmoteWheelManager.DIMENSIONS.outerRingRadius)
      .fill({ color: EmoteWheelManager.COLORS.background })
      .circle(0, 0, EmoteWheelManager.DIMENSIONS.outerRingRadius)
      .circle(0, 0, EmoteWheelManager.DIMENSIONS.innerRingRadius)
      .stroke({ width: 3, color: EmoteWheelManager.COLORS.stroke })

    this.closeGraphics
      .circle(0, 0, 40)
      .stroke({ width: EmoteWheelManager.DIMENSIONS.strokeWidthSmall, color: EmoteWheelManager.COLORS.selection })

    this.closeGraphics.visible = false;

    this.setupSlots();

    this.container.addChild(
      this.backgroundGraphics,
      this.tickGraphics,
      this.closeSprite,
      this.selectionGraphics,
      this.closeGraphics,
      this.emoteSlotSprites
    );
  }

  /**
   * Set up slot related graphics in the emote wheel
   */
  setupSlots() {
    this.tickGraphics.clear();
    this.selectionGraphics.clear();

    this._slotAngle = TAU / this.emotes.length

    const midpoint = (EmoteWheelManager.DIMENSIONS.outerRingRadius - EmoteWheelManager.DIMENSIONS.innerRingRadius) / 2 + EmoteWheelManager.DIMENSIONS.innerRingRadius;
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
      const innerPoint = Vec.fromPolar(_i * this._slotAngle + this._slotAngle / 2, EmoteWheelManager.DIMENSIONS.innerRingRadius + EmoteWheelManager.DIMENSIONS.padding);
      const outerPoint = Vec.fromPolar(_i * this._slotAngle + this._slotAngle / 2, EmoteWheelManager.DIMENSIONS.outerRingRadius - EmoteWheelManager.DIMENSIONS.padding);
      this.tickGraphics
        .moveTo(innerPoint.x, innerPoint.y)
        .lineTo(outerPoint.x, outerPoint.y)
        .stroke({ width: EmoteWheelManager.DIMENSIONS.strokeWidthSmall, color: EmoteWheelManager.COLORS.stroke })

      const emote = this.emotes[_i];
      const sprite = new SuroiSprite(emote.idString)
        .setVPos(Vec.fromPolar(_i * this._slotAngle, midpoint));
      sprite.width = emoteSize - EmoteWheelManager.DIMENSIONS.emotePadding;
      sprite.height = emoteSize - EmoteWheelManager.DIMENSIONS.emotePadding;
      this.emoteSlotSprites.addChild(sprite);

    }

    this.selectionGraphics
      .arc(0, 0, 40, -this._slotAngle / 2, this._slotAngle / 2)
      .arc(0, 0, 150, this._slotAngle / 2, -this._slotAngle / 2, true)
      .closePath()
      .stroke({ width: 5, color: EmoteWheelManager.COLORS.selection })
  }

  /**
   * Shows and mounts the emote wheel
   */
  show() {
    if (this.open) return;
    this.container.visible = true;
    this.open = true;
    const { mouseX, mouseY } = this.game.inputManager
    this.container.position.set(mouseX, mouseY)
  }

  /**
   * Closes the emote wheel and attempt to send emote
   */
  close() {
    this.container.visible = false;
    this.open = false;

    // POV: Javascript converts your 0 into a false
    if (this.selection === null) return;
    const selected = this.emotes.at(this.selection);
    if (!selected) return;
    this.emitEmote(selected.idString);
  }


  emitEmote(emote: string) {
    this.game.inputManager.addAction({
      type: InputActions.Emote,
      emote: Emotes.reify(emote)
    })
  }

  /**
   * Frame update for the emote wheel
   */
  update() {
    if (!this.open) return;
    const { mouseX, mouseY } = this.game.inputManager;
    const dist = Vec.sub(Vec.create(mouseX, mouseY),
                        this.container.position);
    const len = Vec.length(dist);
    this.closeGraphics.visible = len <= 40;
    this.selectionGraphics.visible = len > 40;
    const selectionIndex = Math.round(Vec.direction(dist) / this._slotAngle)
    if (len <= 40) this.selection = null;
    if (len > 40) this.selection = selectionIndex
    this.selectionGraphics.rotation = selectionIndex * this._slotAngle;
  }
}

export class PlayerPingWheelManager extends EmoteWheelManager{
  override emotes = MapPings.definitions;

  override emitEmote(ping: string) {
    this.game.inputManager.addAction({
      type: InputActions.MapPing,
      ping: MapPings.reify(ping),
      position: this.game.inputManager.gameMousePosition
    })
  }
}
