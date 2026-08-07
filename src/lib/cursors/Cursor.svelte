<script module lang="ts">
	import type { Property } from 'csstype';
	import { cursor as tuning } from './tuning';

	const iconFiles = import.meta.glob('./assets/*.svg', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	const centers: Partial<Record<Property.Cursor, { x: number; y: number }>> = {
		default: { x: 69, y: 30 }, // left_ptr
		pointer: { x: 117, y: 36 }, // hand2
		grab: { x: 144, y: 90 }, // hand1
		grabbing: { x: 141, y: 79 } // move
	};

	type CursorEntry = {
		icon: string;
		center: { x: number; y: number };
		size: { width: number; height: number };
	};

	const cursors: Partial<Record<Property.Cursor, CursorEntry>> = {};

	for (const [path, svg] of Object.entries(iconFiles)) {
		const name = path.match(/([^/]+)\.svg$/)?.[1] as Property.Cursor | undefined;
		const viewBox = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/);
		if (!name || !viewBox) continue;
		const [vx, vy, vw, vh] = viewBox.slice(1).map(Number);

		const center = centers[name] ?? { x: vx + vw / 2, y: vy + vh / 2 };

		const halfW = Math.max(center.x - vx, vx + vw - center.x);
		const halfH = Math.max(center.y - vy, vy + vh - center.y);
		const paddedW = halfW * 2;
		const paddedH = halfH * 2;
		const size = { width: paddedW * tuning.iconScale, height: paddedH * tuning.iconScale };

		const resized = svg
			.replace(/viewBox="[^"]*"/, `viewBox="${center.x - halfW} ${center.y - halfH} ${paddedW} ${paddedH}"`)
			.replace(/width="[^"]*"/, `width="${size.width}"`)
			.replace(/height="[^"]*"/, `height="${size.height}"`)
			.replace('<svg ', '<svg style="overflow: visible" ');

		cursors[name] = { icon: resized, center, size };
	}

	export const illustratedTypes = Object.keys(cursors) as Property.Cursor[];

	export function cursorSize(type: Property.Cursor): { width: number; height: number } {
		return (cursors[type] ?? cursors.default!).size;
	}

	export function cursorCssValue(
		type: Property.Cursor,
		primary: string,
		secondary: string,
		fallback: string
	): string {
		const entry = cursors[type] ?? cursors.default!;
		const svg = entry.icon
			.replace(/<g filter="[^"]*">/, '<g>')
			.replace(/<defs>[\s\S]*?<\/defs>/, '')
			.replaceAll('var(--cursor-primary, currentColor)', primary)
			.replaceAll('currentColor', secondary);
		const encoded = encodeURIComponent(svg);
		return `url("data:image/svg+xml,${encoded}") ${entry.size.width / 2} ${entry.size.height / 2}, ${fallback}`;
	}
</script>

<script lang="ts">
	let {
		type,
		color,
		secondaryColor,
		x,
		y,
		scale = 1,
		opacity = 1
	}: {
		type: Property.Cursor;
		color: string;
		secondaryColor?: string;
		x: number;
		y: number;
		scale?: number;
		opacity?: number;
	} = $props();

	let entry = $derived(cursors[type] ?? cursors.default!);
	let translate = $derived(
		`translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`
	);
	let resolvedSecondary = $derived(secondaryColor ?? color);
</script>

<div
	class="pointer-events-none absolute top-0 left-0"
	style="color: {resolvedSecondary}; --cursor-primary: {color}; opacity: {opacity}; transform: {translate}"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html entry.icon}
</div>
