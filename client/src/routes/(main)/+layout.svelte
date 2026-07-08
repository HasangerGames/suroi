<script lang="ts">
	import { Biohazard, BookOpenText, HandHeart, Newspaper, PencilSparkles, Settings, Shield, Shirt, User } from "@lucide/svelte";
	import NavItem from "$lib/components/NavItem.svelte";
	import logo from "$lib/img/logos/suroi.svg";
	import faviconSvg from "$lib/img/logos/suroi_favicon.svg";
	import faviconPng16x from "$lib/img/logos/suroi_favicon_16x16.png";
	import faviconPng32x from "$lib/img/logos/suroi_favicon_32x32.png";
	import faviconPng96x from "$lib/img/logos/suroi_favicon_96x96.png";
	import { initTranslation } from "$lib/scripts/utils/translations/translations";
	import "./layout.css";
	import { page } from "$app/state";

	let { children } = $props();

	const renderNav = page.url.pathname !== "/play";

	export const prerender = "auto";

	initTranslation();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" sizes="any"   href={faviconSvg}    />
	<link rel="icon" type="image/x-icon"  sizes="16x16" href={faviconPng16x} />
	<link rel="icon" type="image/x-icon"  sizes="32x32" href={faviconPng32x} />
	<link rel="icon" type="image/x-icon"  sizes="96x96" href={faviconPng96x} />
</svelte:head>

{#if renderNav}
	<img src={logo} alt="Suroi logo" class="mx-auto mt-4 mb-8 w-xl select-none" />

	<div class="flex gap-8 items-center justify-center">
		<nav class="ui-container p-3 w-fit flex flex-col gap-2 mt-8 mb-8">
			<NavItem href="/"           title="Play"       icon={Biohazard}               />
			<NavItem href="/create"     title="Create"     icon={PencilSparkles} disabled />
			<NavItem href="/loadout"    title="Loadout"    icon={Shirt}        						/>
			<NavItem href="/settings"   title="Settings"   icon={Settings}     						/>
			<NavItem href="/news"       title="News"       icon={Newspaper}    						/>
			<NavItem href="/wiki"       title="Wiki"       icon={BookOpenText} 						/>
			<NavItem href="/donate"     title="Donate"     icon={HandHeart} 						  />
			<NavItem href="/account"    title="Account"    icon={User}         	 disabled />
			<NavItem href="/moderation" title="Moderation" icon={Shield}      	 disabled />
		</nav>

		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
