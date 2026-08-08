<script module lang="ts">
	import type { Property } from 'csstype';
	import { XMLParser } from 'fast-xml-parser';
	import { cursor as tuning } from '$lib/settings/settings.svelte';
	import { centralColor } from 'utils';

	const iconFiles = import.meta.glob('./assets/*.svg', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	const xmlParser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
		parseAttributeValue: true
	});

	type CursorEntry = {
		icon: string;
		hotspotFraction: { x: number; y: number };
		size: { width: number; height: number };
	};

	const cursors: Partial<Record<Property.Cursor, CursorEntry>> = {};

	for (const [path, svg] of Object.entries(iconFiles)) {
		const name = path.match(/([^/]+)\.svg$/)?.[1] as Property.Cursor | undefined;
		if (!name) continue;

		const parsed = xmlParser.parse(svg) as {
			svg?: { viewBox?: string; hotspot?: { x: number; y: number } };
		};
		const viewBox = parsed.svg?.viewBox?.split(' ').map(Number);
		if (!viewBox || viewBox.length !== 4) continue;
		const [vx, vy, vw, vh] = viewBox;

		const hotspot = parsed.svg?.hotspot ?? { x: vx + vw / 2, y: vy + vh / 2 };
		const hotspotFraction = { x: (hotspot.x - vx) / vw, y: (hotspot.y - vy) / vh };
		const size = { width: vw * tuning.iconScale, height: vh * tuning.iconScale };

		const resized = svg
			.replace(/width="[^"]*"/, `width="${size.width}"`)
			.replace(/height="[^"]*"/, `height="${size.height}"`);

		cursors[name] = { icon: resized, hotspotFraction, size };
	}

	export const illustratedTypes = Object.keys(cursors) as Property.Cursor[];

	export function cursorSize(type: Property.Cursor): { width: number; height: number } {
		return (cursors[type] ?? cursors.default!).size;
	}

	export function cursorHotspotFraction(type: Property.Cursor): { x: number; y: number } {
		return (cursors[type] ?? cursors.default!).hotspotFraction;
	}

	export function cursorCssValue(
		type: Property.Cursor,
		primary: string,
		secondary: string,
		fallback: string
	): string {
		const entry = cursors[type] ?? cursors.default!;
		const central = centralColor(primary, secondary);
		const svg = entry.icon
			.replace(/<g filter="[^"]*">/, '<g>')
			.replace(/<defs>[\s\S]*?<\/defs>/, '')
			.replaceAll('var(--cursor-primary, currentColor)', primary)
			.replaceAll('var(--cursor-secondary, currentColor)', secondary)
			.replaceAll('var(--cursor-central, currentColor)', central);
		const encoded = encodeURIComponent(svg);
		const hx = entry.hotspotFraction.x * entry.size.width;
		const hy = entry.hotspotFraction.y * entry.size.height;
		return `url("data:image/svg+xml,${encoded}") ${hx} ${hy}, ${fallback}`;
	}

	export type DetectedType = 'pointer' | 'text' | 'default';

	function isOverText(x: number, y: number): boolean {
		let range: Range | null = null;
		if (document.caretRangeFromPoint) {
			range = document.caretRangeFromPoint(x, y);
		} else if (document.caretPositionFromPoint) {
			const caret = document.caretPositionFromPoint(x, y);
			if (caret) {
				range = document.createRange();
				range.setStart(caret.offsetNode, caret.offset);
				range.collapse(true);
			}
		}
		if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return false;

		const full = document.createRange();
		full.selectNodeContents(range.startContainer);
		for (const rect of full.getClientRects()) {
			if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
				return true;
			}
		}
		return false;
	}

	export function detectCursorType(
		target: Element | null,
		x: number,
		y: number
	): { type: DetectedType; link: Element | null } {
		if (!target) return { type: 'default', link: null };
		const link = target.closest?.('a[href]') ?? null;
		if (link) return { type: 'pointer', link };

		return { type: isOverText(x, y) ? 'text' : 'default', link: null };
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
		opacity = 1,
		fadeMs = 200
	}: {
		type: Property.Cursor;
		color: string;
		secondaryColor?: string;
		x: number;
		y: number;
		scale?: number;
		opacity?: number;
		fadeMs?: number;
	} = $props();

	let entry = $derived(cursors[type] ?? cursors.default!);
	let translate = $derived(
		`translate(${x - entry.hotspotFraction.x * entry.size.width}px, ${y - entry.hotspotFraction.y * entry.size.height}px) scale(${scale})`
	);
	let transformOrigin = $derived(
		`${entry.hotspotFraction.x * 100}% ${entry.hotspotFraction.y * 100}%`
	);
	let resolvedSecondary = $derived(secondaryColor ?? color);
	let central = $derived(centralColor(color, resolvedSecondary));
</script>

<div
	class="pointer-events-none absolute top-0 left-0"
	style="--cursor-primary: {color}; --cursor-secondary: {resolvedSecondary}; --cursor-central: {central}; opacity: {opacity}; transition: opacity {fadeMs}ms linear; transform-origin: {transformOrigin}; transform: {translate}"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html entry.icon}
</div>
