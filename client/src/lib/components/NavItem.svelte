<script lang="ts">
  import { page } from "$app/state";

  let { href, title, icon: Icon = undefined, disabled = false } = $props();
  const active = $derived(page.url.pathname === href);
</script>

<!-- biome-ignore lint/a11y/useValidAnchor: biome doesn't recognize this svelte syntax yet -->
<!-- biome-ignore lint/a11y/useValidAriaValues: or this one -->
<a
  href={disabled ? undefined : href}
  class="flex gap-2 p-2 rounded-xl text-shadow-lg hover:text-gray-300 transition duration-100 select-none {active ? "bg-suroi-orange text-gray-900 hover:text-gray-900 font-bold text-shadow-none" : ""} {disabled ? "text-gray-400 pointer-events-none" : ""}"
  aria-current={active ? "page" : undefined}
>
  {#if Icon}
    <Icon class={active ? "" : "drop-shadow-lg"} />
  {/if}
  {title}
</a>
