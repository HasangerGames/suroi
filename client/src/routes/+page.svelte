<script lang="ts">
  import { Check, CircleAlert, Eye, Info, Pencil, RefreshCw, Swords, X, Zap } from "@lucide/svelte";
  import { fade, slide } from "svelte/transition";
  import { asset } from "$app/paths";
  import { Modes } from "$common/definitions/modes";
  import Nav from "$lib/components/Nav.svelte";
  import Skin from "$lib/components/Skin.svelte";
  import LegacyUi from "$lib/legacy/LegacyUi.svelte";
  import { m } from "$lib/paraglide/messages";
  import { endGame, joinGame, menuUi } from "$lib/scripts/ui/menu.svelte";
  import { Config } from "$lib/scripts/utils/config";

  function soloClick() {
    joinGame();
  }

  const modeDefs = Object.entries(Modes)
    .filter(([modeName]) => ["normal", "fall", "infection", "hunted"].includes(modeName));

  let nicknameEditMode = $state(false);
  $effect(() => {
    if (nicknameEditMode) {
      nicknameEditField.focus();
    }
  });
  let nicknameEditField = $state<HTMLSpanElement>();
  let nickname = "Player";
</script>

{#if menuUi.state !== "inGame"}
  <div transition:fade class="absolute bottom-0 left-0 z-1 w-screen h-screen flex flex-col items-center" style="background-image: url(./img/backgrounds/menu/normal.png)">
    <img src={asset("/img/logos/suroi.svg")} alt="Suroi logo" class="mx-auto mt-4 mb-8 w-xl select-none" draggable="false" />

    <Nav />

    <div class="ui-container mx-auto min-w-xl flex flex-col items-center gap-3 p-6 relative">
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

      <!-- Region/game selector -->
      <div class="flex gap-3">
        <select bind:value={menuUi.region} class="clickable bg-suroi-gray-transparent px-4 py-2 rounded-md">
          {#each Object.entries(Config.regions) as [id, region]}
            <option value={id}>
              {region.flag}
              {m[`region_${id}`]()}
            </option>
          {/each}
        </select>
        <button class="btn bg-suroi-gray-transparent rounded-full p-2"><Info /></button>
        <select class="clickable bg-suroi-gray-transparent px-4 py-2 rounded-md">
          {#each menuUi.games ?? [] as game}
            <option value={game.id}>{m[game.teamMode]()} [{game.playerCount} player{game.playerCount === 1 ? "" : "s"}]</option>
          {/each}
        </select>
        <button class="btn bg-suroi-gray-transparent rounded-full p-2"><RefreshCw /></button>
      </div>

      <!-- Game mode buttons -->
      <div class="w-full flex gap-3 *:btn *:flex-1 *:flex-col *:gap-1 *:text-center *:select-none *:has-checked:ring-3 *:has-checked:ring-blue-300">
        <label class="bg-linear-to-br from-[#5b8939] to-[#083d15]">
          <Zap class="w-10 h-10 mx-auto drop-shadow-lg" />
          {m.auto()}
          <input type="radio" name="mode" value="auto" class="sr-only" />
        </label>
        {#each modeDefs as [modeName, { playButton }]}
          <label
            class="btn flex-1 flex-col gap-1 justify-center items-center has-checked:ring-3 has-checked:ring-blue-300"
            style={"colors" in playButton ? `background: radial-gradient(circle, ${playButton.colors[0]}, ${playButton.colors[1]})` : `background-color: ${playButton.color}`}
          >
            {#if playButton.image}
              <img src={asset(playButton.image)} alt="Mode icon" class="h-10 drop-shadow-lg" draggable="false" />
            {/if}
            {m[`mode_${modeName}`]()}
            <input type="radio" name="mode" value={modeName} class="sr-only" />
          </label>
        {/each}
      </div>

      <!-- Team mode buttons -->
      <div class="w-full flex gap-3 text-lg *:btn *:flex-1 *:flex-col *:gap-1 *:text-center *:select-none *:has-checked:ring-3 *:has-checked:ring-blue-300">
        <label class="bg-linear-to-br from-cyan-600 via-purple-600 to-rose-700">
          <Zap class="w-10 h-10 mx-auto drop-shadow-lg" />
          <span>{m.auto()}</span>
          <input type="radio" name="teamMode" value="auto" class="sr-only" />
        </label>
        <label class="bg-cyan-700">
          <img src={asset("/img/misc/solo_icon.svg")} class="w-10 h-10 mx-auto drop-shadow-lg" alt="Solo icon" />
          <span>{m.solo()}</span>
          <input type="radio" name="teamMode" value="solo" class="sr-only" />
        </label>
        <label class="bg-purple-600">
          <img src={asset("/img/misc/duo_icon.svg")} class="w-10 h-10 mx-auto drop-shadow-lg" alt="Solo icon" />
          <span>{m.duo()}</span>
          <input type="radio" name="teamMode" value="duo" class="sr-only" />
        </label>
        <label class="bg-purple-600">
          <img src={asset("/img/misc/squad_icon.svg")} class="w-10 h-10 mx-auto drop-shadow-lg" alt="Squad icon" />
          <span>{m.squad()}</span>
          <input type="radio" name="teamMode" value="squad" class="sr-only" />
        </label>
        <label class="bg-rose-700">
          <Swords class="w-10 h-10 mx-auto drop-shadow-lg" />
          <span>{m.duel()}</span>
          <input type="radio" name="teamMode" value="duel" class="sr-only" />
        </label>
      </div>

      <button type="button" class="btn text-3xl bg-blue-500 w-full">
        <span class="mx-auto">{m.play()}</span>
      </button>
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
