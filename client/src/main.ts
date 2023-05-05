import $ from "jquery";
import { Game } from "./game";
import "../css/main.css";
import "../font/inter.css";
$(() => {

    // Play button logic
    $("#playBtn").on("click", () => {
        $.get("/getGame", data => {
            new Game(data.addr);
        });
    });

    // Dropdown toggle logic
    $(".btn-dropdown-more").on("click", () => {
        $("#dropdownMore").toggleClass("dropdown-more-show");
        $(".fa-solid.fa-caret-down").toggleClass("fa-caret-up");
    });

    // Close the dropdown menu when user clicks outside it
    $(document.body).on("click", function(event: JQuery.ClickEvent<HTMLElement>){
        if(!event.target.matches(".btn-dropdown-more")) {
            $(".dropdown-more-content").removeClass("dropdown-more-show");
        }
    });
});
