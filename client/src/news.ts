import $ from "jquery";
import "../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import { processPost } from "./scripts/news/newsHelper";
import { news } from "./scripts/news/newsPosts";
import { createDropdown } from "./scripts/uiHelpers";
import "./scss/pages/client.scss";
import "./scss/pages/news.scss";

$(() => {
    createDropdown("#splash-more");
    $("#news-articles").html(news.map(processPost).join(""));
});
