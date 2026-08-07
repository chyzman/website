<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Cursor, { cursorSize, illustratedTypes } from '$lib/cursors/Cursor.svelte';
	import type { Property } from 'csstype';

	type Args = {
		type?: Property.Cursor;
		color: string;
		secondaryColor: string;
		showOutlines: boolean;
	};

	const { Story } = defineMeta({
		title: 'Multiplayer/Cursor',
		argTypes: {
			type: { control: 'select', options: [undefined, ...illustratedTypes] },
			color: { control: 'color' },
			secondaryColor: { control: 'color' },
			showOutlines: { control: 'boolean' }
		},
		args: {
			type: undefined,
			color: 'oklch(85% 0.18 100)',
			secondaryColor: 'black',
			showOutlines: true
		}
	});
</script>

<script lang="ts">
	let grabType = $state<'grab' | 'grabbing'>('grab');
	let grabPos = $state({ x: 0, y: 0 });

	function trackPos(pos: { x: number; y: number }, e: PointerEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		pos.x = e.clientX - rect.left;
		pos.y = e.clientY - rect.top;
	}
</script>

<Story name="Grab / Grabbing" asChild>
	<div style="display: flex; gap: 24px;">
		<div
			style="position: relative; width: 300px; height: 200px; border: 1px dashed var(--color-line, gray); cursor: none;"
			role="button"
			tabindex="0"
			onpointermove={(e) => trackPos(grabPos, e)}
			onpointerdown={() => (grabType = 'grabbing')}
			onpointerup={() => (grabType = 'grab')}
			onpointerleave={() => (grabType = 'grab')}
		>
			<Cursor type={grabType} color="oklch(85% 0.18 100)" secondaryColor="black" x={grabPos.x} y={grabPos.y} />
		</div>
		<div
			style="width: 300px; height: 200px; border: 1px dashed var(--color-line, gray); cursor: grab;"
			role="button"
			tabindex="0"
			onpointerdown={(e) => ((e.currentTarget as HTMLElement).style.cursor = 'grabbing')}
			onpointerup={(e) => ((e.currentTarget as HTMLElement).style.cursor = 'grab')}
			onpointerleave={(e) => ((e.currentTarget as HTMLElement).style.cursor = 'grab')}
		></div>
	</div>
</Story>

<Story name="Cursor">
	{#snippet template(args: Args)}
		{@const types = args.type ? [args.type] : illustratedTypes}
		<div style="display: flex; flex-wrap: wrap; gap: 12px;">
			{#each types as type (type)}
				{@const box = cursorSize(type)}
				<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
					<div style="position: relative; width: 70px; height: 70px;">
						<div
							style="position: absolute; left: 50%; top: 50%; width: {box.width}px; height: {box.height}px; transform: translate(-50%, -50%); cursor: {type}; {args.showOutlines
								? 'outline: 1px solid red;'
								: ''}"
						></div>
						<Cursor {type} color={args.color} secondaryColor={args.secondaryColor} x={35} y={35} />
						{#if args.showOutlines}
							<div
								style="position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; transform: translate(-50%, -50%); border-radius: 50%; background: lime; pointer-events: none;"
							></div>
						{/if}
					</div>
					<span style="font-size: 11px; color: var(--color-muted, gray);">{type}</span>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
