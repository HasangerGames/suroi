<script lang="ts">
	import { Biohazard, BookOpenText, ChartColumn, Newspaper, PencilSparkles, Settings, Shield, Shirt, User } from "@lucide/svelte";
  import { fade } from "svelte/transition";
	import NavItem from "$lib/components/NavItem.svelte";
  import { m } from "$lib/paraglide/messages";
</script>

<nav class="ui-container absolute left-4 top-1/2 -translate-y-1/2 z-2 p-3 w-fit flex flex-col gap-2" transition:fade>
  <NavItem href="/"           title={m.play()}       icon={Biohazard}               />
  <NavItem href="/create"     title={m.create()}     icon={PencilSparkles} disabled />
  <NavItem href="/loadout"    title={m.loadout()}    icon={Shirt}        						/>
  <NavItem href="/settings"   title={m.settings()}   icon={Settings}     						/>
  <NavItem href="/stats"      title={m.stats()}      icon={ChartColumn}    disabled />
  <NavItem href="/news"       title={m.news()}       icon={Newspaper}    						/>
  <NavItem href="/wiki"       title={m.wiki()}       icon={BookOpenText} 						/>
  <NavItem href="/moderation" title={m.moderation()} icon={Shield}      	 disabled />
</nav>
