<script lang="ts">
  import { Check, CircleAlert, Clock, Pencil, Plus, RefreshCw, Swords, X } from "@lucide/svelte";
  import { fade, slide } from "svelte/transition";
  import { asset } from "$app/paths";
  import { GameModes } from "$common/definitions/gameModes";
  import { GameMode, Region, TeamMode } from "$common/schemas/misc";
  import { pickRandomInArray } from "$common/utils/random";
  import Nav from "$lib/components/Nav.svelte";
  import Skin from "$lib/components/Skin.svelte";
  import LegacyUi from "$lib/legacy/LegacyUi.svelte";
  import { m } from "$lib/paraglide/messages";
  import { endGame, menuUi, play } from "$lib/scripts/ui/menu.svelte";
  import { Config } from "$lib/scripts/utils/config";
  import { APP_VERSION } from "$lib/scripts/utils/constants";
  import type { PageProps } from "./$types";
    import { invalidate } from "$app/navigation";

  let { data }: PageProps = $props();
  $effect(() => {
    for (const game of data.games) {
      menuUi.games.set(game.id, game);
    }
  });

  const backgrounds: [string, string][] = [
    ["bridge_duel_precisederp.png", "@PreciseDerp"],
    ["gun_vs_c4_precisederp.png", "@PreciseDerp"],
    ["terrorizer_migraine7341.png", "@migraine7341"],
    ["suroi_moment_migraine7341.png", "@migraine7341"],
    ["tango_51_boeing_777.jpg", "Boeing_777"],
    ["winter_confrontation_yoko.png", "Yoko"],
    ["l115a1_sniper_yoko.png", "Yoko"],
    ["untitled_winter_yoko.png", "Yoko"],
    ["harvest_mode_yoko.png", "Yoko"],
    ["hunted_mode_experience_deviouslemon331.png", "DeviousLemon331"],
    ["monument_j.png", "J"],
    ["rounds_j.png", "J"],
    ["most_average_hunted_day_danzan.png", "danzan"],
    ["infection_yoko.png", "Yoko"],
  ];
  const [backgroundFilename, backgroundArtist] = pickRandomInArray(backgrounds);

  const pad = (n: number): string | number => n < 10 ? `0${n}` : n;
  const millisToTime = (millis: number): string | undefined => {
    millis = Date.now() - millis;
    if (millis < 0) return;

    const days = Math.floor(millis / (1000 * 60 * 60 * 24));
    const hours = Math.floor(millis / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(millis / (1000 * 60)) % 60;
    const seconds = Math.floor(millis / 1000) % 60;
    return `${days > 0 ? `${pad(days)}:` : ""}${hours > 0 ? `${pad(hours)}:` : ""}${hours > 0 ? pad(minutes) : minutes}:${pad(seconds)}`;
  };

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
  $effect(() => {
    if (nicknameEditMode) {
      nicknameEditField?.focus();
    }
  });
  let nicknameEditField = $state<HTMLSpanElement>();
  let nickname = "Player";
</script>

{#if menuUi.state !== "inGame"}
  <div transition:fade class="absolute bottom-0 left-0 z-1 w-screen h-screen flex flex-col items-center bg-cover bg-center" style="background-image: url({asset(`/img/backgrounds/menu/${backgroundFilename}`)})">
    <img src={asset("/img/logos/suroi.svg")} alt="Suroi logo" class="mx-auto mt-4 mb-8 w-xl select-none" draggable="false" />

    <Nav />

    <div class="ui-container mx-auto flex flex-col items-center gap-3 p-5 relative">
      {#if menuUi.state === "connecting"}
        <div transition:fade class="absolute w-full h-full bg-suroi-gray-transparent rounded-3xl -mt-6 z-2">
          <div class="bg-suroi-gray rounded-3xl z-2 absolute top-1/2 left-1/2 -translate-1/2 p-4 flex flex-col items-center justify-center">
            <div class="flex gap-2 items-center mr-6">
              <Skin idString="hasanger" class="scale-50 animate-spin [animation-duration:0.75s] origin-[calc(50%+6px)_50%]" />
              <strong>{menuUi.connectingText ?? ""}</strong>
            </div>
            <button type="button" class="btn bg-blue-500" onclick={endGame}>{m.action_cancel()}</button>
          </div>
        </div>
      {/if}

      {#if menuUi.serverError}
        <div class="flex gap-2 items-center p-2 rounded-md font-bold bg-red-500/75" transition:slide>
          <CircleAlert />
          {menuUi.serverError}
          <X class="clickable" onclick={() => menuUi.serverError = undefined} />
        </div>
      {/if}

      <div class="flex gap-3">
        <div class="skin-container">
          <Skin idString="hasanger" />
          <div class="flex items-center gap-2">
            <span
              bind:this={nicknameEditField}
              contenteditable={nicknameEditMode ? "plaintext-only" : "false"}
              placeholder="Player"
              class="text-center text-xl font-bold focusable rounded-sm"
            >{nickname}</span>
            {#if nicknameEditMode}
              <Check class="cursor-pointer hover:text-gray-400" onclick={() => nicknameEditMode = false} />
            {:else}
              <Pencil class="cursor-pointer hover:text-gray-400" onclick={() => nicknameEditMode = true} />
            {/if}
          </div>
        </div>
        <div class="skin-container">
          <button type="button" class="btn bg-purple-600">{m.create_team()}</button>
          <button type="button" class="btn bg-purple-600">{m.join_team()}</button>
        </div>
      </div>
      <div class="w-full flex flex-col gap-3 max-h-96 px-2 py-1 overflow-y-scroll *:btn *:select-none *:[&:has(>input:checked)]:ring-3 *:[&:has(>input:checked)]:ring-blue-300">
        <button class="bg-stone-600 justify-center" onclick={() => invalidate("app:games")}><RefreshCw /> {m.refresh()}</button>

        {#snippet gameIcons(gameMode: GameMode, teamMode: TeamMode, region: Region)}
          <img src={asset(GameModes[gameMode].playButton.image)} alt="Mode icon" class="w-8 drop-shadow-lg" draggable="false" />
          {#if teamMode === "solo"}
            <img src={asset("/img/misc/solo_icon.svg")} class="w-8 h-8 drop-shadow-lg" alt="Solo icon" />
          {:else if teamMode === "duo"}
            <img src={asset("/img/misc/duo_icon.svg")} class="w-8 h-8 drop-shadow-lg" alt="Duo icon" />
          {:else if teamMode === "squad"}
            <img src={asset("/img/misc/squad_icon.svg")} class="w-8 h-8 drop-shadow-lg" alt="Squad icon" />
          {:else if teamMode === "duel"}
            <Swords class="w-8 h-8 drop-shadow-lg" />
          {/if}
          <span class="text-2xl">{Config.regions[region].flag}</span>
        {/snippet}

        <label style={gameModeStyle(menuUi.newGameMode)}>
          <input type="radio" bind:group={menuUi.selectedGameId} value="new" class="sr-only" />

          {@render gameIcons(menuUi.newGameMode, menuUi.newTeamMode, menuUi.newRegion)}

          <div class="flex flex-col gap-1">
            <div class="flex gap-1 *:btn *:p-1">
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
            <span class="flex gap-1 items-center text-sm font-mono"><Plus class="w-5 h-5" /> {m.new_game()}</span>
          </div>
        </label>

        {#each data.games as game}
          <label style={gameModeStyle(game.gameMode)}>
            <!-- FIXME hard coded join window -->
            <input type="radio" bind:group={menuUi.selectedGameId} value={game.id} disabled={Date.now() - game.startedTime > 114000} class="sr-only" />

            {@render gameIcons(game.gameMode, game.teamMode, game.region!)}

            <div class="flex flex-col gap-1">
              <span>
                {m[`game_mode_${game.gameMode}`]()} · {m[`team_mode_${game.teamMode}`]()} · {m[`region_${game.region!}`]()}
              </span>
              <span class="flex gap-2 items-center *:flex *:gap-1 font-mono text-sm">
                <div>
                  <img src={asset("/img/misc/solo_icon.svg")} class="w-5 h-5 drop-shadow-lg" alt="Solo icon" />
                  {game.playerCount?.toString().padEnd(2, "\u00a0" /* non-breaking space */)}
                </div>
                <div>
                  <Clock class="w-5 h-5" />
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

      {#if menuUi.selectedGameId !== undefined}
        <div transition:slide class="w-full flex gap-2 text-xl">
          <button class="btn bg-blue-600 grow justify-center" onclick={play}>{m.play()}</button>
          <!-- <button class="btn bg-gray-600">{m.spectate()}</button> -->
        </div>
      {/if}
    </div>

    <!-- Bottom left & right links -->
    <div class="*:fixed *:bottom-4 *:ui-container *:px-4 *:py-2 *:rounded-md">
      <div class="left-4">
        <a href="./changelog" target="_blank" rel="noopener noreferrer">v{APP_VERSION}</a> ·
        <a href="#">{m.partners()}</a> ·
        <a href="./privacy" target="_blank" rel="noopener noreferrer">{m.privacy()}</a> ·
        <a id="contact-link" href="mailto:support@suroi.io" target="_blank" rel="noopener noreferrer">{m.contact()}</a>
      </div>
      <div class="right-4">
        {m.background_credits({ backgroundArtist })} ·
        <a href="./credits" target="_blank">{m.full_credits()}</a>
      </div>
    </div>
  </div>
{/if}

<LegacyUi />

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
</style>
