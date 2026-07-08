<script lang="ts">
  import { Color } from "pixi.js";
  import type { ModeName } from "$common/definitions/modes";
  import { Config } from "$lib/scripts/config";
  import { GameConsole } from "$lib/scripts/console/gameConsole";
  import { Game } from "$lib/scripts/game";
  import { spritesheetLoadPromise } from "$lib/scripts/utils/pixi";

  await Game.init();

      const joinGame = async(): Promise<void> => {
        const selectedRegion = Config.regions.dev;
        const teamID = undefined;
        const autoFill = false;
        if (
            Game.gameStarted
            || Game.connecting
            || selectedRegion === undefined // shouldn't happen
        ) return;

        Game.connecting = true;

        type GetGameResponse = { success: true, gameID: number, mode: ModeName } | { success: false };
        let response: GetGameResponse | undefined;
        try {
            const [res] = await Promise.all([
                fetch(`${selectedRegion.mainAddress}/api/getGame${teamID ? `?teamID=${teamID}` : ""}`),
                spritesheetLoadPromise()
            ]);
            if (res.ok) response = await res.json() as GetGameResponse;
        } catch (e) {
            console.error("Error finding game. Details:", e);
        }

        if (!response?.success) {
            Game.connecting = false;
            return;
        }

        if (response?.mode !== Game.modeName) {
            alert(`Mode mismatch: expected ${Game.modeName}, but server is on ${response.mode}`);
            location.reload();
            return;
        }

        const params = new URLSearchParams();

        if (teamID) params.set("teamID", teamID);
        if (autoFill) params.set("autoFill", String(autoFill));

        const devPass = GameConsole.getBuiltInCVar("dv_password");
        if (devPass) params.set("password", devPass);

        const role = GameConsole.getBuiltInCVar("dv_role");
        if (role) params.set("role", role);

        const lobbyClearing = GameConsole.getBuiltInCVar("dv_lobby_clearing");
        if (lobbyClearing) params.set("lobbyClearing", "true");

        const weaponPreset = GameConsole.getBuiltInCVar("dv_weapon_preset");
        if (weaponPreset) params.set("weaponPreset", weaponPreset);

        const nameColor = GameConsole.getBuiltInCVar("dv_name_color");
        if (nameColor) {
            try {
                params.set("nameColor", new Color(nameColor).toNumber().toString());
            } catch (e) {
                GameConsole.setBuiltInCVar("dv_name_color", "");
                console.error(e);
            }
        }

        Game.connect(`${selectedRegion.gameAddress.replace("<gameID>", (response.gameID + selectedRegion.offset).toString())}/play?${params.toString()}`);
    };
    await joinGame();
</script>

