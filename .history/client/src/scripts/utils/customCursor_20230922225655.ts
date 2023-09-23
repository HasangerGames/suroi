import $ from "jquery";

export function enableCustomCursor(): void {
    $("#game-ui").on("mousemove", (e) => {
        const customCursor = $("#custom-cursor");
        customCursor.css({
            display: "block",
            position: "relative"
        });
        customCursor.css({
            top: e.pageY - 50,
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
