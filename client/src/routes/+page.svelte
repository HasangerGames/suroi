<script lang="ts">
  import { isWebGLSupported } from "pixi.js";
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import { invalidate } from "$app/navigation";
  import { asset } from "$app/paths";
  import { GameModes } from "$common/definitions/gameModes";
  import { GameMode, Region, TeamMode } from "$common/schemas/misc";
  import Icon from "$lib/components/Icon.svelte";
  import Nav from "$lib/components/Nav.svelte";
  import Skin from "$lib/components/Skin.svelte";
  import GameUi from "$lib/legacy/GameUi.svelte";
  import { gameUi } from "$lib/legacy/GameUi.svelte.ts";
  import { m } from "$lib/paraglide/messages";
  import { endGame, menuUi, play, randomMarqueeText, updateNickname } from "$lib/scripts/ui/menu.svelte";
  import { Config } from "$lib/scripts/utils/config";
  import { APP_VERSION } from "$lib/scripts/utils/constants";
  import { millisToTime } from "$lib/scripts/utils/misc";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  menuUi.marqueeText = data.marqueeText;
  menuUi.background = data.background;

  onMount(() => {
    menuUi.showHardwareAccelWarning = !isWebGLSupported(true);

    window.addEventListener("resize", () => {
        menuUi.showRotateMessage = window.innerWidth < window.innerHeight;
    });
    menuUi.showRotateMessage = window.innerWidth < window.innerHeight;
  });

  function gameModeStyle(gameMode: GameMode | "any"): string | undefined {
    if (gameMode === "any") return;

    const { playButton } = GameModes[gameMode];
    if ("colors" in playButton) {
      return `background: radial-gradient(circle, ${playButton.colors[0]}, ${playButton.colors[1]})`;
    } else {
      return `background-color: ${playButton.color}`;
    }
  }

  let nicknameEditMode = $state(false);
  let nicknameField = $state<HTMLSpanElement>();

  $effect(() => {
    if (nicknameEditMode) {
      nicknameField?.focus();
    } else {
      updateNickname?.();
    }
  });
</script>

