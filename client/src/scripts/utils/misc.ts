declare global {
    interface Element {
        requestFullscreen: (options?: FullscreenOptions) => Promise<void>
        webkitRequestFullScreen?: (options?: FullscreenOptions) => Promise<void>
    }
}

export function requestFullscreen(): void {
    const elem = document.documentElement;

    if (typeof elem.requestFullscreen === "function") {
        void elem.requestFullscreen().catch();
    } else if (typeof elem.webkitRequestFullScreen === "function") {
        void elem.webkitRequestFullScreen().catch();
    }
}

export function formatDate(seconds: number): string {
    const date = new Date(seconds * 1000);
    let timeString = "";
    const minutes = date.getMinutes();
    if (minutes > 0) timeString += `${minutes}m`;
    timeString += `${date.getSeconds()}s`;

    return timeString;
}

export function stringify(val: unknown): string {
    /* eslint-disable */
    switch (typeof val) {
        case "string":
        case "number":
        case "undefined":
        case "object":
        case "boolean": return String(val);
        case "bigint": return `${val}n`;
        case "symbol": return val.toString();
        case "function": return `function ${val.name}(${Array.from({ length: val.length }, (_, i) => `arg${i}`).join(", ")}) -> any`;
    }
    /* eslint-enable */
}

export function html(a: TemplateStringsArray, ...b: ReadonlyArray<string | number | bigint | null | undefined>): string {
    let buffer = "";
    const length = a.length;
    for (let i = 0; i < length; i++) {
        // shut the fuck up
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        buffer += (a[i] ?? "") + (b[i] ?? "");
    }
    return buffer;
}

export const allowedTags = Object.freeze([
    // Headings
    "h1", "h2", "h3", "h4", "h5", "h6",

    // Text stuff
    "blockquote", "p", "pre", "span",

    // List stuff
    "li", "ol", "ul",

    // Inline elements
    "a", "em", "b", "bdi", "br", "cite", "code", "del", "ins",
    "kbd", "mark", "q", "s", "samp", "small", "span", "strong",
    "sub", "sup", "time", "u", "var",

    // Detail & summary
    "details", "summary",

    // Table stuff
    "caption", "col", "colgroup", "table", "tbody", "td", "tfoot",
    "th", "thead", "tr"
]);

export function sanitizeHTML(
    message: string,
    opts?: {
        readonly strict: boolean
        readonly escapeSpaces?: boolean
        readonly escapeNewLines?: boolean
    }
): string {
    return message.replace(
        /<\/?.*?>/g,
        match => !opts?.strict && allowedTags.includes(
            match.replace(/<\/?|>/g, "").split(" ")[0]
        )
            ? match
            : match
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
    ).replace(
        / {2,}/g,
        match => opts?.escapeSpaces
            ? match.replace(/ /g, "&nbsp;")
            : match
    ).replace(
        /\n/g,
        match => opts?.escapeNewLines
            ? "<br>"
            : match
    );
}
