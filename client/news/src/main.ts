import "../../src/dropdown";
import News from "./News.svelte";
import { mount } from "svelte";

mount(News, {
    // biome-ignore lint/style/noNonNullAssertion: This element should always be present unless someone who lacks braincells has been authorized to make changes to the codebase.
    target: document.getElementById("news-articles")!
});
