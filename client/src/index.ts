import "./scss/pages/client.scss";
import "../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../node_modules/@fortawesome/fontawesome-free/css/solid.css";

import { Game } from "./scripts/game";

void (async() => {
    // eslint-disable-next-line no-new
    new Game();
})();
