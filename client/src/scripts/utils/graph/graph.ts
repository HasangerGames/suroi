// Original file by leia-uwu for Boom2D
// Used and edited with permission
// https://github.com/leia-uwu/Boom2D/blob/b4914253c4d0a503e45cc307beadfd3444453d2a/client/src/game/ui/graph.ts

import { Numeric } from "@common/utils/math";
import { type DeepPartial, mergeDeep } from "@common/utils/misc";
import type { Vector } from "@common/utils/vector";
import { BitmapText, type CanvasTextOptions, type ColorSource, Container, type FillStyle, Graphics, type StrokeStyle, type TextOptions, type TextStyleOptions } from "pixi.js";

export const defaultLabelTextOptions: TextOptions = {
    style: {
        fontFamily: "monospace",
        fill: {
            color: "white"
        },
        fontSize: 13
    }
};

interface GraphOptions {
    width: number
    height: number
    x: number
    y: number
    maxHistory: number
    title: string
    fill: FillStyle
    stroke: StrokeStyle
    background: {
        fill: FillStyle
        stroke: StrokeStyle
    }
    titleTextStyle: TextStyleOptions
    showGraph: boolean
    showLabels: boolean
}

const defaultOptions: GraphOptions = {
    width: 350,
    height: 100,
    x: 0,
    y: 0,
    maxHistory: 150,
    title: "",
    fill: {
        color: "red",
        alpha: 0.1
    },
    stroke: {
        color: "red",
        width: 1
    },
    background: {
        fill: { color: "transparent" },
        stroke: { color: "gray", alpha: 0.8, width: 2 }
    },
    titleTextStyle: {
        ...defaultLabelTextOptions.style as TextStyleOptions,
        fontSize: 15
    },
    showGraph: true,
    showLabels: true
};

export interface GraphLabel<Stats extends object> {
    readonly text: BitmapText
    updateText: (stats: Stats) => string
    forceX?: number
    forceY?: number
}

// variance says hello
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Graph<DataType extends readonly any[], Stats extends object> {
    readonly container: Container
    readonly gfx: Graphics
    readonly title: BitmapText

    get history(): ReadonlyArray<readonly [number, ...DataType]>
    //                           timestamp ^^^^^^  ^^^^^^^^^^^ value
    get labels(): ReadonlyArray<GraphLabel<Stats>>

    get stats(): Stats

    maxHistory: number

    x: number
    y: number

    width: number
    height: number

    fill: FillStyle
    stroke: StrokeStyle
    background: GraphOptions["background"]

    showGraph: boolean
    showLabels: boolean

    clear(): void
    addEntry(...data: DataType): void
    addLabel(
        updateText: (stats: Stats) => string,
        textOptions: DeepPartial<TextOptions>
    ): this
    update(): void
    updateLabels(): void
    renderGraph(): void
}

/**
 * Minimal implementation of {@link Graph}
 */
// variance says hello
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseGraph<DataType extends readonly any[], Stats extends object> implements Graph<DataType, Stats> {
    readonly container = new Container();
    readonly gfx = new Graphics();
    readonly title = new BitmapText();

    fill: FillStyle;
    stroke: StrokeStyle;
    background: GraphOptions["background"];

    private readonly _labels: Array<GraphLabel<Stats>> = [];
    get labels(): ReadonlyArray<GraphLabel<Stats>> { return this._labels; }

    get x(): number { return this.container.x; }
    set x(x: number) { this.container.x = x; }

    get y(): number { return this.container.y; }
    set y(y: number) { this.container.y = y; }

    protected _width: number;
    get width(): number { return this._width; }

    set width(w: number) {
        this._width = w;
        this.update();
    }

    protected _height: number;
    get height(): number { return this._height; }

    set height(h: number) {
        this._height = h;
        this.update();
    }

    private _maxHistory: number;
    get maxHistory(): number { return this._maxHistory; }

    set maxHistory(history: number) {
        // if (history < 1) { throw new Error("you're stupid"); }
        this._maxHistory = history;
        this.update();
    }

    _showGraph: boolean;
    get showGraph(): boolean { return this._showGraph; }
    set showGraph(showGraph: boolean) {
        this._showGraph = showGraph;
        this.update();
    }

    _showLabels: boolean;
    get showLabels(): boolean { return this._showLabels; }
    set showLabels(showLabels: boolean) {
        this._showLabels = showLabels;
        this.update();
    }

    constructor(options: DeepPartial<GraphOptions> = {}) {
        const merged = mergeDeep({}, defaultOptions, options);

        this._width = merged.width;
        this._height = merged.height;
        this.x = merged.x;
        this.y = merged.y;

        this.fill = merged.fill;
        this.stroke = merged.stroke;
        this.background = merged.background;

        this._maxHistory = merged.maxHistory;

        this.title.text = merged.title;
        this.title.style = merged.titleTextStyle;
        this.title.anchor.x = 0.5;
        this.title.anchor.y = 1;

        this._showGraph = merged.showGraph;
        this._showLabels = merged.showLabels;

        this.container.addChild(this.gfx, this.title);
    }

    addLabel(
        updateText: (stats: Stats) => string,
        textOptions: DeepPartial<TextOptions> = {},
        { x: forceX, y: forceY }: Partial<Vector> = {}
    ): this {
        const text = new BitmapText(mergeDeep({}, defaultLabelTextOptions, textOptions) as CanvasTextOptions);
        this.container.addChild(text);
        this._labels.push({ text, updateText, forceX, forceY });
        return this;
    }

    updateLabels(): void {
        for (let i = 0, x = 0; i < this._labels.length; i++) {
            const { text, updateText, forceX, forceY } = this._labels[i];

            if (!(text.visible = this._showLabels)) {
                continue;
            }

            text.text = updateText(this.stats);
            text.x = forceX ?? x;
            text.y = forceY ?? this._height;
            x += text.width + text.style.fontSize;
        }
    }

    update(): void {
        this.updateLabels();
        this.renderGraph();
    }

    abstract get history(): ReadonlyArray<readonly [number, ...DataType]>;
    abstract get stats(): Stats;
    abstract clear(): void;
    abstract addEntry(...data: DataType): void;
    abstract renderGraph(): void;
}

