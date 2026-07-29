<script lang="ts">
  import { onMount } from "svelte";
  import { asset } from "$app/paths";
  import Icon from "$lib/components/Icon.svelte";
  import { m } from "$lib/paraglide/messages";
  import { endGame } from "$lib/scripts/ui/menu.svelte";
  import { requestFullscreen } from "$lib/scripts/utils/misc";
  import { gameUi } from "./GameUi.svelte.ts";

  onMount(async() => {
    const { Game } = await import("$lib/scripts/game");
    if (!Game.initialized) {
      await Game.init();
    }
  });
</script>

<!-- Console -->
<div id="console" class="floating-window" style="display: none">
  <div id="console-container" class="floating-window-container">
    <div id="console-header" class="floating-window-header">
      <span>Console</span>
      <button id="console-close" class="floating-window-close"><Icon src="lucide:x" /></button>
    </div>
    <div id="console-out"></div>
    <textarea id="console-in" autocapitalize="off" autocomplete="off" ></textarea>
  </div>
  <div id="console-autocmp" style="display: none"></div>
</div>

<!-- Debug Menu --->
<div id="debug-menu" class="floating-window" style="display: none;">
  <div id="debug-menu-container" class="floating-window-container">
    <div id="debug-menu-header" class="floating-window-header">
      <span>Debug Menu</span>
      <button id="debug-menu-close" class="floating-window-close" aria-label="Close"><Icon src="lucide:x" /></button>
    </div>
    <div id="debug-menu-content"></div>
  </div>
</div>

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
      <Icon src="lucide:x" />
    </button>

    <!-- Minimap, gas timer, mobile options, coordinate display, & spectating controls -->
    <div id="top-left-container">
      <!-- Minimap border -->
      <div id="minimap-border"></div>

      <!-- Mobile options menu -->
      <div id="mobile-options" style="display: none">
        <button id="btn-game-menu" class="btn btn-lg btn-primary"><Icon src="lucide:menu" size={5} /></button>
        <button id="btn-emotes" class="btn btn-lg btn-primary"><Icon src="lucide:smile" size={5} /></button>
        <button id="btn-toggle-ping" class="btn btn-lg btn-primary"><Icon src="lucide:radio-tower" size={5} /></button>
      </div>

      <!-- Gas timer & coordinate display -->
      <div id="gas-and-debug">
        <div id="gas-timer">
          <img id="gas-timer-image" src={asset("/img/misc/gas-waiting-icon.svg")} />
          <span id="gas-timer-text">0:00</span>
        </div>
        <div id="debug-hud">
          <div id="coordinates-hud">X: -- Y: -- Z: --</div>
        </div>
      </div>

      <!-- Spectating controls -->
      <div id="spectating-container">
        <button id="btn-spectate-previous" class="btn btn-lg btn-primary px-4!">
          <Icon src="lucide:arrow-left" />
        </button>
        <button id="btn-report" class="btn btn-lg btn-danger">{m.btn_report()}</button>
        <button id="btn-spectate-next" class="btn btn-lg btn-primary">
          <Icon src="lucide:arrow-right" />
        </button>
        <button id="btn-spectate-kill-leader" class="btn btn-lg btn-secondary">{m.spectate_kill_leader()}</button>
        <button id="btn-spectate-menu" class="btn btn-lg btn-secondary" onclick={endGame}>{m.btn_menu()}</button>
      </div>
    </div>

    <!-- Teammate indicators -->
    <div id="team-container"></div>

    <!-- Alive & kill counters, kill leader & killfeed -->
    <div class="ui-leaderboard">
      <!-- Kill leader -->
      <div id="ui-kill-leader">
        <div id="kill-leader-leader-container" class="flex gap-2 items-center">
          <span id="kill-leader-leader">{m.msg_waiting_for_leader()}</span>
          <Icon src="lucide:crown" />
          <span id="kill-leader-kills-counter">0</span>
        </div>
      </div>

      <!-- Alive & kill counters -->
      <div id="counter-holder">
        <div class="counter" id="kill-counter">
          <img src={asset("/img/misc/skull_icon.svg")} />
          <div class="counter-text" id="ui-kills">0</div>
        </div>
        <div class="counter">
          <Icon src="suroi:player" size={10} />
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
        <span>{m.msg_spectating()}</span> <span id="spectating-msg-player"></span>
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
        <span>{m.recording()}</span>
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
      <img class="item-image" src={asset("/img/misc/c4-explode.svg")} draggable="false">
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
        <img id="chicken-dinner" src={asset("/img/game/emotes/chicken_dinner.svg")}>
        <h1 id="game-over-text" class="modal-item">{m.msg_you_died()}</h1>
        <div id="game-over-rank-and-team-kills-holder">
          <div id="game-over-rank-container">
            <span>{m.msg_your_rank()}</span>
            <span id="game-over-rank" class="modal-item"></span>
          </div>
          <div id="game-over-team-kills-container">
            <span id="game-over-team-kills">{m.msg_kills()}</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div id="player-game-over-cards"></div>

      <!-- Buttons -->
      <div class="modal-item" id="game-over-buttons-holder">
        <button class="btn btn-lg btn-darken btn-primary" id="btn-menu" onclick={endGame}>{m.btn_menu()}</button>
        <button class="btn btn-lg btn-darken btn-secondary" id="btn-spectate">{m.spectate()}</button>
      </div>
    </div>
  </div>

  <!-- Game canvas, where the rendering happens -->
  <canvas id="game-canvas"></canvas>
