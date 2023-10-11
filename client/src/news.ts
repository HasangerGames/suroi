import $ from "jquery";

import { news } from "./scripts/news/newsPosts";
import { processPost } from "./scripts/news/newsHelper";

import "../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../node_modules/@fortawesome/fontawesome-free/css/solid.css";

import "./scss/pages/client.scss";
import "./scss/pages/news.scss";
import { createDropdown } from "./scripts/uiHelpers";

$(() => {
    createDropdown("#splash-more");
    $("#news-articles").html(news.map(processPost).join(""));
});
