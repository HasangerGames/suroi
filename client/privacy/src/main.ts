import "../../src/scss/pages/news.scss";
import "../../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import PrivacyPolicy from "./PrivacyPolicy.svelte";
import { mount } from "svelte";
import { createDropdown } from "../../src/scripts/uiHelpers";

createDropdown("#splash-more");

mount(PrivacyPolicy, {
    // This element should always be present unless someone who lacks braincells has been authorized to make changes to the codebase.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    target: document.getElementById("news-articles")!
});
