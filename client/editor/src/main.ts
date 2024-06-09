import "./editor.scss";
import App from "./App.svelte";

const app = new App({
    // we're just kinda praying
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    target: document.getElementById("app")!
});

export default app;
