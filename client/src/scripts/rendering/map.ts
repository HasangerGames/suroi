import { Container, Graphics } from "pixi.js";
import { type Game } from "../game";
import { MINIMAP_SCALE } from "../utils/constants";
import { localStorageInstance } from "../utils/localStorageHandler";
import { type Vector, v, vClone, vMul } from "../../../../common/src/utils/vector";
import { SuroiSprite } from "../utils/pixi";

export class Minimap {
    container = new Container();

    game: Game;

    expanded = false;

    visible = localStorageInstance.config.minimapMinimized;

    mask = new Graphics();

    position = v(0, 0);

    objectsContainer = new Container();

    indicator = new SuroiSprite("player_indicator.svg");

    width = 0;
    height = 0;

    minimapWidth = 0;
    minimapHeight = 0;

    margins = v(0, 0);

    constructor(game: Game) {
        this.game = game;
        game.pixi.stage.addChild(this.container);

        this.container.mask = this.mask;

        this.container.addChild(this.objectsContainer);

        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        if (localStorageInstance.config.minimapMinimized && this.visible) this.toggleMiniMap();

        this.indicator.scale.set(0.1 * MINIMAP_SCALE);
    }

    resize(): void {
        if (this.expanded) this.resizeBigMap();
        else this.resizeSmallMap();
    }

    resizeMask(): void {
        this.mask.clear()
            .beginFill(0)
            .drawRect(this.margins.x, this.margins.y, this.minimapWidth, this.minimapHeight)
            .endFill();
        this.updatePosition();
    }

    resizeSmallMap(): void {
        if (window.innerWidth > 1200) {
            this.container.scale.set(1 / MINIMAP_SCALE / 1.25);
            this.minimapWidth = 200;
            this.minimapHeight = 200;
            this.margins = v(20, 20);
        } else {
            this.container.scale.set(1 / MINIMAP_SCALE / 2);
            this.minimapWidth = 125;
            this.minimapHeight = 125;
            this.margins = v(10, 10);
        }
        this.resizeMask();
    }

    resizeBigMap(): void {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        this.container.scale.set((0.85 * screenHeight) / (this.height * MINIMAP_SCALE));
        // noinspection JSSuspiciousNameCombination
        this.minimapWidth = screenHeight;
        this.minimapHeight = screenHeight;
        this.margins = v(screenWidth / 2 - screenHeight / 2, 0);
        this.resizeMask();
    }

    toggle(): void {
        if (this.expanded) this.switchToSmallMap();
        else this.switchToBigMap();
    }

    setPosition(pos: Vector): void {
        this.position = vClone(pos);
        this.indicator.setVPos(vMul(pos, MINIMAP_SCALE));
        this.updatePosition();
    }

    updatePosition(): void {
        if (this.expanded) {
            this.objectsContainer.position.set(this.minimapWidth / 2 * MINIMAP_SCALE, 0);
            return;
        }
        const pos = vClone(this.position);
        pos.x -= this.minimapWidth / 2 + this.margins.x * 2;
        pos.y -= this.minimapHeight / 2 + this.margins.y * 2;

        this.objectsContainer.position.copyFrom(vMul(pos, -MINIMAP_SCALE));
    }

    switchToBigMap(): void {
        this.expanded = true;
        this.resizeBigMap();
        $("#minimap-border").hide();
        $("#scopes-container").toggle(!this.expanded);
        $("#gas-msg-info").toggle(!this.expanded);
    }

    switchToSmallMap(): void {
        this.expanded = false;
        this.resizeSmallMap();
        $("#minimap-border").toggle(!this.expanded);
        $("#scopes-container").toggle(!this.expanded);
        $("#gas-msg-info").toggle(!this.expanded);
    }

    updateTransparency(): void {
        this.container.alpha = localStorageInstance.config[this.expanded ? "bigMapTransparency" : "minimapTransparency"];
    }

    toggleMiniMap(noSwitchToggle = false): void {
        this.visible = !this.visible;
        this.container.visible = this.visible;
        $("#minimap-border").toggle(this.visible);
        localStorageInstance.update({ minimapMinimized: !this.visible });
        if (!noSwitchToggle) {
            $("#toggle-hide-minimap").prop("checked", !this.visible);
        }
    }
}
