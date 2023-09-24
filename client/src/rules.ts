import $ from "jquery";

import { rules } from "./scripts/news/rulePosts";
import { processPost } from "./scripts/news/newsHelper";

import "../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../node_modules/@fortawesome/fontawesome-free/css/solid.css";

import "./scss/pages/client.scss";
import "./scss/pages/news.scss";
import { createDropdown } from "./scripts/ui";

$(() => {
    createDropdown("#splash-more");
    $("#news-articles").html(rules.map(processPost).join(""));
});