{#if menuUi.state !== "inGame"}
  <div transition:fade class="absolute bottom-0 left-0 z-1 w-screen h-screen flex flex-col items-center bg-cover bg-center" style={menuUi.background ? `background-image: url(${asset(`/img/backgrounds/menu/${menuUi.background.filename}`)})` : ""}>
    <div class="absolute top-0 left-0 w-full h-8 bg-linear-to-b from-suroi-gray from-70% to-transparent">
      <button type="button" class="marquee-content fixed top-0 text-sm font-bold cursor-pointer" onclick={() => menuUi.marqueeText = randomMarqueeText()}>{@html menuUi.marqueeText}</button>
    </div>

    <enhanced:img src={asset("/img/logos/suroi.svg")} alt="Suroi logo" class="mx-auto mt-10 mb-8 w-xl select-none" draggable="false" />

    <Nav />

    <div class="ui-container mx-auto flex flex-col items-center gap-3 p-5 relative">
      {#if menuUi.state === "connecting"}
        <div transition:fade class="absolute w-full h-full bg-suroi-gray-transparent rounded-3xl -mt-6 z-2">
          <div class="bg-suroi-gray rounded-3xl z-2 absolute top-1/2 left-1/2 -translate-1/2 p-4 flex flex-col items-center justify-center w-fit">
            <div class="flex gap-2 items-center justify-center pr-5">
              <Skin idString="hasanger" class="scale-50 animate-spin [animation-duration:0.75s] origin-[calc(50%+6px)_50%]" />
              <strong class="w-max">{menuUi.connectingText ?? ""}</strong>
            </div>
            <button type="button" class="button bg-blue-500" onclick={endGame}>{m.action_cancel()}</button>
          </div>
        </div>
      {/if}

      <!-- Error message from the server -->
      {#if menuUi.serverError !== undefined}
        <div class="flex gap-2 items-center p-2 rounded-md font-bold bg-red-500/75" transition:slide>
          <Icon src="lucide:circle-alert" />
          {menuUi.serverError}
          <Icon src="lucide:x" class="clickable" onclick={() => menuUi.serverError = undefined} />
        </div>
      {/if}

      <!-- Warning displayed if hardware acceleration is disabled or unavailable -->
      {#if menuUi.showHardwareAccelWarning}
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
      {#if menuUi.showRotateMessage}
        <div class="flex gap-2 p-2 rounded-md font-bold bg-suroi-gray/75">
          <Icon src="lucide:rotate-cw-square" />
          {m.msg_rotate()}
        </div>
      {/if}

      <div class="flex gap-3">
        <!-- Player list + team options -->
        <div class="skin-container">
          <Skin idString={menuUi.skinIdString} />
          <div class="flex items-center gap-2">
            <span
              bind:this={nicknameField}
              oninput={e => (e as unknown as InputEvent).inputType === "insertLineBreak" && (nicknameEditMode = false)}
              contenteditable={nicknameEditMode ? "plaintext-only" : "false"}
              placeholder="Player"
              class="text-center text-xl font-bold focusable rounded-sm"
            >{menuUi.nickname}</span>
            <Icon
              src={nicknameEditMode ? "lucide:check" : "lucide:pencil"}
              class="cursor-pointer hover:text-gray-400"
              onclick={() => nicknameEditMode = !nicknameEditMode}
            />
          </div>
        </div>
        <div class="skin-container">
          <button type="button" class="button bg-purple-600">{m.create_team()}</button>
          <button type="button" class="button bg-purple-600">{m.join_team()}</button>
        </div>
      </div>

      <!-- Game selector -->
      <div class="w-full flex flex-col gap-3 max-h-96 px-2 py-1 overflow-y-scroll *:button *:select-none *:[&:has(>input:checked)]:ring-3 *:[&:has(>input:checked)]:ring-blue-300 *:[&:has(>input:disabled)]:brightness-60">
        <button class="bg-stone-600 justify-center" onclick={() => invalidate("app:games")}><Icon src="lucide:refresh-cw" /> {m.refresh()}</button>

        {#snippet gameIcons(gameMode: GameMode, teamMode: TeamMode, region: Region)}
          <img src={asset(GameModes[gameMode].playButton.image)} alt="Mode icon" class="w-8 drop-shadow-lg" draggable="false" />
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

        <label style={gameModeStyle(menuUi.newGameMode)}>
          <input type="radio" bind:group={menuUi.selectedGameId} value="new" class="sr-only" />

          {@render gameIcons(menuUi.newGameMode, menuUi.newTeamMode, menuUi.newRegion)}

          <div class="flex flex-col gap-1">
            <div class="flex gap-1 *:button *:p-1">
              <select bind:value={menuUi.newGameMode}>
                {#each ["normal", "fall", "infection", "hunted"] as gameMode}
                  <option value={gameMode}>
                    {m[`game_mode_${gameMode as GameMode}`]()}
                  </option>
                {/each}
              </select>

              <select bind:value={menuUi.newTeamMode}>
                <option value="solo">{m.team_mode_solo()}</option>
                <option value="duo">{m.team_mode_duo()}</option>
                <option value="squad">{m.team_mode_squad()}</option>
                <option value="duel">{m.team_mode_duel()}</option>
              </select>

              <select bind:value={menuUi.newRegion}>
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
            <input type="radio" bind:group={menuUi.selectedGameId} value={game.id} class="sr-only" />

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
      {#if menuUi.selectedGameId !== undefined}
        <div transition:slide class="w-full flex gap-2 text-xl">
          <button class="button bg-blue-600 grow justify-center" onclick={() => play(data.games)}>{m.play()}</button>
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
        <a href="./changelog" target="_blank" rel="noopener noreferrer">v{APP_VERSION}</a> ·
        <button class="clickable" onclick={() => gameUi.activeModal = "partners"}>{m.partners()}</button> ·
        <a href="./privacy" target="_blank" rel="noopener noreferrer">{m.privacy()}</a> ·
        <a id="contact-link" href="mailto:support@suroi.io" target="_blank" rel="noopener noreferrer">{m.contact()}</a>
      </div>
      <div class="right-4">
        {m.background_credits({ artist: menuUi.background.artist })} ·
        <a href="./credits" target="_blank">{m.full_credits()}</a>
      </div>
    </div>
  </div>
{/if}

<GameUi />

{#if menuUi.noBlur}
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
