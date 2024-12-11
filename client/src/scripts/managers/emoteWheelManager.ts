import { type ColorSource, Container, Graphics } from "pixi.js";
import { Game } from "../game.ts";
import { SuroiSprite } from "../utils/pixi.ts";
import { Emotes, type EmoteDefinition } from "@common/definitions/emotes.js";
import { Vec } from "@common/utils/vector.js";
import { TAU } from "@common/utils/math.js";
import { InputActions } from "@common/constants.js";

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
  } satisfies Record<string, ColorSource>
  
  backgroundGraphics: Graphics = new Graphics();
  tickGraphics: Graphics = new Graphics();
  selectionGraphics: Graphics = new Graphics();
  closeGraphics: Graphics = new Graphics();
  closeSprite: SuroiSprite = new SuroiSprite();
  emoteSlotSprites: Container<SuroiSprite> = new Container();

  open = false;
  selection: number | null = null;

  emotes: EmoteDefinition[] = []
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
      .circle(0, 0, 150)
      .fill({ color: EmoteWheelManager.COLORS.background })
      .circle(0, 0, 150)
      .circle(0, 0, 40)
      .stroke({ width: 3, color: EmoteWheelManager.COLORS.stroke })

    this.closeGraphics
      .circle(0, 0, 40)
      .stroke({ width: 3, color: EmoteWheelManager.COLORS.selection })

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

    this.emotes = Emotes.definitions.slice(0, 6);
  }

  /**
   * Set up slot related graphics in the emote wheel
   */
  setupSlots() {
    this.tickGraphics.clear();
    this.selectionGraphics.clear();

    this._slotAngle = TAU / this.emotes.length
    for (let _i = 0; _i < this.emotes.length; _i++) {
      const innerPoint = Vec.fromPolar(_i * this._slotAngle + this._slotAngle / 2, 50)
      const outerPoint = Vec.fromPolar(_i * this._slotAngle + this._slotAngle / 2, 140)
      this.tickGraphics
        .moveTo(innerPoint.x, innerPoint.y)
        .lineTo(outerPoint.x, outerPoint.y)
        .stroke({ width: 3, color: EmoteWheelManager.COLORS.stroke })

      const emote = this.emotes[_i];
      this.emoteSlotSprites.addChild(new SuroiSprite(emote.idString)
                            .setVPos(Vec.fromPolar(_i * this._slotAngle, 95))
                            .setScale(0.8));

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

    if (!this.selection) return;
    const selected = this.emotes.at(this.selection);
    if (!selected) return;
    this.game.inputManager.addAction({
      type: InputActions.Emote,
      emote: selected
    });
  }

  /**
   * Frame update for the emote wheel
   */
  update() {
    if (!this.open) return;
    const { mouseX, mouseY } = this.game.inputManager;
    const dist = Vec.sub(Vec.create(mouseX, mouseY),
                        this.container.position)
    const len = Vec.length(dist)
    this.closeGraphics.visible = len <= 40;
    this.selectionGraphics.visible = len > 40;
    const selectionIndex = Math.round(Vec.direction(dist) / this._slotAngle)
    if (len > 40) this.selection = selectionIndex
    this.selectionGraphics.rotation = selectionIndex * this._slotAngle;
  }
}
