import "./editor.scss";
import App from "./App.svelte";

const app = new App({
    // This element should always be present unless someone who lacks braincells has been authorized to make changes to the codebase.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    target: document.getElementById("app")!
});

export default app;
