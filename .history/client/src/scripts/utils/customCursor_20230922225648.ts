import $ from "jquery";

export function enableCustomCursor(): void {
    $("#game-ui").on("mousemove", (e) => {
        const customCursor = $("#custom-cursor");
        customCursor.css({
            display: "block",
            position: "relative"
        });
        customCursor.css({
            top: e.pageY - ,
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