export type RenderStyle = "line" | "bar";

export interface SingleValueStats {
    min: number
    max: number
    sum: number
    last: number

    mean: number
    // unit/sec
    valueThroughput: number

    // entries/sec
    countThroughput: number
}

export abstract class SVSGraph<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataType extends readonly [data: number, ...rest: any[]]
    //                         ^^^^^^^^^^^^ the value to add to the stats
> extends BaseGraph<DataType, SingleValueStats> {
    protected readonly _history: Array<readonly [number, ...DataType]> = [];
    override get history(): ReadonlyArray<readonly [number, ...DataType]> { return this._history; }

    protected _stats = {
        min: Infinity,
        max: -Infinity,
        sum: 0,
        last: 0,
        mean: 0,
        valueThroughput: 0,
        countThroughput: 0
    };

    get stats(): SingleValueStats { return this._stats; }

    /** Timestamp of the first entry */
    _start = -1;

    override addEntry(...data: DataType): void {
        const stats = this._stats;

        const [val] = data;
        stats.last = val;

        const now = Date.now();
        const histLength = this._history.push([now, ...data]);
        if (histLength > this.maxHistory) {
            // history must have at least 1 entry
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const [, rm] = this._history.shift()!;

            this._start = this._history[0][0];
            stats.sum = stats.sum + val - rm;

            if (rm === stats.min || rm === stats.max) {
                stats.max = -Infinity;
                stats.min = Infinity;
                // only re-traverse the whole array if the removed value is an extremum
                // if it's not, then that means that both the min and max are still
                // in the collection, meaning we just need to compare it to data
                for (const [, item] of this._history) {
                    stats.max = stats.max > item ? stats.max : item;
                    stats.min = stats.min < item ? stats.min : item;
                }
            } else {
                stats.max = Numeric.max(stats.max, val);
                stats.min = Numeric.min(stats.min, val);
            }
        } else {
            if (this._start === -1) this._start = now;

            stats.max = Numeric.max(stats.max, val);
            stats.min = Numeric.min(stats.min, val);
            stats.sum += val;
        }

        const throughputMult = 1e3 / (now - this._start);

        stats.mean = stats.sum / histLength;
        stats.valueThroughput = throughputMult * stats.sum;
        stats.countThroughput = throughputMult * histLength;

        this.update();
    }

    override clear(): void {
        this._history.length = 0;
        this._stats = {
            min: Infinity,
            max: -Infinity,
            sum: 0,
            last: 0,
            mean: 0,
            valueThroughput: 0,
            countThroughput: 0
        };
    }
}

/**
 * General graph class for a single value
 */
export class SingleGraph extends SVSGraph<readonly [number]> {
    _renderStyle: RenderStyle = "line";
    get renderStyle(): RenderStyle { return this._renderStyle; }
    set renderStyle(value: RenderStyle) {
        this._renderStyle = value;
        this.update();
    }

    constructor(options: DeepPartial<GraphOptions & { renderStyle: RenderStyle }> = {}) {
        super(options);
        this._renderStyle = options.renderStyle ?? "line";
    }

