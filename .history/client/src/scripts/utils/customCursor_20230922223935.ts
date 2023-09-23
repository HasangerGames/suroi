import $ from "jquery";

export function enableCustomCursor(): void {
    $("#game-ui").on("mousemove", (e) => {
        const customCursor = $("#custom-cursor");
        customCursor.css({
            display: "block",
            top: e.pageY,
            left: e.pageX
        });
    });
}

export function disableCustomCursor(): void {
    $("#game-ui").off("mousemove");
    const customCursor = $("#custom-cursor");
    customCursor.css({
        display: "none"
    });
}

// Define types for jQuery elements
declare global {
    interface JQuery {
        css(properties: any): JQuery;
    }
}

// You can also create custom types for your elements, for example:
interface CustomCursorElement extends JQuery {
    // Add custom properties or methods here if needed
}

// Usage example:
const customCursor: CustomCursorElement = $("#custom-cursor");
