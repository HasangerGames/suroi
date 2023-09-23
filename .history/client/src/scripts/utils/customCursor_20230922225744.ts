import $ from "jquery";

export const cursorDimensions = {
    width: 100,
    height: 100
};

export function enableCustomCursor(): void {
    $("#game-ui").on("mousemove", (e) => {
        const customCursor = $("#custom-cursor");
        customCursor.css({
            display: "block",
            position: "relative"
        });
        customCursor.css({
            top: e.pageY - cursorDimensions.height / 2,
            left: e.pageX - 50
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
