import $ from "jquery";

function enableCustomCursor() {
    $("#game-ui").on("mousemove", (e) => {
        $("#custom-cursor").css({
            display: 
            top: e.pageY,
            left: e.pageX,
        });
    });
};

function disableCustomCursor: {
    
};