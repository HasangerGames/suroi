import $ from "jquery";

import { news } from "./scripts/news/newsPosts";
import { processPost } from "./scripts/news/newsHelper";

import "../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../node_modules/@fortawesome/fontawesome-free/css/solid.css";

import "./scss/pages/client.scss";
import "./scss/pages/news.scss";

$(() => {
    const body = $(document.body);
    const dropdown = {
        main: $("#splash-more .dropdown-content"),
        caret: $("#btn-dropdown-more i"),
        active: false,
        show() {
            this.active = true;
            this.main.addClass("active");
            this.caret.removeClass("fa-caret-down").addClass("fa-caret-up");
        },
        hide() {
            this.active = false;
            this.main.removeClass("active");
            this.caret.addClass("fa-caret-down").removeClass("fa-caret-up");
        },
        toggle() {
            this.active
                ? this.hide()
                : this.show();
        }
    };

    // todo find a better way to do these two handlers
    $("#btn-dropdown-more").on("click", ev => {
        dropdown.toggle();
        ev.stopPropagation();
    });

    body.on("click", () => { dropdown.hide(); });

    $("#news-articles").html(news.map(processPost).join(""));
});
