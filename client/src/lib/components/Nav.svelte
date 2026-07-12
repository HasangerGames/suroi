<script lang="ts">
	import { Biohazard, BookOpenText, ChartColumn, Newspaper, PencilSparkles, Settings, Shield, Shirt, User } from "@lucide/svelte";
  import { fade } from "svelte/transition";
	import NavItem from "$lib/components/NavItem.svelte";
</script>

<nav class="ui-container absolute left-4 top-1/2 -translate-y-1/2 z-2 p-3 w-fit flex flex-col gap-2" transition:fade>
  <NavItem href="/"           title="Play"       icon={Biohazard}               />
  <NavItem href="/create"     title="Create"     icon={PencilSparkles} disabled />
  <NavItem href="/loadout"    title="Loadout"    icon={Shirt}        						/>
  <NavItem href="/settings"   title="Settings"   icon={Settings}     						/>
  <NavItem href="/stats"     title="Stats"     	 icon={ChartColumn}    disabled />
  <NavItem href="/news"       title="News"       icon={Newspaper}    						/>
  <NavItem href="/wiki"       title="Wiki"       icon={BookOpenText} 						/>
  <NavItem href="/account"    title="Account"    icon={User}         	 disabled />
  <NavItem href="/moderation" title="Moderation" icon={Shield}      	 disabled />
</nav>