    override renderGraph(): void {
        if (!(this.gfx.visible = this._showGraph)) { return; }

        this.title.x = this.width / 2;

        this.gfx
            .clear()
            .rect(0, 0, this.width, this.height)
            .fill(this.background.fill)
            .stroke(this.background.stroke);

        const spaceBetween = this.width / (this.maxHistory - 1);
        const history = this._history;
        const resizeConst = this._height / this._stats.max;

        switch (this._renderStyle) {
            case "line": {
                this.gfx
                    .beginPath()
                    .moveTo(0, this.height);

                let x = 0;
                for (let i = 0; i < history.length; i++) {
                    const height = history[i][1] * resizeConst;
                    x = spaceBetween * i;
                    this.gfx.lineTo(x, this.height - height);
                }

                this.gfx
                    .lineTo(x, this.height)
                    .closePath()
                    .fill(this.fill)
                    .stroke(this.stroke);
                break;
            }
            case "bar": {
                let x = 0;
                for (let i = 0; i < history.length; i++) {
                    const height = history[i][1] * resizeConst;
                    x = spaceBetween * i;
                    this.gfx.rect(x, this._height - height, spaceBetween, height).fill(this.fill);
                }
                break;
            }
        }
    }
}

export type SegmentSpec = { readonly name: string, readonly color: ColorSource, readonly alpha?: number };

/**
 * General graph class for a value made up of smaller parts
 *
 * The segment count and a set of that many colors are defined at construction. For example, one may
 * define three segments, with colors red, green, and blue. From then on, calls to {@link addEntry}
 * will look like `graph.addEntry(total, [seg0, seg1, seg2])`.
 *
 * If the sum of the segments is less than the total, the remaining space uses a default color. If less segments
 * are given than specified, the missing segments are simply not drawn (as if they were 0)
 *
 * It is undefined behavior to have the sum be greater than the total, or to give mores segments than declared.
 */
export class SegmentedBarGraph extends SVSGraph<readonly [number, readonly number[]]> {
    //                                      total ^^^^^^  ^^^^^^^^ segments (must sum to ≤ total)

    _segmentSpec: readonly SegmentSpec[];
    get segmentSpec(): readonly SegmentSpec[] { return this._segmentSpec; }

    _segmentCount = 0;
    /** Number of segments to use */
    get segmentCount(): number { return this._segmentCount; }

    /** Timestamp of the first entry */
    _start = -1;

    readonly legend = new Container();

    constructor(options: DeepPartial<GraphOptions> & { segments: readonly SegmentSpec[] }) {
        super(options);

        this._segmentSpec = options.segments;
        this._segmentCount = options.segments.length;

        const legendFontSize = 8;
        const offset = (this._height - legendFontSize * (this._segmentCount + 1)) / 2;

        this.legend = new Container({
            children: [...this._segmentSpec, { name: "total", color: this.fill.color, alpha: this.fill.alpha }].map(
                (spec, i) => new BitmapText(
                    mergeDeep(
                        {},
                        defaultLabelTextOptions,
                        {
                            text: spec.name,
                            y: offset + legendFontSize * i,
                            style: {
                                fontSize: legendFontSize,
                                fill: {
                                    color: spec.color,
                                    alpha: spec.alpha ?? 1
                                },
                                dropShadow: undefined
                            }
                        } satisfies DeepPartial<TextOptions>
                    ) as CanvasTextOptions
                )
            )
        });
        this.legend.x = this._width + 10;
        this.container.addChild(this.legend);
    }

    override renderGraph(): void {
        if (!(this.legend.visible = this.gfx.visible = this._showGraph)) { return; }

        this.title.x = this.width / 2;

        this.gfx
            .clear()
            .rect(0, 0, this.width, this.height)
            .fill(this.background.fill)
            .stroke(this.background.stroke);

        const spaceBetween = this.width / (this.maxHistory - 1);

        const history = this._history;
        const historyLength = history.length;

        let x = 0;
        const resizeConst = this._height / this._stats.max;
        for (let i = 0; i < historyLength; i++) {
            const height = history[i][1] * resizeConst;
            x = spaceBetween * i;
            this.gfx.rect(x, this.height - height, spaceBetween, height);
        }

        this.gfx.fill(this.fill);

        const runningSums: number[] = Array.from({ length: historyLength }, () => 0);

        for (let i = 0; i < this._segmentCount; i++) {
            this.gfx.beginPath();

            let x = 0;
            for (let j = 0; j < historyLength; j++) {
                const entry = history[j][2][i];
                const height = entry * resizeConst;

                x = spaceBetween * j;
                this.gfx.rect(x, this._height - height - runningSums[j] * resizeConst, spaceBetween, height);
                runningSums[j] += entry;
            }

            this.gfx.fill(this._segmentSpec[i]);
        }
    }
}
