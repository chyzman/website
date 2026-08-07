<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/chyz.png';
	import CursorLayer from '$lib/cursors/CursorLayer.svelte';
	import { resolve } from '$app/paths';
	import { color, secondaryColor } from '$lib/multiplayer/settings.svelte';
	import { cursorCssValue } from '$lib/cursors/Cursor.svelte';

	let { children } = $props();

	$effect(() => {
		document.documentElement.style.setProperty('--user-color', color.value);
		document.documentElement.style.setProperty(
			'--cursor-icon-default',
			cursorCssValue('default', color.value, secondaryColor.value, 'default')
		);
		document.documentElement.style.setProperty(
			'--cursor-icon-pointer',
			cursorCssValue('pointer', color.value, secondaryColor.value, 'pointer')
		);
		document.documentElement.style.setProperty(
			'--cursor-icon-text',
			cursorCssValue('text', color.value, secondaryColor.value, 'text')
		);
	});
</script>

<svelte:head><link rel="icon" type="image/png" href={favicon} /></svelte:head>
<CursorLayer />
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
