<script lang="ts">
  import { Check, Pencil, Swords } from "@lucide/svelte";
  import { Modes } from "$common/definitions/modes";
  import Skin from "$lib/components/Skin.svelte";
  import background from "$lib/img/backgrounds/menu/normal.png";
  import duoIcon from "$lib/img/misc/duo_icon.svg";
  import soloIcon from "$lib/img/misc/solo_icon.svg";
  import squadIcon from "$lib/img/misc/squad_icon.svg";
  import { translate } from "$lib/scripts/utils/translations/translations";
  import type { TranslationKeys } from "$lib/scripts/utils/translations/typings";

  const modeDefs = Object.entries(Modes)
    .filter(([modeName]) => ["normal", "fall", "infection", "hunted"].includes(modeName));

  let nicknameEditMode = $state(false);
  $effect(() => {
    if (nicknameEditMode) {
      nicknameEditField.focus();
    }
  });
  let nicknameEditField: HTMLSpanElement;
  let nickname = "Player";
</script>

<div class="absolute bottom-0 left-0 -z-1 w-screen h-screen" style="background-image: url({background})"></div>

<div class="ui-container min-w-xl flex flex-col items-center gap-3 p-6">
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
      <button type="button" class="btn bg-violet-600 mt-1">Make Team</button>
      <button type="button" class="btn bg-violet-600 mt-1">Join Team</button>
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
          <img src={(await import(/* @vite-ignore */playButton.image)).default} alt="Mode icon" width="24" />
        {/if}
        {translate(`mode_${modeName}` as TranslationKeys)}
      </button>
    {/each}
  </div>

  <div class="flex gap-3 justify-stretch">
    <button type="button" class="btn btn-primary flex flex-col justify-center text-xl grow">
      <img src={soloIcon} class="w-12 mx-auto drop-shadow-lg" alt="Solo icon" />
      <span>Play Solo</span>
    </button>
    <button type="button" class="btn btn-primary flex flex-col justify-center text-xl grow">
      <img src={duoIcon} class="w-12 mx-auto drop-shadow-lg" alt="Solo icon" />
      <span>Play Duo</span>
    </button>
    <button type="button" class="btn btn-primary flex flex-col justify-center text-xl grow">
      <img src={squadIcon} class="w-12 mx-auto drop-shadow-lg" alt="Squad icon" />
      <span>Play Squad</span>
    </button>
    <button type="button" class="btn btn-primary flex flex-col justify-center text-xl grow">
      <Swords class="w-12 h-12 mx-auto drop-shadow-lg" />
      <span>Play 1v1</span>
    </button>
  </div>
</div>

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
