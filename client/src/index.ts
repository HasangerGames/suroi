import "../../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import { Game } from "./scripts/game";
import "./scss/pages/client.scss";
import { AccountVisibility } from "./accountVisibility";
import { LoginBtn } from "./loginBtn";
import { ToMyStats } from "./myStats";
void Game.init();



document.addEventListener("DOMContentLoaded",()=>{
LoginBtn();
AccountVisibility();
ToMyStats();
})



