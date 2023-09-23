import $ from "jquery";

function enableCustomCursor() {
    $("#game-ui").on("mousemove", (e) => {
        $("#custom-cursor").css({
            display: "block",
            top: e.pageY,
            left: e.pageX,
        });
    });
};

function disableCustomCursor: {
    $("#game-ui").on("mousemove", (e) => {
};