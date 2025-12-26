import "../../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import { Game } from "./scripts/game";
import "./scss/pages/client.scss";

void Game.init();

import { initAuthFormSimpleToggle } from "./formToggle";

document.addEventListener("DOMContentLoaded", () => {
  initAuthFormSimpleToggle();
});


import { initPasswordVisibility } from "./toggleVisibility";

document.addEventListener("DOMContentLoaded", () => {
  initPasswordVisibility();
});

