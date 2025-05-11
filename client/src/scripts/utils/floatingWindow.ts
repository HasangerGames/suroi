import { Numeric } from "@common/utils/math";
import { GameConsole } from "../console/gameConsole";
import type { BooleanCVars, NumberCVars } from "../console/variables";

class WindowManager {
    private readonly children = new Map<FloatingWindow, number>();
    private topChild?: readonly [FloatingWindow, number];
    static readonly defaultZIndex = 1000;

    addWindow(window: FloatingWindow): void {
        this.children.set(window, WindowManager.defaultZIndex);
        if (this.topChild === undefined) {
            this.topChild = [window, WindowManager.defaultZIndex];
        }
    }

    removeWindow(window: FloatingWindow): void {
        this.children.delete(window);
    }

    /**
     * Precondition: `this.children.has(window)`
     */
    protected _setTopChild(window: FloatingWindow, zIndex: number): void {
        this.topChild = [window, zIndex];
        window.ui.globalContainer.css("z-index", zIndex);
    }

    bringToFront(window: FloatingWindow): void {
        if (!this.children.has(window)) return;

        if (this.topChild === undefined) {
            this._setTopChild(window, WindowManager.defaultZIndex + 1);
            return;
        }

        const [oldWin, oldZ] = this.topChild;
        if (oldWin === window) return;

        // biome-ignore lint/style/noNonNullAssertion: :3 meow meow meow
        const curZ = this.children.get(window)!;

        if (oldZ === curZ) {
            this._setTopChild(window, curZ + 1);
        } else {
            this._setTopChild(window, oldZ);
            oldWin.ui.globalContainer.css("z-index", curZ);
        }
    }
}

export abstract class FloatingWindow<UiSupplements extends object = object> {
    static readonly windowManager = new WindowManager();

    // goofy infinite loop prevention for resizes
    protected _noWidthAdjust = false;
    protected _noHeightAdjust = false;

    protected _isOpen = false;
    get isOpen(): boolean { return this._isOpen; }
    set isOpen(value: boolean) {
        if (this._isOpen === value) return;

        if (value) {
            this.open();
        } else {
            this.close();
        }
    }

    open(): void {
        this._isOpen = true;
        GameConsole.variables.get.builtIn(this.convars.open).setValue(true);
        this.ui.globalContainer.show();
    }

    close(): void {
        this._isOpen = false;
        GameConsole.variables.get.builtIn(this.convars.open).setValue(false);
        this.ui.globalContainer.hide();
    }

    toggle(): void {
        this.isOpen = !this._isOpen;
    }

    protected width = 100;
    protected height = 100;

    protected _changeWidth(target: number): boolean {
        target = Numeric.clamp(target, 0, window.innerWidth - this.left);

        if (this.width === target) return false;

        this.width = target;
        GameConsole.variables.set.builtIn(this.convars.width, target);
        if (!this._noWidthAdjust) {
            this.ui.container.css("width", target);
        }

        return true;
    }

    protected _changeHeight(target: number): boolean {
        target = Numeric.clamp(target, 0, window.innerHeight - this.top);

        if (this.height === target) return false;

        this.height = target;
        GameConsole.variables.set.builtIn(this.convars.height, target);
        if (!this._noHeightAdjust) {
            this.ui.container.css("height", target);
        }

        return true;
    }

    protected left = 0;
    protected top = 0;

    protected static readonly magicalPadding /* that prevents scroll bars from showing up */ = 1;

    /**
     * @returns Whether the container's left changed
     */
    protected _changeLeft(target: number): boolean {
        target = Numeric.clamp(target, 0, window.innerWidth - this.width - FloatingWindow.magicalPadding);

        if (this.left === target) return false;

        this.left = target;
        GameConsole.variables.set.builtIn(this.convars.left, target);
        this.ui.container.css("left", target);
        return true;
    }

    /**
     * @returns Whether the container's top changed
     */
    protected _changeTop(target: number): boolean {
        target = Numeric.clamp(target, 0, window.innerHeight - this.height - FloatingWindow.magicalPadding);

        if (this.top === target) return false;

        this.top = target;
        GameConsole.variables.set.builtIn(this.convars.top, target);
        this.ui.container.css("top", target);
        return true;
    }

