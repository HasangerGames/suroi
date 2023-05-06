import $ from "jquery";

import { Game } from "./game";

declare const API_URL: string;

$(() => {
    // Play button logic
    $("#playBtn").on("click", () => {
        void $.get(`${API_URL}/getGame`, data => {
            /* eslint-disable-next-line no-new */
            new Game(data.addr);
        });
    });

    // Dropdown toggle logic
    $(".btn-dropdown-more").on("click", () => {
        $("#dropdownMore").toggleClass("dropdown-more-show");
        $(".fa-solid.fa-caret-down").toggleClass("fa-caret-up");
    });

    // Close the dropdown menu when user clicks outside it
    $(document.body).on("click", (event: JQuery.ClickEvent<HTMLElement>) => {
        if (!(event.target as HTMLElement).matches(".btn-dropdown-more")) {
            $(".dropdown-more-content").removeClass("dropdown-more-show");
        }
    });
});
