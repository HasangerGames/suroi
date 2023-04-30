<script>
    import { Router, Route } from "svelte-routing";

    import Client from "./Client/index.svelte";

    import "bootstrap";

    import "./assets/scss/main.scss";

    export let url = "";
</script>

<Router url="{url}">
    <Route path="/">
        <Client />
    </Route>
</Router>
