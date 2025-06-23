export const ColorStyles = {
    foreground: {
        black: {
            normal: 30,
            bright: 90
        },
        red: {
            normal: 31,
            bright: 91
        },
        green: {
            normal: 32,
            bright: 92
        },
        yellow: {
            normal: 33,
            bright: 93
        },
        blue: {
            normal: 34,
            bright: 94
        },
        magenta: {
            normal: 35,
            bright: 95
        },
        cyan: {
            normal: 36,
            bright: 96
        },
        white: {
            normal: 37,
            bright: 97
        },
        default: {
            normal: 39,
            bright: 39
        }
    },
    background: {
        black: {
            normal: 40,
            bright: 100
        },
        red: {
            normal: 41,
            bright: 101
        },
        green: {
            normal: 42,
            bright: 102
        },
        yellow: {
            normal: 43,
            bright: 103
        },
        blue: {
            normal: 44,
            bright: 104
        },
        magenta: {
            normal: 45,
            bright: 105
        },
        cyan: {
            normal: 46,
            bright: 106
        },
        white: {
            normal: 47,
            bright: 107
        },
        default: {
            normal: 49,
            bright: 49
        }
    }
} as const;

// Warning: may not work universally
export const FontStyles = {
    bold: 1,
    faint: 2,
    italic: 3,
    underline: 4,
    blinkSlow: 5,
    blinkFast: 6,
    invert: 7,
    conceal: 8,
    strikethrough: 9,
    overlined: 53
} as const;

type Colors = typeof ColorStyles;
type Channel = keyof Colors;
type Color = keyof Colors[Channel];
type Variant = keyof Colors[Channel][Color];

type Fonts = typeof FontStyles;
type FontStyle = Fonts[keyof Fonts];

const CSI = "\u001B";
const OPENING_CODE = `${CSI}[`;
const CLOSING_CODE = `${OPENING_CODE}0m`;
export function styleText(string: string, ...styles: Array<Colors[Channel][Color][Variant] | FontStyle>): string {
    const opening = `${OPENING_CODE}${styles.join(";")}m`;
    // replace the closing codes with this opening code
    // so that styling is consistent
    return `${opening}${string.split(CLOSING_CODE).join(opening)}${CLOSING_CODE}`;
}

export const Logger = {
    log(...message: unknown[]): void {
        const date = new Date();

        console.log(
            styleText(`[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}]`, ColorStyles.foreground.blue.bright),
            ...message
        );
    },
    warn(...message: unknown[]): void {
        this.log(styleText("[WARNING]", ColorStyles.foreground.yellow.normal), ...message);
    },
    error(...message: unknown[]): void {
        this.log(styleText("[ERROR]", ColorStyles.foreground.red.normal), ...message);
    }
};
