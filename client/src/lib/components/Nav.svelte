<script lang="ts">
  import { fade } from "svelte/transition";
	import NavItem from "$lib/components/NavItem.svelte";
  import { gameUi } from "$lib/legacy/GameUi.svelte.ts";
  import { m } from "$lib/paraglide/messages";
</script>

<nav class="ui-container absolute left-4 top-1/2 -translate-y-1/2 z-2 p-3 w-fit flex flex-col gap-2" transition:fade>
  <NavItem href="/"           title={m.play()}          icon="lucide:biohazard"                />
  <NavItem href="/create"     title={m.create()}        icon="lucide:pencil-sparkles" disabled />
  <NavItem href="#"           title={m.loadout()}       icon="lucide:shirt"        		onclick={() => gameUi.activeModal = "loadout"}  />
  <NavItem href="#"           title={m.settings()}      icon="lucide:settings"        onclick={() => gameUi.activeModal = "settings"} />
  <NavItem href="/stats"      title={m.stats()}         icon="lucide:chart-column"    disabled />
  <NavItem href="/news"       title={m.news()}          icon="lucide:newspaper"    					   />
  <NavItem href="/wiki"       title={m.wiki()}          icon="lucide:book-open-text"  target="_blank" />
  <NavItem href="/status"     title={m.server_status()} icon="lucide:server"          disabled />
  <NavItem href="/moderation" title={m.moderation()}    icon="lucide:shield"     	    disabled />
</nav>