<!-- Game UI -->
<div id="game">
  <div id="game-ui">
    <!-- Mobile joysticks containers -->
    <div id="joysticks-containers">
      <div id="left-joystick-container"></div>
      <div id="right-joystick-container"></div>
    </div>

    <!-- Button to close minimap -->
    <button
      class="btn btn-lg btn-primary"
      id="btn-close-minimap"
      style="display: none"
    >
      <i class="fa-solid fa-close"></i>
    </button>

    <!-- Minimap, gas timer, mobile options, coordinate display, & spectating controls -->
    <div id="top-left-container">
      <!-- Minimap border -->
      <div id="minimap-border"></div>

      <!-- Mobile options menu -->
      <div id="mobile-options" style="display: none">
        <button id="btn-game-menu" class="btn btn-lg btn-primary fa-solid fa-bars"></button>
        <button id="btn-emotes" class="btn btn-lg btn-primary">
          <img src="./img/misc/emotes_icon.svg"/>
        </button>
        <button id="btn-toggle-ping" class="btn btn-lg btn-primary fa-solid fa-tower-broadcast"></button>
      </div>

      <!-- Gas timer & coordinate display -->
      <div id="gas-and-debug">
        <div id="gas-timer">
          <img id="gas-timer-image" src="./img/misc/gas-waiting-icon.svg" />
          <span id="gas-timer-text">0:00</span>
        </div>
        <div id="debug-hud">
          <div id="coordinates-hud">X: -- Y: -- Z: --</div>
        </div>
      </div>

      <!-- Spectating controls -->
      <div id="spectating-container">
        <button id="btn-spectate-previous" class="btn btn-lg btn-primary">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <button id="btn-report" class="btn btn-lg btn-danger" translation="btn_report">
        </button>
        <button id="btn-spectate-next" class="btn btn-lg btn-primary">
          <i class="fa-solid fa-arrow-right"></i>
        </button>
        <button id="btn-spectate-kill-leader" class="btn btn-lg btn-secondary" translation="btn_spectate_kill_leader"></button>
        <button id="btn-spectate-replay" class="btn btn-lg btn-primary" translation="btn_play_again"></button>
        <button id="btn-spectate-menu" class="btn btn-lg btn-secondary" translation="btn_menu"></button>
      </div>
    </div>

    <!-- Teammate indicators -->
    <div id="team-container"></div>

    <!-- Alive & kill counters, kill leader & killfeed -->
    <div class="ui-leaderboard">
      <!-- Kill leader -->
      <div id="ui-kill-leader">
        <div id="kill-leader-leader-container">
          <span id="kill-leader-leader" translation="msg_waiting_for_leader"></span>
          <i
            class="fa-solid fa-crown"
            style="margin-left: 5px; margin-right: 5px"
          ></i>
          <span id="kill-leader-kills-counter">0</span>
        </div>
      </div>

      <!-- Alive & kill counters -->
      <div id="counter-holder">
        <div class="counter" id="kill-counter">
          <img src="./img/misc/skull_icon.svg" />
          <div class="counter-text" id="ui-kills">0</div>
        </div>
        <div class="counter">
          <img src="./img/misc/player_icon.svg" />
          <div class="counter-text" id="ui-players-alive">1</div>
        </div>
      </div>

      <div id="kill-feed"></div>
    </div>

    <!-- Action timer -->
    <div id="action-container" style="display: none">
      <div id="action-timer">
        <h2 id="action-time">0.0</h2>
        <svg
          id="action-timer-anim"
          width="160"
          height="160"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            r="36"
            cy="81"
            cx="81"
            stroke="#ffffff"
            stroke-width="7"
            stroke-dasharray="226"
            fill="#16161675"
          />
        </svg>
      </div>
      <div id="action-name"></div>
    </div>

    <!-- Interact message -->
    <div id="interact-message" style="display: none">
      <div id="interact-header">
        <kbd id="interact-key"></kbd>
        <span id="interact-text"></span>
      </div>
      <div id="weapon-comparison">
        <div id="weapon-comparison-list"></div>
      </div>
    </div>

    <!-- Inventory messages, active weapon ammo counters, health & adrenaline bar, & killstreak display -->
    <div id="center-bottom-container">
      <!-- Inventory messages -->
      <span id="inventory-message" style="display: none;"></span>

      <!-- Active weapon ammo counters -->
      <div id="weapon-ammo-container" style="display: none">
        <div id="weapon-clip-ammo">
          <span id="weapon-clip-ammo-count"></span>
          <i id="weapon-clip-reload-icon" class="fa-solid fa-rotate-right" style="display: none"></i>
        </div>
        <div id="weapon-inventory-ammo"></div>
      </div>

      <!-- Adrenaline bar -->
      <div id="adrenaline-bar-container">
        <div id="adrenaline-bar"></div>
        <div id="adrenaline-bar-min-wrapper">
          <div id="adrenaline-bar-min"></div>
        </div>
        <span id="adrenaline-bar-amount"></span>
        <span id="adrenaline-bar-min-max"></span>
      </div>


      <!-- Health bar -->
      <div id="health-bar-container">
        <div id="shield-bar"></div>
        <div id="infection-bar"></div>
        <div id="health-bar-animation"></div>
        <div id="health-bar"></div>
        <span id="health-bar-amount"></span>
        <span id="health-bar-max"></span>
      </div>

      <!-- Killstreak display -->
      <div id="killstreak-indicator-container" style="display: none">
        <span id="killstreak-indicator-counter">Streak: 0</span>
      </div>
    </div>

    <!-- Scopes, name of spectating player, spectate controls toggle, gas messages, screen recording indicator -->
    <div id="center-top-container">
      <!-- Scopes -->
      <div class="inventory-container" id="scopes-container"></div>

      <!-- Name of player being spectated & spectate controls toggle -->
      <div id="spectating-msg">
        <span translation="msg_spectating"></span> <span id="spectating-msg-player"></span>
        <button id="btn-spectate-options" class="btn btn-lg btn-primary">
          <i id="btn-spectate-options-icon" class="fa-solid fa-eye-slash"></i>
        </button>
      </div>

      <!-- Gas messages -->
      <div id="gas-msg" style="display: none">
        <div id="gas-msg-info"></div>
      </div>

      <!-- Screen recording indicator -->
      <div id="recording-pill" style="display: none">
        <i class="fa-solid fa-video" style="margin-top: -2px"></i>
        <span translation="recording"></span>
        <span id="recording-time">0:00</span>
        <button id="stop-recording-button"><i class="fa-solid fa-stop"></i></button>
      </div>
    </div>

    <!-- Kill modal -->
    <div id="kill-msg" style="display: none">
      <div id="kill-msg-kills"></div>
      <div id="kill-msg-cont"></div>
    </div>

    <!-- Healing items -->
    <div class="inventory-container items-container" id="healing-items-container"></div>

    <!-- Ammo -->
    <div id="ammos-container">
      <div class="inventory-container items-container" id="special-ammo-container"></div>
      <div class="inventory-container items-container" id="ammo-container"></div>
    </div>

    <div id="c4-detonate-btn">
      <img class="item-image" src="./img/misc/c4-explode.svg" draggable="false">
      <div id="detonate-key"></div>
    </div>

    <!-- Equipment -->
    <div class="inventory-container" id="equipment-container">
      <div class="inventory-slot has-item" id="helmet-slot">
        <img class="item-image" draggable="false" />
        <span class="item-name"></span>
        <div class="item-tooltip"></div>
      </div>
      <div class="inventory-slot has-item" id="vest-slot">
        <img class="item-image" draggable="false" />
        <span class="item-name"></span>
        <div class="item-tooltip"></div>
      </div>
      <div class="inventory-slot has-item" id="backpack-slot">
        <img class="item-image" draggable="false" />
        <span class="item-name"></span>
        <div class="item-tooltip"></div>
      </div>
    </div>

    <!-- Perks -->
    <div class="inventory-container" id="perk-container">
      <!-- Slot 0 is intentionally in center -->
      <div class="perk-set">
        <div class="inventory-slot has-item" id="perk-slot-1">
          <img class="item-image" draggable="false" />
          <div class="item-tooltip"></div>
          <!-- <div class="item-timer"></div>
          <div class="item-timer-text"></div> -->
        </div>
        <div class="inventory-slot has-item" id="perk-slot-0">
          <img class="item-image" draggable="false" />
          <div class="item-tooltip"></div>
          <!-- <div class="item-timer"></div>
          <div class="item-timer-text"></div> -->
        </div>
        <div class="inventory-slot has-item" id="perk-slot-2">
          <img class="item-image" draggable="false" />
          <div class="item-tooltip"></div>
          <!-- <div class="item-timer"></div>
          <div class="item-timer-text"></div> -->
        </div>
      </div>
      <div class="perk-set">
        <div class="inventory-slot has-item" id="perk-slot-4">
          <img class="item-image" draggable="false" />
          <div class="item-tooltip"></div>
          <!-- <div class="item-timer"></div>
          <div class="item-timer-text"></div> -->
        </div>
        <div class="inventory-slot has-item" id="perk-slot-3">
          <img class="item-image" draggable="false" />
          <div class="item-tooltip"></div>
          <!-- <div class="item-timer"></div>
          <div class="item-timer-text"></div> -->
        </div>
        <div class="inventory-slot has-item" id="perk-slot-5">
          <img class="item-image" draggable="false" />
          <div class="item-tooltip"></div>
          <!-- <div class="item-timer"></div>
          <div class="item-timer-text"></div> -->
        </div>
      </div>
    </div>

    <!-- Weapons -->
    <div class="inventory-container" id="weapons-container"></div>

    <!-- Game over screen -->
    <div id="game-over-overlay" style="display: none">
      <!-- Win/death message -->
      <div id="game-over-top-screen">
        <img id="chicken-dinner" src="./img/game/emotes/chicken_dinner.svg">
        <h1 id="game-over-text" class="modal-item" translation="msg_you_died"></h1>
        <div id="game-over-rank-and-team-kills-holder">
          <div id="game-over-rank-container">
            <span translation="msg_your_rank"></span>
            <span id="game-over-rank" class="modal-item"></span>
          </div>
          <div id="game-over-team-kills-container">
            <span id="game-over-team-kills" translation="msg_kills"></span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div id="player-game-over-cards"></div>

      <!-- Buttons -->
      <div class="modal-item" id="game-over-buttons-holder">
        <button class="btn btn-lg btn-darken btn-primary" id="btn-play-again" translation="btn_play_again"></button>
        <div style="display: flex; gap: 8px">
          <button class="btn btn-lg btn-darken btn-primary" id="btn-spectate" translation="btn_spectate"></button>
          <button class="btn btn-lg btn-darken btn-secondary" id="btn-menu" translation="btn_menu"></button>
        </div>
      </div>
    </div>
  </div>

  <!-- Game canvas, where the rendering happens -->
  <canvas id="game-canvas"></canvas>
</div>
