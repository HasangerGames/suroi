import "../../src/dropdown";
import News from "./News.svelte";
import { mount } from "svelte";

mount(News, {
    // This element should always be present unless someone who lacks braincells has been authorized to make changes to the codebase.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    target: document.getElementById("news-articles")!
});
