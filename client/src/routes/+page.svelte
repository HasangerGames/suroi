<script lang="ts">
  import { Check, CircleAlert, Pencil, Swords, X } from "@lucide/svelte";
  import { fade, slide } from "svelte/transition";
  import { asset } from "$app/paths";
  import { Modes } from "$common/definitions/modes";
  import Skin from "$lib/components/Skin.svelte";
  import LegacyUi from "$lib/legacy/LegacyUi.svelte";
  import { gameState, joinGame } from "$lib/legacy/legacyConnector.svelte";
    import Nav from "$lib/components/Nav.svelte";

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

{#if gameState.state !== "inGame"}
  <div transition:fade class="absolute bottom-0 left-0 z-1 w-screen h-screen flex flex-col items-center" style="background-image: url(./img/backgrounds/menu/normal.png)">
    <img src={asset("/img/logos/suroi.svg")} alt="Suroi logo" class="mx-auto mt-4 mb-8 w-xl select-none" />

    <Nav />

    <div class="ui-container mx-auto min-w-xl flex flex-col items-center gap-3 p-6">
      {#if gameState.state === "menu"}
        {#if gameState.serverError}
          <div class="flex gap-2 items-center p-2 rounded-md font-bold bg-red-500/75" transition:slide>
            <CircleAlert />
            {gameState.serverError}
            <X class="clickable" onclick={() => gameState.serverError = undefined} />
          </div>
        {/if}

        <div class="flex gap-2">
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
            <button type="button" class="btn bg-violet-600">Make Team</button>
            <button type="button" class="btn bg-violet-600">Join Team</button>
          </div>
        </div>

        <div class="flex gap-3 justify-stretch">
          {#each modeDefs as [modeName, { playButton }]}
            <button
              type="button"
              class="btn flex gap-2 justify-center items-center"
              style={"colors" in playButton ? `background: radial-gradient(circle, ${playButton.colors[0]}, ${playButton.colors[1]})` : `background-color: ${playButton.color}`}
            >
              {#if playButton.image}
                <img src={asset(playButton.image)} alt="Mode icon" width="24" />
              {/if}
              {`mode_${modeName}`}
            </button>
          {/each}
        </div>

        <div class="flex gap-3 justify-stretch">
          <button type="button" class="btn bg-blue-500 flex flex-col justify-center text-xl grow" onclick={soloClick}>
            <img src={asset("/img/misc/solo_icon.svg")} class="w-12 mx-auto drop-shadow-lg" alt="Solo icon" />
            <span>Play Solo</span>
          </button>
          <button type="button" class="btn bg-blue-500 flex flex-col justify-center text-xl grow">
            <img src={asset("/img/misc/duo_icon.svg")} class="w-12 mx-auto drop-shadow-lg" alt="Solo icon" />
            <span>Play Duo</span>
          </button>
          <button type="button" class="btn bg-blue-500 flex flex-col justify-center text-xl grow">
            <img src={asset("/img/misc/squad_icon.svg")} class="w-12 mx-auto drop-shadow-lg" alt="Squad icon" />
            <span>Play Squad</span>
          </button>
          <button type="button" class="btn bg-blue-500 flex flex-col justify-center text-xl grow">
            <Swords class="w-12 h-12 mx-auto drop-shadow-lg" />
            <span>Play 1v1</span>
          </button>
        </div>
      {:else if gameState.state === "connecting"}
        <div class="flex gap-2 items-center">
          <Skin idString="hasanger" class="scale-50 animate-spin origin-[calc(50%+6px)_50%]" />
          <span class="text-xl">{gameState.connectingText ?? ""}</span>
        </div>
        <button type="button" class="btn bg-blue-500">Cancel</button>
      {/if}
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