    constructor(
        readonly convars: {
            readonly open: BooleanCVars
            readonly top: NumberCVars
            readonly left: NumberCVars
            readonly width: NumberCVars
            readonly height: NumberCVars
        },
        readonly ui: {
            readonly globalContainer: JQuery<HTMLDivElement>
            readonly container: JQuery<HTMLDivElement>
            readonly header: JQuery<HTMLDivElement>
            readonly closeButton: JQuery<HTMLButtonElement>
        } & UiSupplements
    ) {
        // assert(GameConsole.variables.has.builtIn(convars.open) && typeof GameConsole.variables.get.builtIn(convars.open) === "boolean");
        // assert(GameConsole.variables.has.builtIn(convars.top) && typeof GameConsole.variables.get.builtIn(convars.top) === "number");
        // assert(GameConsole.variables.has.builtIn(convars.left) && typeof GameConsole.variables.get.builtIn(convars.left) === "number");
        // assert(GameConsole.variables.has.builtIn(convars.width) && typeof GameConsole.variables.get.builtIn(convars.width) === "number");
        // assert(GameConsole.variables.has.builtIn(convars.height) && typeof GameConsole.variables.get.builtIn(convars.height) === "number");

        FloatingWindow.windowManager.addWindow(this);
    }

    init(): void {
        const addChangeListener = GameConsole.variables.addChangeListener.bind(GameConsole.variables);
        addChangeListener(
            this.convars.left,
            val => this._changeLeft(val)
        );

        addChangeListener(
            this.convars.top,
            val => this._changeTop(val)
        );

        addChangeListener(
            this.convars.width,
            val => this._changeWidth(val)
        );

        addChangeListener(
            this.convars.height,
            val => this._changeHeight(val)
        );

        addChangeListener(
            this.convars.open,
            val => this.isOpen = val
        );

        this.resizeAndMove({
            dimensions: {
                width: GameConsole.getBuiltInCVar(this.convars.width),
                height: GameConsole.getBuiltInCVar(this.convars.height)
            },
            position: {
                left: GameConsole.getBuiltInCVar(this.convars.left),
                top: GameConsole.getBuiltInCVar(this.convars.top)
            }
        });

        this.isOpen = GameConsole.getBuiltInCVar(this.convars.open);

        this._attachListeners();
    }

    protected _attachListeners(): void {
        // Close button
        {
            this.ui.closeButton.on("click", e => {
                if (e.button !== 0) return;

                this.close();
            });
        }

        // Dragging
        {
            let dragging = false;
            const offset = {
                x: 0,
                y: 0
            };

            const mouseUpHandler = (): void => {
                if (!dragging) return;

                dragging = false;

                window.removeEventListener("mouseup", mouseUpHandler);
                window.removeEventListener("mousemove", mouseMoveHandler);
            };

            const mouseMoveHandler = (event: MouseEvent): void => {
                this._changeLeft(event.clientX + offset.x);
                this._changeTop(event.clientY + offset.y);
            };

            this.ui.header.on("mousedown", e => {
                dragging = true;

                // This does _not_ equal e.offsetX
                offset.x = parseInt(this.ui.container.css("left")) - e.clientX;
                offset.y = parseInt(this.ui.container.css("top")) - e.clientY;

                window.addEventListener("mouseup", mouseUpHandler);
                window.addEventListener("mousemove", mouseMoveHandler);
            });
        }

        // Resize
        {
            new ResizeObserver(e => {
                // Ignore for closed consoles
                if (!this._isOpen) return;

                const size = e[0]?.borderBoxSize[0];
                // Shouldn't ever happen
                if (size === undefined) return;

                // With a left-to-right writing mode, inline is horizontal and block is vertical
                // This might not work with languages where inline is vertical

                this._noWidthAdjust = true;
                this._changeWidth(size.inlineSize);
                this._noWidthAdjust = false;

                this._noHeightAdjust = true;
                this._changeHeight(size.blockSize);
                this._noHeightAdjust = false;
            }).observe(this.ui.container[0]);
        }

        // Bring window to top
        {
            this.ui.globalContainer.on("mousedown", () => FloatingWindow.windowManager.bringToFront(this));
        }
    }

    resizeAndMove(info: {
        readonly dimensions?: {
            readonly width?: number
            readonly height?: number
        }
        readonly position?: {
            readonly left?: number
            readonly top?: number
        }
    }): void {
        if (info.dimensions?.width !== undefined) {
            this._changeWidth(info.dimensions.width);
        }

        if (info.dimensions?.height !== undefined) {
            this._changeHeight(info.dimensions.height);
        }

        if (info.position?.left !== undefined) {
            this._changeLeft(info.position.left);
        }

        if (info.position?.top !== undefined) {
            this._changeTop(info.position.top);
        }
    }
}
