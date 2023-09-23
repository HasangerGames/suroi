import $ from "jquery";

function enableCustomCursor() {
    $("#game-ui").on("mousemove", (e) => {
        $("#custom-cursor").css({
            top: e.pageY,
            left: e.pageX,
        });
    });
};

function disableCustomCursor: {
    
};