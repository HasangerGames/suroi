import $ from "jquery";
import { Game } from "./game";

$(document).ready(() => {
    $("#playBtn").click(() => {
        $.get("/getGame", data => {
            new Game(data.addr);
        });
    });
});