</div>

<!-- "Pause" menu -->
{#if gameUi.activeModal === "gameMenu"}
  <div class="ui-container p-4 fixed top-1/2 left-1/2 -translate-1/2 w-xs flex flex-col gap-1 items-stretch *:button *:relative *:inline *:text-center">
    <button class="bg-gray-600" onclick={() => gameUi.activeModal = "settings"}>
      <Icon src="lucide:settings" class="absolute left-4" /> {m.settings()}
    </button>
    <button class="bg-gray-600" onclick={() => { requestFullscreen(); gameUi.activeModal = undefined; }}>
      <Icon src="lucide:maximize" class="absolute left-4" /> {m.fullscreen()}
    </button>
    <button class="bg-blue-600" onclick={() => gameUi.activeModal = undefined}>
      <Icon src="lucide:play" class="absolute left-4" /> {m.resume()}
    </button>
    <button class="bg-red-500" onclick={endGame}>
      <Icon src="lucide:square-arrow-right-exit" class="absolute left-4" /> {m.quit()}
    </button>
  </div>
{/if}

<!-- Report modal -->
<div class="modal dialog" id="report-modal" style="display: {gameUi.activeModal === "report" ? "unset" : "none"}">
  <div class="dialog-header">
    <h3><span style="font-weight: 600">{m.report_reporting()}</span><span id="reporting-name"></span></h3>
    <button class="dialog-close-btn" onclick={() => gameUi.activeModal = undefined}><Icon src="lucide:x" /></button>
  </div>
  <div id="report-modal-content">
    <div id="report-id-container">
      <span>{m.report_id()}</span>
      <span id="report-id"></span>
    </div>
    <span>{@html m.report_instructions()}</span>
  </div>
</div>

<!-- Game warn/ban message -->
<div class="modal dialog" id="warning-modal" style="display: {gameUi.activeModal === "warning" ? "unset" : "none"}">
  <div id="warning-modal-content">
    <h1 id="warning-modal-title"></h1>
    <p id="warning-modal-text"></p>
    <div id="warning-modal-agree-options" style="display: none">
      <br><br>
      <input type="checkbox" class="regular-checkbox" id="warning-modal-agree-checkbox">
      <label for="warning-modal-agree-checkbox">{m.punishment_warn_agreement()}</label>
      <br><br>
      <button class="btn btn-lg btn-darken btn-primary btn-disabled" id="warning-continue-btn" style="width: 100%"><strong>Continue</strong></button>
    </div>
  </div>
</div>

<!-- Settings menu -->
<div class="modal dialog ui-container bg-suroi-black-transparent" id="settings-menu" style="display: {gameUi.activeModal === "settings" ? "unset" : "none"}">
  <!-- Header -->
  <div class="dialog-header">
    <h3 class="text-xl font-bold flex items-center gap-2"><Icon src="lucide:settings" /> {m.settings()}</h3>
    <button class="dialog-close-btn" onclick={() => gameUi.activeModal = undefined}><Icon src="lucide:x" /></button>
  </div>

  <!-- Content -->
  <div id="settings-tabs-container">
    <!-- Tab buttons -->
    <div class="tab-bar *:flex *:items-center *:gap-2" id="settings-tab-bar">
      <button class="tab active" id="tab-volume"><Icon src="lucide:volume-2" /> {m.settings_volume()}</button>
      <button class="tab" id="tab-keybinds"><Icon src="lucide:keyboard" /> {m.settings_keybinds()}</button>
      <button class="tab" id="tab-graphics"><Icon src="lucide:monitor" /> {m.settings_graphics()}</button>
      <button class="tab" id="tab-cooler-graphics"><Icon src="lucide:wand-sparkles" /> {m.settings_cooler_graphics()}</button>
      <button class="tab" id="tab-interface"><Icon src="lucide:list" /> {m.settings_interface()}</button>
      <button class="tab" id="tab-mobile"><Icon src="lucide:tablet-smartphone" /> {m.settings_mobile()}</button>
      <button class="tab" id="tab-import-export"><Icon src="lucide:file-output" /> {m.settings_save_load()}</button>
    </div>

    <!-- Tabs -->
    <div id="settings-tabs" class="persistent-scrollbar bg-suroi-gray-transparent">
      <!-- Volume tab -->
      <div class="tab-content active" id="tab-volume-content">
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_master_volume()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0" id="slider-master-volume" step="0.1" value="1">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_sfx_volume()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0" id="slider-sfx-volume" step="0.1" value="1">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_ambience_volume()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0" id="slider-ambience-volume" step="0.1" value="1">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_music_volume()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0" id="slider-music-volume" step="0.1" value="1">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_old_menu_music()} <i>*</i></span>
            <input type="checkbox" id="toggle-old-music">
          </label>
        </div>
        <i class="text-red-600">{m.settings_require_reload()}</i>
      </div>

      <!-- Keybinds tab -->
      <div class="tab-content" id="tab-keybinds-content" style="display: none"></div>

      <!-- Graphics tab -->
      <div class="tab-content" id="tab-graphics-content" style="display: none">
        <div class="modal-item select-setting">
          <label>
            <span class="setting-title">{m.settings_render_mode()} <i>*</i></span>
            <select id="render-mode-select">
              <option value="webgl1">WebGL 1</option>
              <option value="webgl2">WebGL 2</option>
              <option value="webgpu" id="webgpu-option">WebGPU</option>
            </select>
          </label>
        </div>
        <div class="modal-item select-setting">
          <label>
            <span class="setting-title">{m.settings_render_resolution()} <i>*</i></span>
            <select id="render-res-select">
              <option value="auto">{m.settings_render_resolution_auto()}</option>
              <option value="0.5">0.5</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_hires_textures()} <i>*</i></span>
            <input type="checkbox" id="toggle-high-res">
          </label>
        </div>
        <div id="alt-texture-loading-item" class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_alt_texture_loading()} <i>*</i></span>
            <input type="checkbox" id="toggle-alt-texture-loading">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_ambient_particles()}</span>
            <input type="checkbox" id="toggle-ambient-particles">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_antialias()} <i>*</i></span>
            <input type="checkbox" id="toggle-antialias">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_movement_smoothing()}</span>
            <input type="checkbox" id="toggle-movement-smoothing">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_responsive_rotation()}</span>
            <input type="checkbox" id="toggle-responsive-rotation">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_camera_shake()}</span>
            <input type="checkbox" id="toggle-camera-shake">
          </label>
        </div>
        <div class="modal-item select-setting">
          <label>
            <span class="setting-title">{m.settings_record_res()}</span>
            <select id="record-res-select">
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="maximum">Maximum</option>
            </select>
          </label>
        </div>
        <i class="text-red-600">{m.settings_require_reload()}</i>
      </div>

      <!-- Cooler graphics tab -->
      <div class="tab-content" id="tab-cooler-graphics-content" style="display: none">
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_cooler_graphics()}</span>
            <input type="checkbox" id="toggle-cooler-graphics">
          </label>
        </div>
        <div class="modal-item checkbox-setting" style="margin-left: 20px;">
          <label>
            <span class="setting-title">{m.settings_explosion_shockwaves()}</span>
            <input type="checkbox" id="toggle-cooler-explosions">
          </label>
        </div>
        <div class="modal-item checkbox-setting" style="margin-left: 20px;">
          <label>
            <span class="setting-title">{m.settings_bullet_trail_bloom()}</span>
            <input type="checkbox" id="toggle-cooler-bullet-trails">
          </label>
        </div>
        <div class="modal-item checkbox-setting" style="margin-left: 20px;">
          <label>
            <span class="setting-title">{m.settings_blood_splatter()}</span>
            <input type="checkbox" id="toggle-cooler-blood">
          </label>
        </div>
        <div class="modal-item checkbox-setting" style="margin-left: 20px;">
          <label>
            <span class="setting-title">{m.settings_cooler_weapon_gas()}</span>
            <input type="checkbox" id="toggle-cooler-weapon-gas">
          </label>
        </div>
      </div>

      <!-- Interface tab -->
      <div class="tab-content" id="tab-interface-content" style="display: none">
        <div class="modal-item" id="ui-scale-container">
          <label>
            <span class="setting-title">{m.settings_interface_scale()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="2" min="0.1" id="slider-ui-scale" step="0.05">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_minimap_opacity()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0.1" id="slider-minimap-transparency" step="0.1">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_fs_map_opacity()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0.1" id="slider-big-map-transparency" step="0.1">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_hide_minimap()}</span>
            <input type="checkbox" id="toggle-hide-minimap">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_blur_splash()}</span>
            <input type="checkbox" id="toggle-blur-splash">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_hide_rules()}</span>
            <input type="checkbox" id="toggle-hide-rules">
          </label>
        </div>
        <div class="modal-item checkbox-setting" style="display: none">
          <label>
            <span class="setting-title">{m.settings_hide_qq()}</span>
            <input type="checkbox" id="toggle-hide-qq">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_warn_before_leaving()}</span>
            <input type="checkbox" id="toggle-leave-warning">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_show_fps()}</span>
            <input type="checkbox" id="toggle-fps">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_show_ping()}</span>
            <input type="checkbox" id="toggle-ping">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_show_inout()}</span>
            <input type="checkbox" id="toggle-inout">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_show_coordinates()}</span>
            <input type="checkbox" id="toggle-pos">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_anon_names()}</span>
            <input type="checkbox" id="toggle-anonymous-player">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_hide_emotes()}</span>
            <input type="checkbox" id="toggle-hide-emote">
          </label>
        </div>
        <div class="modal-item checkbox-setting" id="toggle-text-kill-feed-option">
          <label>
            <span class="setting-title">{m.settings_text_killfeed()}</span>
            <input type="checkbox" id="toggle-text-kill-feed">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_colored_weapon_slots()}</span>
            <input type="checkbox" id="toggle-colored-slots">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_weapon_compare()}</span>
            <input type="checkbox" id="toggle-weapon-comparison">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_weapon_compare_condensed()}</span>
            <input type="checkbox" id="toggle-weapon-comparison-condensed">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_scope_looping()}</span>
            <input type="checkbox" id="toggle-scope-looping">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_draw_hud()}</span>
            <input type="checkbox" id="toggle-draw-hud">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_autopickup()}</span>
            <input type="checkbox" id="toggle-autopickup">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_autopickup_dual_guns()}</span>
            <input type="checkbox" id="toggle-autopickup-dual-guns">
          </label>
        </div>
      </div>

      <!-- Import/Export tab -->
      <div class="tab-content" id="tab-import-export-content" style="display: none">
        <div class="modal-item">
          <button class="btn btn-darken btn-lg btn-secondary" id="import-settings-btn">
            <i class="fa-solid fa-file-import"></i>
            <span>{m.settings_load_settings()}</span>
          </button>
        </div>
        <div class="modal-item">
          <button class="btn btn-darken btn-lg btn-secondary" id="export-settings-btn">
            <i class="fa-solid fa-file-export"></i>
            <span>{m.settings_copy_settings()}</span>
          </button>
        </div>
        <div class="modal-item">
          <button class="btn btn-darken btn-lg btn-danger" id="reset-settings-btn">
            <Icon src="lucide:trash" />
            <span>{m.settings_reset_settings()}</span>
          </button>
        </div>
      </div>

      <!-- Mobile tab -->
      <div class="tab-content" id="tab-mobile-content" style="display: none">
        <i class="text-red-600">{m.settings_require_reload()}</i>
        <div class="modal-item">
          <button style="margin-bottom: 10px;" class="btn btn-lg btn-darken btn-secondary"
            onclick={() => location.reload()}><Icon src="lucide:refresh-cw" /> {m.settings_reload()}</button>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_mobile_controls()}</span>
            <input type="checkbox" id="toggle-mobile-controls">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_joystick_size()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="400" min="25" id="slider-joystick-size" step="25">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_joystick_opacity()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="1" min="0.1" id="slider-joystick-transparency" step="0.1">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">{m.settings_left_joystick_color()}</span>
            <input type="color" style="margin-right: 135px" id="left-joystick-color-picker">
          </label>
        </div>
        <div style="margin-top: 25px" class="modal-item">
          <label>
            <span class="setting-title">{m.settings_right_joystick_color()}</span>
            <input type="color" style="margin-right: 135px" id="right-joystick-color-picker">
          </label>
        </div>
        <div class="modal-item checkbox-setting" style="margin-top: 25px">
          <label>
            <span class="setting-title">{m.settings_gyro_angle()}</span>
            <span class="range-input-value"></span>
            <input type="range" max="45" min="0" id="slider-gyro-angle" step="1">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_switch_joysticks()}</span>
            <input type="checkbox" id="toggle-mobile-joysticks">
          </label>
        </div>
        <p style="color: red; font-size: 15px"><i id="mb-joystick-info"></i></p>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_autopickup()}</span>
            <input type="checkbox" id="toggle-auto-pickup">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_lock_joysticks()}</span>
            <input type="checkbox" id="toggle-mobile-joystick-lock">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_haptics()}</span>
            <input type="checkbox" id="toggle-haptics">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
              <span class="setting-title">{m.settings_shake_to_reload()}</span>
              <input type="checkbox" id="toggle-shake-to-reload">
          </label>
        </div>
        <div class="modal-item">
          <label>
              <span class="setting-title">{m.settings_shake_count()}</span>
              <span class="range-input-value"></span>
              <input type="range" max="10" min="2" id="slider-shake-count" step="1">
          </label>
        </div>
        <div class="modal-item">
          <label>
              <span class="setting-title">{m.settings_shake_force()}</span>
              <span class="range-input-value"></span>
              <input type="range" max="30" min="1" id="slider-shake-force" step="1">
          </label>
        </div>
        <div class="modal-item">
          <label>
              <span class="setting-title">{m.settings_shake_delay()}</span>
              <span class="range-input-value"></span>
              <input type="range" max="500" min="10" id="slider-shake-delay" step="10">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_hires_textures()} <i>*</i></span>
            <input type="checkbox" id="toggle-high-res-mobile">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">{m.settings_antialias()} <i>*</i></span>
            <input type="checkbox" id="toggle-antialias-mobile">
          </label>
        </div>
        <i class="text-red-600">{m.settings_performance_warning()}</i>
      </div>
    </div>
  </div>
