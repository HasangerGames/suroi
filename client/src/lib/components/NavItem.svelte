<script lang="ts">
  import { page } from "$app/state";
  import Icon from "./Icon.svelte";

  let { href, title, icon = undefined, disabled = false, ...props } = $props();
  const active = $derived(page.url.pathname === href);
</script>

<a
  href={disabled ? undefined : href}
  class="flex gap-2 p-2 rounded-xl text-shadow-lg hover:text-gray-300 clickable select-none {active ? "bg-amber-600 text-gray-900 hover:text-gray-900 font-bold text-shadow-none" : ""} {disabled ? "text-gray-400 pointer-events-none" : ""}"
  aria-current={active ? "page" : undefined}
  {...props}
>
  {#if icon}
    <Icon src={icon} class={active ? "" : "drop-shadow-lg"} />
  {/if}
  {title}
</a>
