<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
    import {SvelteMap, SvelteSet} from "svelte/reactivity";
	import * as perfectCursorsPkg from 'perfect-cursors';
	import type { PerfectCursor as PerfectCursorType } from 'perfect-cursors';
	const { PerfectCursor } = perfectCursorsPkg;
	import Cursor from './Cursor.svelte';
	import type { Property } from 'csstype';
	import { connect, disconnect, switchRoom } from '$lib/multiplayer/room.svelte';
	import { synced } from '$lib/multiplayer/synced.svelte';
	import { linkId } from '$lib/multiplayer/linkId';
	import {
		color,
		DEFAULT_COLOR,
		secondaryColor,
		DEFAULT_SECONDARY_COLOR
	} from '$lib/multiplayer/settings.svelte';
	import { readViewportState, toContainerRelative, toDocumentSpace } from './positioning';
	import { detectCursorType } from './cursorType';
	import {
		resolveSelectionRects,
		serializeSelection,
		type SerializedRange
	} from '$lib/multiplayer/selectionPath';
	import { idle, network, debounce, cursor } from './tuning';

	const pos = synced('pos', null as { x: number; y: number } | null);
	const hovering = synced('hovering', null as string | null);
	const cursorType = synced<Property.Cursor>('cursorType', 'default');
	const selection = synced('selection', null as SerializedRange | null);

	let origin = $state({ left: 0, top: 0 });
	let docSize = $state({ width: 0, height: 0 });
	let viewportScale = $state(1);
	function measureDocSize() {
		docSize = {
			width: document.documentElement.scrollWidth,
			height: document.documentElement.scrollHeight
		};
	}

	const cursorAnimators = new SvelteMap<string, PerfectCursorType>();
	let lastFed = new SvelteMap<string, string>();
	let smoothed = $state<Record<string, { x: number; y: number }>>({});
	$effect(() => {
		const activeIds = new SvelteSet<string>();
		for (const [id, p] of Object.entries(pos.others)) {
			if (!p) continue;
			activeIds.add(id);
			const key = `${p.x},${p.y}`;
			if (lastFed.get(id) === key) continue;
			lastFed.set(id, key);
			let animator = cursorAnimators.get(id);
			if (!animator) {
				animator = new PerfectCursor((point) => {
					smoothed[id] = { x: point[0], y: point[1] };
				});
				cursorAnimators.set(id, animator);
			}
			animator.addPoint([p.x, p.y]);
		}
		for (const [id, animator] of cursorAnimators) {
			if (!activeIds.has(id)) {
				animator.dispose();
				cursorAnimators.delete(id);
				lastFed.delete(id);
				delete smoothed[id];
			}
		}
	});

	const lastActiveAt = synced<number | null>('lastActiveAt', null);
	let now = $state(Date.now());

	function idleFactor(id: string): number {
		const last = lastActiveAt.others[id];
		if (last == null) return 1;
		const idleMs = now - last;
		if (idleMs <= idle.graceMs) return 1;
		return 1 - Math.min(1, (idleMs - idle.graceMs) / idle.fadeMs);
	}

	type CursorEntry = {
		id: string;
		x: number;
		y: number;
		type: Property.Cursor;
		color: string;
		secondaryColor: string;
	};
	let cursorEntries = $derived.by((): CursorEntry[] => {
		const entries: CursorEntry[] = [];
		for (const [id, p] of Object.entries(pos.others)) {
			if (p) {
				const sm = smoothed[id];
				entries.push({
					id,
					x: sm ? sm.x : p.x,
					y: sm ? sm.y : p.y,
					type: cursorType.others[id] ?? 'default',
					color: color.others[id] ?? DEFAULT_COLOR,
					secondaryColor: secondaryColor.others[id] ?? DEFAULT_SECONDARY_COLOR
				});
			}
		}
		return entries;
	});

	let highlightRects = $state<Record<string, DOMRect[]>>({});
	function recomputeHighlights() {
		const root = document.querySelector('[data-cursor-bounds]');
		if (!root) return;
		const viewport = readViewportState();
		const next: Record<string, DOMRect[]> = {};
		for (const [id, range] of Object.entries(selection.others)) {
			if (!range) continue;
			next[id] = resolveSelectionRects(root, range).map((r) => {
				const p = toDocumentSpace(r.left, r.top, viewport);
				return new DOMRect(p.x, p.y, r.width, r.height);
			});
		}
		highlightRects = next;
	}

	function measureOrigin() {
		const el = document.querySelector('[data-cursor-bounds]');
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const p = toDocumentSpace(rect.left, rect.top, readViewportState());
		origin = { left: p.x, top: p.y };
	}

	onMount(() => {
		connect(page.url.pathname);
		measureOrigin();
		measureDocSize();
		PerfectCursor.MAX_INTERVAL = cursor.perfectCursorMaxIntervalMs;

		const container = document.querySelector('[data-cursor-bounds]');
		const docResizeObserver = new ResizeObserver(measureDocSize);
		docResizeObserver.observe(document.documentElement);

		function currentVvState() {
			const vv = window.visualViewport;
			return { left: vv?.offsetLeft ?? 0, top: vv?.offsetTop ?? 0, scale: vv?.scale ?? 1 };
		}

		let hasClient = false;
		let lastClient = { x: 0, y: 0 };
		let lastClientVv = { left: 0, top: 0, scale: 1 };

		const idleTicker = setInterval(() => (now = Date.now()), idle.tickIntervalMs);

		let selectionTimer: ReturnType<typeof setTimeout> | undefined;
		function handleSelectionChange() {
			clearTimeout(selectionTimer);
			selectionTimer = setTimeout(() => {
				selection.value = container ? serializeSelection(container) : null;
			}, debounce.selectionMs);
		}
		document.addEventListener('selectionchange', handleSelectionChange);

		let lastSend = 0;
		function updateCursorPos(clientX: number, clientY: number) {
			const now = Date.now();
			if (now - lastSend < network.posSendIntervalMs) return;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const relative = toContainerRelative(clientX, clientY, rect);
			lastSend = now;
			pos.value = relative;
		}

		function handleMove(e: MouseEvent) {
			lastClient = { x: e.clientX, y: e.clientY };
			lastClientVv = currentVvState();
			hasClient = true;
			updateCursorPos(e.clientX, e.clientY);
			detectCursorState(e.target as Element | null, e.clientX, e.clientY);
		}
		window.addEventListener('mousemove', handleMove);

		let lastRect = container?.getBoundingClientRect() ?? { left: 0, top: 0 };
		let rafId = requestAnimationFrame(function poll() {
			const rect = container?.getBoundingClientRect();
			if (rect && (rect.left !== lastRect.left || rect.top !== lastRect.top)) {
				lastRect = { left: rect.left, top: rect.top };
				measureOrigin();
				recomputeHighlights();
			}
			viewportScale = window.visualViewport?.scale ?? 1;
			if (hasClient) {
				const vv = currentVvState();
				const screenX = (lastClient.x - lastClientVv.left) * lastClientVv.scale;
				const screenY = (lastClient.y - lastClientVv.top) * lastClientVv.scale;
				const adjustedX = screenX / vv.scale + vv.left;
				const adjustedY = screenY / vv.scale + vv.top;
				updateCursorPos(adjustedX, adjustedY);
				detectCursorState(document.elementFromPoint(adjustedX, adjustedY), adjustedX, adjustedY);
			}
			rafId = requestAnimationFrame(poll);
		});

		let pendingType: Property.Cursor = 'default';
		let debounceTimer: ReturnType<typeof setTimeout> | undefined;
		function commitCursorType(type: Property.Cursor) {
			if (type === pendingType) return;
			pendingType = type;
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				cursorType.value = type;
			}, debounce.cursorTypeMs);
		}

		function detectCursorState(target: Element | null, x: number, y: number) {
			const { type, link } = detectCursorType(target, x, y);
			hovering.value = link ? linkId(link) : null;
			commitCursorType(type);
			document.documentElement.style.setProperty(
				'--cursor-icon-active',
				type === 'text' ? 'var(--cursor-icon-text, text)' : ''
			);
		}
		function handleOut(e: MouseEvent) {
			if (!e.relatedTarget) {
				hovering.value = null;
				commitCursorType('default');
				document.documentElement.style.setProperty('--cursor-icon-active', '');
			}
		}
		window.addEventListener('mouseout', handleOut);

		onDestroy(() => {
			cancelAnimationFrame(rafId);
			docResizeObserver.disconnect();
			clearInterval(idleTicker);
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseout', handleOut);
			document.removeEventListener('selectionchange', handleSelectionChange);
			clearTimeout(debounceTimer);
			clearTimeout(selectionTimer);
			for (const animator of cursorAnimators.values()) animator.dispose();
			cursorAnimators.clear();
			disconnect();
		});
	});

	$effect(() => {
		switchRoom(page.url.pathname);
		measureOrigin();
		measureDocSize();
		recomputeHighlights();
	});

	$effect(() => {
		const hoveredIds = new SvelteSet(Object.values(hovering.others));
		if (hovering.value) hoveredIds.add(hovering.value);

		for (const link of document.querySelectorAll('a[href]')) {
			const id = linkId(link);
			link.classList.toggle('hover-active', id !== null && hoveredIds.has(id));
		}
	});

	$effect(() => {
		void Object.values(selection.others);
		recomputeHighlights();
	});
</script>

<div
	class="pointer-events-none absolute top-0 left-0 -z-10"
	style="width: {docSize.width}px; height: {docSize.height}px;"
>
	{#each Object.entries(highlightRects) as [id, rects] (id)}
		{@const rectColor = color.others[id] ?? DEFAULT_COLOR}
		{#each rects as rect, i (i)}
			<div
				class="absolute opacity-25"
				style="left: {rect.left}px; top: {rect.top - 2}px; width: {rect.width}px; height: {rect.height +
					4}px; background-color: {rectColor};"
			></div>
		{/each}
	{/each}
</div>

<div
	class="pointer-events-none absolute top-0 left-0 z-50 overflow-hidden"
	style="width: {docSize.width}px; height: {docSize.height}px;"
>
	{#each cursorEntries as entry (entry.id)}
		{@const opacity = cursor.remoteOpacity * idleFactor(entry.id)}
		{#if opacity > 0}
			<Cursor
				type={entry.type}
				color={entry.color}
				secondaryColor={entry.secondaryColor}
				x={origin.left + entry.x}
				y={origin.top + entry.y}
				scale={1 / viewportScale}
				{opacity}
			/>
		{/if}
	{/each}
</div>