</div>

<!-- Loadout menu -->
<div class="modal dialog persistent-scrollbar ui-container bg-suroi-black-transparent max-w-[826px]" style="display: {gameUi.activeModal === "loadout" ? "unset" : "none"}">
  <!-- Header -->
  <div class="dialog-header">
    <h3 class="text-xl font-bold flex items-center gap-2"><Icon src="lucide:shirt" /> {m.loadout()}</h3>
    <button class="dialog-close-btn" onclick={() => gameUi.activeModal = undefined}><Icon src="lucide:x" /></button>
  </div>

  <!-- Content -->
  <div id="customize-tabs-container">
    <!-- Tab buttons -->
    <div class="tab-bar *:flex *:items-center *:gap-2" id="customize-tab-bar">
      <button class="tab active" id="tab-skins"><Icon src="lucide:shirt" /> {m.loadout_skins()}</button>
      <button class="tab" id="tab-emotes"><Icon src="lucide:smile" /> {m.loadout_emotes()}</button>
      <button class="tab" id="tab-crosshairs"><Icon src="lucide:crosshair" /> {m.loadout_crosshairs()}</button>
      <button class="tab" id="tab-badges" style="display: none"><Icon src="lucide:badge" /> {m.loadout_badges()}</button>
      <button class="tab" id="tab-special" style="display: none"><Icon src="lucide:code" /> {m.loadout_special()}</button>
    </div>

    <!-- Tabs -->
    <div id="customize-tabs">
      <!-- Skins tab -->
      <div class="tab-content active" id="tab-skins-content">
        <div id="skins-list"></div>
      </div>

      <!-- Emotes tab -->
      <div class="tab-content" id="tab-emotes-content" style="display: none">
        <div id="emote-wheel-container">
          <div id="emote-customize-wheel">
            <div class="emote-top emote-display"></div>
            <div class="emote-right emote-display"></div>
            <div class="emote-bottom emote-display"></div>
            <div class="emote-left emote-display"></div>
            <div class="emote-extra1 emote-display">
              <Icon src="lucide:trash" class="remove-icon drop-shadow-lg" />
            </div>
            <div class="emote-extra2 emote-display">
              <Icon src="lucide:trash" class="remove-icon drop-shadow-lg" />
            </div>
          </div>
          <div id="emote-wheel-bottom">
            <div class="emote-win emote-display">
              <Icon src="lucide:crown" />
              <Icon src="lucide:trash" class="remove-icon drop-shadow-lg" />
            </div>
            <div class="emote-death emote-display">
              <Icon src="lucide:skull" />
              <Icon src="lucide:trash" class="remove-icon drop-shadow-lg" />
            </div>
          </div>
        </div>
        <div id="emotes-list"></div>
      </div>

      <!-- Crosshairs tab -->
      <div class="tab-content" id="tab-crosshairs-content" style="display: none;">
        <div id="crosshair-customize">
          <div id="crosshair-preview">
            <div id="crosshair-image"></div>
          </div>
          <div id="crosshair-controls">
            <span id="crosshair-controls-disabled" style="display: none">{m.loadout_crosshairs_default()}</span>
            <div class="modal-item">
              <label>
                <span class="setting-title">{m.loadout_crosshairs_size()}</span>
                <span class="range-input-value"></span>
                <input type="range" max="5" min="0.5" id="slider-crosshair-size" step="0.1">
              </label>
            </div>
            <div class="modal-item">
              <label>
                <span class="setting-title">{m.loadout_crosshairs_color()}</span>
                <input type="color" id="crosshair-color-picker" value="#000000">
              </label>
            </div>
            <div class="modal-item">
              <label>
                <span class="setting-title">{m.loadout_crosshairs_stroke_size()}</span>
                <span class="range-input-value"></span>
                <input type="range" max="0.2" min="0" id="slider-crosshair-stroke-size" step="0.005">
              </label>
            </div>
            <div class="modal-item">
              <label>
                <span class="setting-title">{m.loadout_crosshairs_stroke_color()}</span>
                <input type="color" id="crosshair-stroke-picker" value="#000000">
              </label>
            </div>
          </div>
        </div>
        <div id="crosshairs-list"></div>
      </div>

      <!-- Badges tab -->
      <div class="tab-content" id="tab-badges-content" style="display: none">
        <div id="badges-list"></div>
      </div>

      <!-- Developer tab -->
      <div class="tab-content" id="tab-special-content" style="display: none;">
        <div class="modal-item">
          Note that the role you are inputting may not exist on the game server configuration.
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">Role Name:</span>
            <input type="text" class="text-field" id="role-name">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">Role Password:</span>
            <input type="password" class="text-field" id="role-password">
          </label>
        </div>
        <div class="modal-item">
          <button class="btn btn-primary btn-lg" onclick={() => window.location.reload()}>Login</button>
        </div>
        <div class="modal-item">
          Note that some of these settings may not be avaliable depending on game server configuration.
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">Name Color:</span>
            <input type="color" id="namecolor-color-picker" value="#000000">
          </label>
        </div>
        <div class="modal-item checkbox-setting">
          <label>
            <span class="setting-title">Developer Cheats</span>
            <input type="checkbox" id="toggle-lobbyclearing">
          </label>
        </div>
        <div class="modal-item">
          <label>
            <span class="setting-title">Weapon Preset:</span>
            <input type="text" class="text-field" id="weapon-preset" placeholder="USAGE: Gun1 Gun2 Melee" title="NOTE: Please use valid weapon ids from Guns.ts">
          </label>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Team menu -->
