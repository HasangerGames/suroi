<script lang="ts">
	import { Biohazard, BookOpenText, ChartColumn, HandHeart, Newspaper, PencilSparkles, Settings, Shield, Shirt, User } from "@lucide/svelte";
	import { asset } from "$app/paths";
	import NavItem from "$lib/components/NavItem.svelte";
	import "./layout.css";

	let { children } = $props();

	export const prerender = "auto";
</script>

{@render children()}
