import { Container, Graphics, isMobile, LINE_CAP, Sprite, Texture } from "pixi.js";
import { GasState, GRID_SIZE } from "../../../../common/src/constants";
import { v, vClone, type Vector, vMul } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { consoleVariables } from "../utils/console/variables";
import { SuroiSprite } from "../utils/pixi";
import { Gas } from "./gas";

export class Minimap {
    container = new Container();

    game: Game;

    expanded = false;

    visible = true;

    mask = new Graphics();

    position = v(0, 0);
    lastPosition = v(0, 0);

    // used for the gas to player line and circle
    gasPos = v(0, 0);
    gasRadius = 0;
    gasGraphics = new Graphics();

    objectsContainer = new Container();

    sprite = new Sprite(Texture.EMPTY);

    indicator = new SuroiSprite("player_indicator.svg");

    width = 0;
    height = 0;

    oceanPadding = GRID_SIZE * 10;

    minimapWidth = 0;
    minimapHeight = 0;

    margins = v(0, 0);

    gas = new Gas(1, this.objectsContainer);

    placesContainer = new Container();

    constructor(game: Game) {
        this.game = game;
        game.pixi.stage.addChild(this.container);

        this.objectsContainer.mask = this.mask;

        this.container.addChild(this.objectsContainer);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        if (consoleVariables.get.builtIn("cv_minimap_minimized").value) this.toggleMiniMap();

        this.indicator.scale.set(0.1);

        this.sprite.position.set(-this.oceanPadding);
        this.objectsContainer.addChild(this.sprite, this.placesContainer, this.gas.graphics, this.gasGraphics, this.indicator).sortChildren();

        $("#minimap-border").on("click", e => {
            if (!isMobile.any) return;
            this.switchToBigMap();
            e.stopImmediatePropagation();
        });

        $("#btn-close-minimap").on("pointerdown", e => {
            this.switchToSmallMap();
            e.stopImmediatePropagation();
        });
    }

    update(): void {
        this.gas.updateFrom(this.game.gas);
        this.gas.update();
        // only re-render gas line and circle if something changed
        if ((this.position.x === this.lastPosition.x &&
            this.position.y === this.lastPosition.y &&
            this.gas.newRadius === this.gasRadius &&
            this.gas.newPosition.x === this.gasPos.x &&
            this.gas.newPosition.y === this.gasPos.y) || this.gas.state === GasState.Inactive) return;

        this.lastPosition = this.position;
        this.gasPos = this.gas.newPosition;
        this.gasRadius = this.gas.newRadius;

        this.gasGraphics.clear();

        this.gasGraphics.lineStyle({
            color: 0x00f9f9,
            width: 2,
            cap: LINE_CAP.ROUND
        });

        this.gasGraphics.moveTo(this.position.x, this.position.y)
            .lineTo(this.gasPos.x, this.gasPos.y);

        this.gasGraphics.endFill();

        this.gasGraphics.line.color = 0xffffff;
        this.gasGraphics.arc(this.gasPos.x, this.gasPos.y, this.gasRadius, 0, Math.PI * 2);
        this.gasGraphics.endFill();
    }

    borderContainer = $("#minimap-border");

    resize(): void {
        if (this.expanded) {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const smallestDim = Math.min(screenHeight, screenWidth);
            this.container.scale.set(smallestDim / (this.height + this.oceanPadding));
            // noinspection JSSuspiciousNameCombination
            this.minimapWidth = (this.sprite.width - this.oceanPadding) * this.container.scale.x;
            this.minimapHeight = (this.sprite.height - this.oceanPadding) * this.container.scale.y;
            this.margins = v(screenWidth / 2 - (this.minimapWidth / 2), screenHeight / 2 - (this.minimapHeight / 2));

            const closeButton = $("#btn-close-minimap");
            closeButton.css("left", `${Math.min(this.margins.x + this.minimapWidth + 16, screenWidth - (closeButton.outerWidth() ?? 0))}px`);
        } else {
            if (!this.visible) return;

            const bounds = this.borderContainer[0].getBoundingClientRect();
            const border = parseInt(this.borderContainer.css("border-width"));

            this.minimapWidth = bounds.width - border * 2;
            this.minimapHeight = bounds.height - border * 2;
            this.margins = v(bounds.left + border, bounds.top + border);

            if (window.innerWidth > 1200) {
                this.container.scale.set(1 / 1.25);
            } else {
                this.container.scale.set(1 / 2);
            }
        }

        this.mask.clear();
        this.mask.beginFill(0);
        this.mask.drawRect(this.margins.x, this.margins.y, this.minimapWidth, this.minimapHeight);
        this.updatePosition();
        this.updateTransparency();

        for (const text of this.placesContainer.children) {
            text.scale.set(1 / this.container.scale.x);
        }
    }

    toggle(): void {
        if (this.expanded) this.switchToSmallMap();
        else this.switchToBigMap();
    }

    setPosition(pos: Vector): void {
        this.position = vClone(pos);
        this.indicator.setVPos(pos);
        this.updatePosition();
    }

    updatePosition(): void {
        if (this.expanded) {
            this.container.position.set(window.innerWidth / 2, window.innerHeight / 2 - this.minimapHeight / 2);
            this.objectsContainer.position.set(-this.width / 2, this.oceanPadding / 2);
            return;
        }
        const pos = vClone(this.position);
        pos.x -= (this.minimapWidth / 2 + this.margins.x) / this.container.scale.x;
        pos.y -= (this.minimapHeight / 2 + this.margins.y) / this.container.scale.y;

        this.container.position.set(0, 0);
        this.objectsContainer.position.copyFrom(vMul(pos, -1));
    }

    switchToBigMap(): void {
        this.expanded = true;
        this.container.visible = true;
        $("#minimap-border").hide();
        $("#scopes-container").hide();
        $("#gas-msg-info").hide();
        $("#btn-close-minimap").show();
        $("#center-bottom-container").hide();
        $("#kill-counter").show();
        this.resize();
    }

    switchToSmallMap(): void {
        this.expanded = false;
        $("#btn-close-minimap").hide();
        $("#center-bottom-container").show();
        $("#gas-msg-info").show();
        $("#scopes-container").show();
        $("#kill-counter").hide();
        if (!this.visible) {
            this.container.visible = false;
            return;
        }
        $("#minimap-border").show();
        this.resize();
    }

    updateTransparency(): void {
        this.container.alpha = consoleVariables.get.builtIn(this.expanded ? "cv_map_transparency" : "cv_minimap_transparency").value;
    }

    toggleMiniMap(noSwitchToggle = false): void {
        this.visible = !this.visible;

        this.switchToSmallMap();
        this.container.visible = this.visible;
        $("#minimap-border").toggle(this.visible);
        consoleVariables.set.builtIn("cv_minimap_minimized", !this.visible);
        if (!noSwitchToggle) {
            $("#toggle-hide-minimap").prop("checked", !this.visible);
        }
    }
}