<div class="modal dialog persistent-scrollbar" id="create-team-menu" style="display: none">
  <div class="dialog-header">
    <h3 translation="create_team"></h3>
    <span class="dialog-close-btn fa-solid fa-xmark" id="close-create-team"></span>
  </div>
  <div id="create-team-container">
    <div id="create-team-players"></div>
    <div id="create-team-url">
      <button class="btn btn-lg btn-danger btn-darken" id="btn-hide-team-url">
        <i class="fa-solid fa-eye-slash"></i>
      </button>
      <input
        type="text"
        readonly
        id="create-team-url-field"
      />
      <button class="btn btn-lg btn-darken btn-secondary" id="btn-copy-team-url">
        <i class="fa-solid fa-clipboard"></i>
        <span translation="copy"></span>
      </button>
    </div>
    <div id="create-team-options">
      <div id="create-team-toggles">
        <label>
          <span class="setting-title" translation="create_team_autofill"></span>
          <input type="checkbox" id="create-team-toggle-auto-fill">
        </label>
        <label>
          <span class="setting-title" translation="create_team_lock"></span>
          <input type="checkbox" id="create-team-toggle-lock">
        </label>
        <label>
          <span class="setting-title" translation="create_team_force_start"></span>
          <input type="checkbox" id="create-team-toggle-force-start">
        </label>
      </div>
      <button class="btn btn-lg btn-darken btn-primary" id="btn-start-game">
        <span translation="create_team_play"></span>
      </button>
    </div>
  </div>
