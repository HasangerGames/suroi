<script lang="ts" module>
  import { Color, isWebGLSupported } from "pixi.js";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { fade, slide } from "svelte/transition";
  import { browser } from "$app/env";
  import { invalidate } from "$app/navigation";
  import { asset } from "$app/paths";
  import { GAME_VERSION, GameConstants } from "$common/constants";
  import { getBadgeIdString, isEmoteBadge } from "$common/definitions/emotes";
  import { GameModes } from "$common/definitions/gameModes";
  import { GameMode, Region, TeamMode } from "$common/schemas/misc";
  import { CustomTeamMessages } from "$common/typings";
  import Icon from "$lib/components/Icon.svelte";
  import Nav from "$lib/components/Nav.svelte";
  import Skin from "$lib/components/Skin.svelte";
  import GameUi from "$lib/legacy/GameUi.svelte";
  import { gameUi } from "$lib/legacy/GameUi.svelte.ts";
  import { m } from "$lib/paraglide/messages";
  import { randomMarqueeText } from "$lib/scripts/data/marqueeTexts";
  import { CustomTeamManager } from "$lib/scripts/managers/customTeamManager.svelte";
  import { Config } from "$lib/scripts/utils/config";
  import { LegacyBridge } from "$lib/scripts/utils/legacyBridge";
  import { millisToTime } from "$lib/scripts/utils/misc";

  export const MenuUi = new (class MenuUi {
    state = $state<"menu" | "connecting" | "inGame">("menu");

    skinIdString = $state(GameConstants.player.defaultSkin);

    nickname = $state<string>();
    nicknameEditMode = $state(false);
    nicknameField = $state<HTMLSpanElement>();

    marqueeText = $state<string>();

    noBlur = $state<boolean>();

    connectingText = $state<string>();
    serverError = $state<string>();

    newRegion = $state<Region>(Config.defaultRegion);
    newGameMode = $state<GameMode>("normal");
    newTeamMode = $state<TeamMode>("solo");

    selectedGameId = $state<string>();

    playButtonText = $derived((() => {
      if (CustomTeamManager.isLeader && CustomTeamManager.forceStart) {
        return m.create_team_play();
      } else if (CustomTeamManager.ready) {
        return m.create_team_not_ready();
      } else if (CustomTeamManager.teamId !== undefined) {
        return m.create_team_ready();
      } else {
        return m.play();
      }
    })());
  })();
</script>

<script lang="ts">
  let { data } = $props();
  $effect(() => {
    Object.assign(MenuUi, data);
  });

  function gameModeStyle(gameMode: GameMode | "any"): string | undefined {
    if (gameMode === "any") return;

    const { menu } = GameModes[gameMode];
    if ("colors" in menu) {
      return `background: radial-gradient(circle, ${menu.colors[0]}, ${menu.colors[1]})`;
    } else {
      return `background-color: ${menu.color}`;
    }
  }

  $effect(() => {
    if (MenuUi.nicknameEditMode) {
      MenuUi.nicknameField?.focus();
    } else {
      if (LegacyBridge.setBuiltInCVar === undefined) return;

      MenuUi.nickname = (MenuUi.nickname ?? "")
        // Replace fancy quotes & dashes, so they don't get stripped out
        .replace(/[\u201c\u201d\u201f]/g, '"')
        //         |  “  |  ”  |  ‟  |

        .replace(/[\u2018\u2019\u201b]/g, "'")
        //         |  ‘  |  ’  |  ‛  |

        .replace(/[\u2013\u2014]/g, "-")
        //         |  –  |  —  |

        // Strip out non-ASCII chars and the C0/C1 control characters
        .replace(/[^\x20-\x7E]/g, "")
        // Strip out newlines
        .replace("\n", "");

      if (MenuUi.nickname.trim().length === 0) {
        MenuUi.nickname = GameConstants.player.defaultName;
      }

      MenuUi.nickname = MenuUi.nickname.slice(0, GameConstants.player.nameMaxLength);
      LegacyBridge.setBuiltInCVar("cv_player_name", MenuUi.nickname);
    }
  });
</script>

