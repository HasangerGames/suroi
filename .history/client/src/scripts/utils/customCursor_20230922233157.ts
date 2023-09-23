import $ from "jquery";

export const cursorDimensions = {
    width: 24,
    height: 24
};

export function enableCustomCursor(): void {
    const customCursor = $("#custom-cursor");
    customCursor.css({
        display: "block",
        position: "absolute"
    });
    $(".btn").css({
        cursor: "none !important !important"
    });
    $("#game-ui").on("mousemove", (e) => {
        customCursor.css({
            top: e.pageY - cursorDimensions.height / 2,
            left: e.pageX - cursorDimensions.width / 2
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