</div>

<!-- Partners modal -->
<div class="modal dialog" id="partners-modal" style="display: none">
  <div class="dialog-header">
    <h3 translation="partners"></h3>
    <span class="dialog-close-btn fa-solid fa-xmark" id="close-partners"></span>
  </div>
  <div id="partners-list" class="persistent-scrollbar">
    <a href="https://www.addictinggames.com" target="_blank">Addicting Games</a>
    <a href="https://best-io-games.com" target="_blank">best-io-games.com</a>
    <a href="https://www.brightestgames.com" target="_blank">Brightest Games</a>
    <a href="https://www.brightygames.com" target="_blank">BrightyGames.com</a>
    <a style="color:lightgreen;text-decoration:none">CrawMusic Records</a>
    <a href="https://iogames.games" target="_blank">iogames.games</a>
    <a href="https://io-games.onl" target="_blank">io-games.onl</a>
    <a href="https://io-games.onl" target="_blank">iogames.onl</a>
    <a href="https://iogamelist.com" target="_blank">iogamelist.com</a>
    <a href="https://iogameslist.co" target="_blank">iogameslist.co</a>
    <a href="https://io-game.com/en" target="_blank">io-game.com</a>
    <a href="https://iogame.games" target="_blank">iogame.games</a>
    <a href="https://iogame.io" target="_blank">iogame.io</a>
    <a href="https://iogame.me/en" target="_blank">iogame.me</a>
    <a href="https://iogames.fun" target="_blank">iogames.fun</a>
    <a href="https://iogames.onl" target="_blank">iogames.onl</a>
    <a href="https://www.jopi.com" target="_blank">Jopi</a>
    <a href="https://www.miniplay.com" target="_blank">Miniplay</a>
    <a href="https://onlinegames.io" target="_blank">OnlineGames.io</a>
    <a href="https://play-games.com" target="_blank">Play-Games.com</a>
    <a href="https://www.snokido.com" target="_blank">Snokido</a>
    <a href="https://titotu.io" target="_blank">Titotu.io</a>
    <a href="https://www.vitalitygames.com" target="_blank">Vitalitygames.com</a>
    <a href="https://wackagames.com" target="_blank">WackaGames</a>
  </div>
  <div id="partners-contact">
    <span translation="msg_contact"></span>
    <a class="btn btn-primary" href="mailto:support@suroi.io" translation="contact"></a>
  </div>
</div>

<style lang="scss">
  @use "./scss/pages/client.scss";

  #splash-ui, #game {
    opacity: 0;
  }
</style>