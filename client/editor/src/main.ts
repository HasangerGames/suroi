import "./editor.scss";
import App from "./App.svelte";

const app = new App({
    // we're just kinda praying

    target: document.getElementById("app")!
});

export default app;
