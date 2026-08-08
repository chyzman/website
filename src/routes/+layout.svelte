<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/chyz.png';
	import PresenceLayer from '$lib/presence/PresenceLayer.svelte';
	import { resolve } from '$app/paths';
	import { myColors } from '$lib/settings/settings.svelte';
	import { cursorCssValue } from '$lib/presence/cursor/Cursor.svelte';

	let { children } = $props();

	$effect(() => {
		const colors = myColors();
		document.documentElement.style.setProperty('--user-color', colors.central);
		document.documentElement.style.setProperty(
			'--cursor-icon-default',
			cursorCssValue('default', colors.color, colors.secondaryColor, 'default')
		);
		document.documentElement.style.setProperty(
			'--cursor-icon-pointer',
			cursorCssValue('pointer', colors.color, colors.secondaryColor, 'pointer')
		);
		document.documentElement.style.setProperty(
			'--cursor-icon-text',
			cursorCssValue('text', colors.color, colors.secondaryColor, 'text')
		);
	});
</script>

<svelte:head><link rel="icon" type="image/png" href={favicon} /></svelte:head>
<PresenceLayer />
<div class="mx-auto flex min-h-screen w-[48rem] flex-col px-6" data-cursor-bounds>
	<nav class="flex gap-6 border-b border-line py-4 text-sm">
		<a href={resolve('/')}>Home</a>
		<a href={resolve('/projects')}>Projects</a>
		<a href={resolve('/resume')}>Resume</a>
		<a href={resolve('/links')}>Links</a>
	</nav>
	<main class="prose prose-invert max-w-none flex-1 py-10">
		{@render children()}
	</main>
</div>