{#if MenuUi.state !== "inGame"}
  <div transition:fade class="absolute bottom-0 left-0 z-1 w-screen h-screen flex flex-col items-center bg-cover bg-center" style="background-image: url({asset(`/img/backgrounds/menu/${data.background.filename}`)})">
    <div class="absolute top-0 left-0 w-full h-8 bg-linear-to-b from-suroi-gray from-70% to-transparent">
      <button type="button" class="marquee-content fixed top-0 text-sm font-bold cursor-pointer" onclick={() => MenuUi.marqueeText = randomMarqueeText()}>{@html MenuUi.marqueeText}</button>
    </div>

    <enhanced:img src={asset("/img/logos/suroi.svg")} alt="Suroi logo" class="mx-auto mt-10 mb-8 w-xl select-none" draggable="false" />

    <Nav />

    <div class="ui-container mx-auto flex flex-col items-center gap-3 p-5 relative">
      {#if MenuUi.state === "connecting"}
        <div transition:fade class="absolute w-full h-full bg-suroi-gray-transparent rounded-3xl -mt-6 z-2">
          <div class="bg-suroi-gray rounded-3xl z-2 absolute top-1/2 left-1/2 -translate-1/2 p-4 flex flex-col items-center justify-center w-fit">
            <div class="flex gap-2 items-center justify-center pr-5">
              <!-- TODO Replace with current skin -->
              <Skin idString="hasanger" class="scale-50 animate-spin [animation-duration:0.75s] origin-[calc(50%+6px)_50%]" />
              <strong class="w-max">{MenuUi.connectingText ?? ""}</strong>
            </div>
            <button type="button" class="button bg-blue-500" onclick={LegacyBridge.endGame}>{m.action_cancel()}</button>
          </div>
        </div>
      {/if}

      <!-- Error message from the server -->
      {#if MenuUi.serverError !== undefined}
        <div class="flex gap-2 items-center p-2 rounded-md font-bold bg-red-500/75" transition:slide>
          <Icon src="lucide:circle-alert" />
          {@html MenuUi.serverError}
          <Icon src="lucide:x" class="focusable clickable" onclick={() => MenuUi.serverError = undefined} />
        </div>
      {/if}

      <!-- Warning displayed if hardware acceleration is disabled or unavailable -->
      {#if browser && !isWebGLSupported(true)}
        <div class="flex gap-2 items-start p-2 rounded-md font-bold bg-yellow-500/75">
          <Icon src="lucide:triangle-alert" />
          <span>
            {m.warning_hw_accel_1()}<br>
            {m.warning_hw_accel_2()}<br>
            <a target="_blank" href="https://www.computerhope.com/issues/ch002154.htm" class="underline">{m.warning_hw_accel_link()}</a>
          </span>
        </div>
      {/if}

      <!-- Displays a message telling the user to rotate their device to landscape if it's in portrait -->
      {#if (innerWidth.current ?? 0) < (innerHeight.current ?? 0)}
        <div class="flex gap-2 p-2 rounded-md font-bold bg-suroi-gray/75">
          <Icon src="lucide:rotate-cw-square" />
          {m.msg_rotate()}
        </div>
      {/if}

      <div class="flex gap-3">
        {#snippet teamIcons(isLeader?: boolean, ready?: boolean, id = -1)}
          {#if ready}
            <Icon src="lucide:circle-check" class="absolute top-2 left-2 text-green-400" />
          {/if}
          {#if isLeader}
            <Icon src="lucide:crown" class="absolute top-2 right-2 text-yellow-400" />
          {:else if CustomTeamManager.isLeader}
            <Icon src="lucide:x" onclick={() => CustomTeamManager.sendMessage({ type: CustomTeamMessages.KickPlayer, id })} class="absolute top-2 right-2 focusable clickable" />
          {/if}
        {/snippet}

        <!-- Current player -->
        <div class="skin-container relative">
          {@render teamIcons(CustomTeamManager.isLeader, CustomTeamManager.ready)}
          <Skin idString={MenuUi.skinIdString} />
          <div class="flex items-center gap-2">
            <span
              bind:this={MenuUi.nicknameField}
              oninput={e => (e as unknown as InputEvent).inputType === "insertLineBreak" && (MenuUi.nicknameEditMode = false)}
              contenteditable={MenuUi.nicknameEditMode ? "plaintext-only" : "false"}
              placeholder="Player"
              class="text-lg text-shadow-lg font-bold focusable rounded-sm"
            >{MenuUi.nickname}</span>
            <Icon
              src={MenuUi.nicknameEditMode ? "lucide:check" : "lucide:pencil"}
              class="cursor-pointer hover:text-gray-400"
              onclick={() => MenuUi.nicknameEditMode = !MenuUi.nicknameEditMode}
            />
          </div>
        </div>

        <!-- List of players in custom team -->
        {#each CustomTeamManager.players as player}
          <div class="skin-container relative">
            {@render teamIcons(player.isLeader, player.ready)}
            <Skin idString={player.skin} />
            <div class="flex items-center gap-2">
              <span class="text-lg text-shadow-lg font-bold flex items-center gap-1" style={player.nameColor !== undefined ? `color: ${new Color(player.nameColor).toHex()};` : ""}>
                {player.name}
                {#if player.badge !== undefined}
                  <img draggable="false" src={asset(`./img/game/${isEmoteBadge(player.badge) ? "emotes" : "badges"}/${getBadgeIdString(player.badge)}.svg`)} width="24" alt="Badge" />
                {/if}
              </span>
            </div>
          </div>
        {/each}

        <!-- Custom team options -->
        <div class="skin-container [&>button]:px-2 [&>button]:py-1.5">
          {#if CustomTeamManager.teamId === undefined}
            <button type="button" class="button bg-purple-600" onclick={() => CustomTeamManager.connect()}>{m.create_team()}</button>
            <button type="button" class="button bg-purple-600" onclick={() => CustomTeamManager.joinTeam()}>{m.join_team()}</button>
          {:else}
            <label class="flex items-center gap-2 text-shadow-lg font-bold">
              {m.create_team_autofill()}
              <input type="checkbox" bind:checked={CustomTeamManager.autoFill} disabled={!CustomTeamManager.isLeader} class="toggle" />
            </label>
            <label class="flex items-center gap-2 text-shadow-lg font-bold">
              {m.create_team_force_start()}
              <input type="checkbox" bind:checked={CustomTeamManager.forceStart} disabled={!CustomTeamManager.isLeader} class="toggle" />
            </label>
            <button type="button" class="button bg-purple-600" onclick={() => CustomTeamManager.copyTeamLinkToClipboard()}><Icon src="lucide:copy" /> {m.copy_link()}</button>
            <button type="button" class="button bg-red-500" onclick={() => CustomTeamManager.leaveTeam()}><Icon src="lucide:log-out" /> {m.leave_team()}</button>
          {/if}
        </div>
      </div>

      <!-- Game selector -->
      <div class="w-full flex flex-col gap-3 max-h-96 px-2 py-1 overflow-y-scroll *:button *:select-none *:[&:has(>input:checked)]:ring-3 *:[&:has(>input:checked)]:ring-blue-300 *:[&:has(>input:disabled)]:brightness-60">
        <button class="bg-stone-600 justify-center" onclick={() => invalidate("app:games")}><Icon src="lucide:refresh-cw" /> {m.refresh()}</button>

        {#snippet gameIcons(gameMode: GameMode, teamMode: TeamMode, region: Region)}
          <img src={asset(GameModes[gameMode].menu.image)} alt="Mode icon" class="w-8 drop-shadow-lg" draggable="false" />
          <Icon
            src={{
              "solo": "suroi:player",
              "duo": "suroi:duo",
              "squad": "suroi:squad",
              "duel": "lucide:swords"
            }[teamMode]}
            size={8}
          />
          <span class="text-2xl">{Config.regions[region].flag}</span>
        {/snippet}

        <label style={gameModeStyle(MenuUi.newGameMode)}>
          <input type="radio" bind:group={MenuUi.selectedGameId} value="new" class="sr-only" />

          {@render gameIcons(MenuUi.newGameMode, MenuUi.newTeamMode, MenuUi.newRegion)}

          <div class="flex flex-col gap-1">
            <div class="flex gap-1 *:button *:p-1">
              <select bind:value={MenuUi.newGameMode}>
                {#each ["normal", "fall", "infection", "hunted"] as gameMode}
                  <option value={gameMode}>
                    {m[`game_mode_${gameMode as GameMode}`]()}
                  </option>
                {/each}
              </select>

              <select bind:value={MenuUi.newTeamMode}>
                <option value="solo">{m.team_mode_solo()}</option>
                <option value="duo">{m.team_mode_duo()}</option>
                <option value="squad">{m.team_mode_squad()}</option>
                <option value="duel">{m.team_mode_duel()}</option>
              </select>

              <select bind:value={MenuUi.newRegion}>
                {#each Object.keys(Config.regions) as region}
                  <option value={region}>
                    {m[`region_${region as Region}`]()}
                  </option>
                {/each}
              </select>
            </div>
            <span class="flex gap-1 items-center text-sm font-mono"><Icon src="lucide:plus" size={5} /> {m.new_game()}</span>
          </div>
        </label>

        {#each data.games as game}
          <label style={gameModeStyle(game.gameMode)}>
            <!-- FIXME hard coded join window -->
            <input type="radio" bind:group={MenuUi.selectedGameId} value={game.id} class="sr-only" />

            {@render gameIcons(game.gameMode, game.teamMode, game.region!)}

            <div class="flex flex-col gap-1">
              <span>
                {m[`game_mode_${game.gameMode}`]()} · {m[`team_mode_${game.teamMode}`]()} · {m[`region_${game.region!}`]()}
              </span>
              <span class="flex gap-2 items-center *:flex *:gap-1 font-mono text-sm">
                <div>
                  <Icon src="suroi:player" size={5} />
                  {game.playerCount?.toString().padEnd(2, "\u00a0" /* non-breaking space */)}
                </div>
                <div>
                  <Icon src="lucide:clock" size={5} />
                  {game.startedTime ? millisToTime(game.startedTime) ?? "-:--" : "-:--"}
                </div>
                <!-- {#if game.ping < 50}
                  <div class="text-green-300">
                    <SignalHigh class="w-5 h-5" />
                    {game.ping} {m.milliseconds()}
                  </div>
                {:else if game.ping >= 50 && game.ping < 100}
                  <div class="text-yellow-300">
                    <SignalMedium class="w-5 h-5" />
                    {game.ping} {m.milliseconds()}
                  </div>
                {:else}
                  <div class="text-red-300">
                    <SignalLow class="w-5 h-5" />
                    {game.ping} {m.milliseconds()}
                  </div>
                {/if} -->
              </span>
            </div>
          </label>
        {/each}
      </div>

      <!-- Play & Spectate buttons -->
      {#if MenuUi.selectedGameId !== undefined}
        <div transition:slide class="w-full flex gap-2 text-xl">
          <button class="button bg-blue-600 grow justify-center" onclick={() => LegacyBridge.play(data.games)}>{MenuUi.playButtonText}</button>
          <button class="button bg-gray-600" disabled>{m.spectate()}</button>
        </div>
      {/if}
    </div>

    <!-- Top left & right links -->
    <div class="*:fixed *:top-12 *:flex *:gap-2">
      <div class="left-4 *:button *:cursor-pointer *:p-1.5 [&_svg]:fill-white">
        <a target="_blank" href="https://discord.suroi.io"               class="bg-[#5865f2]"><Icon src="simple-icons:discord"   size={7} /></a>
        <a target="_blank" href="https://reddit.com/r/suroigame"         class="bg-[#ff4500]"><Icon src="simple-icons:reddit"    size={7} /></a>
        <a target="_blank" href="https://bsky.app/profile/suroi.io"      class="bg-[#0560ff]"><Icon src="simple-icons:bluesky"   size={7} /></a>
        <a target="_blank" href="https://instagram.com/suroigame"        class="bg-[#ff0069]"><Icon src="simple-icons:instagram" size={7} /></a>
        <a target="_blank" href="https://www.youtube.com/@suroigame"     class="bg-[#ff0033]"><Icon src="simple-icons:youtube"   size={7} /></a>
        <a target="_blank" href="https://github.com/HasangerGames/suroi" class="bg-[#101411]"><Icon src="simple-icons:github"    size={7} /></a>
        <a target="_blank" href="https://ko-fi.com/suroi"                class="bg-[#ff6433]"><Icon src="simple-icons:kofi"      size={7} /></a>
      </div>
      <div class="right-4">
        <button class="button bg-blue-600" disabled>Sign Up</button>
        <button class="button bg-gray-600" disabled>Log In</button>
      </div>
    </div>

    <!-- Bottom left & right links -->
    <div class="*:fixed *:bottom-4 *:ui-container *:px-4 *:py-2 *:rounded-lg">
      <div class="left-4">
        <a href="./changelog" target="_blank" rel="noopener noreferrer">v{GAME_VERSION}</a> ·
        <button class="focusable clickable" onclick={() => gameUi.activeModal = "partners"}>{m.partners()}</button> ·
        <a href="./privacy" target="_blank" rel="noopener noreferrer">{m.privacy()}</a> ·
        <a id="contact-link" href="mailto:support@suroi.io" target="_blank" rel="noopener noreferrer">{m.contact()}</a>
      </div>
      <div class="right-4">
        {m.background_credits({ artist: data.background.artist })} ·
        <a href="./credits" target="_blank">{m.full_credits()}</a>
      </div>
    </div>
  </div>
{/if}

<GameUi />

{#if MenuUi.noBlur}
  <style>
    :root {
      --blur-xl: 0 !important;
    }
  </style>
{/if}

<style>
  /*
    Source - https://stackoverflow.com/a/61659129
    Posted by Ege Hurturk
    Retrieved 2026-07-06, License - CC BY-SA 4.0
  */
  [contenteditable]:empty:not(:focus)::before {
    content: attr(placeholder);
    pointer-events: none;
    display: block; /* For Firefox */
  }

  @keyframes marquee {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100vw);
    }
  }

  .marquee-content {
      animation: marquee 20s linear infinite;
  }
</style>
