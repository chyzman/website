<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import { autoUpdate } from '@floating-ui/dom';
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

	// pos.x/y are pixel offsets from the content container's top-left corner —
	// the container is a fixed width, so this lines up the same for every viewer,
	// regardless of their own window size (unlike raw page coordinates would).
	const pos = synced('pos', null as { x: number; y: number } | null);
	const hovering = synced('hovering', null as string | null);
	const cursorType = synced<Property.Cursor>('cursorType', 'default');
	const selection = synced('selection', null as SerializedRange | null);

	// container-relative (same convention as pos.value, the network-synced
	// version) — updated every mousemove with no throttling, since this is
	// what renders *your own* cursor and has to feel instant, unlike pos.value
	// which is throttled for the network. Deliberately *not* document-relative:
	// origin (below) is the only place that converts to document space, used
	// uniformly for rendering everyone including yourself, rather than two
	// separate document-relative computations that can (and did) quietly drift
	let localPos = $state({ x: 0, y: 0 });
	// browsers don't report a mouse position until the first real mousemove —
	// without this, localPos's (0, 0) default would render visibly in the
	// corner until then, instead of just not showing anything yet
	let hasLocalPos = $state(false);

	let origin = $state({ left: 0, top: 0 });
	// the actual scrollable document size — overlays are sized to exactly this
	// (position: absolute, not fixed) instead of being viewport-pinned. plain
	// absolutely-positioned content zooms/pans the same predictable way normal
	// page content does; `position: fixed` does not (long-standing, inconsistent
	// cross-browser behavior specifically around pinch-zoom), which is what was
	// dragging the cursor/highlights along when panning instead of holding still
	let docSize = $state({ width: 0, height: 0 });
	function measureDocSize() {
		docSize = {
			width: document.documentElement.scrollWidth,
			height: document.documentElement.scrollHeight
		};
	}

	// remote positions arrive as discrete, throttled network updates — this
	// smooths the motion between them (spline interpolation via perfect-cursors,
	// the library tldraw uses for the same problem) instead of every update
	// being a visible small jump. your own cursor isn't smoothed at all, since
	// it's raw local mouse input and should feel instant, not eased
	const cursorAnimators = new Map<string, PerfectCursorType>();
	let lastFed = new Map<string, string>();
	let smoothed = $state<Record<string, { x: number; y: number }>>({});
	$effect(() => {
		const activeIds = new Set<string>();
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

	type CursorEntry = {
		id: string;
		x: number;
		y: number;
		type: Property.Cursor;
		color: string;
		secondaryColor: string;
	};
	// one combined list — yourself plus everyone else — rendered through the
	// exact same template below, instead of two separate implementations.
	// each person's own chosen colors travel with their entry, instead of
	// everyone sharing one static accent color
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
		// pushed last so your own cursor renders on top of everyone else's.
		// already container-relative, same as everyone else's entries — no
		// separate conversion needed here
		if (hasLocalPos) {
			entries.push({
				id: 'self',
				x: localPos.x,
				y: localPos.y,
				type: cursorType.value,
				color: color.value,
				secondaryColor: secondaryColor.value
			});
		}
		return entries;
	});

	// resolved fresh from each remote selection's path, on our own current DOM —
	// getClientRects() is always viewport-relative, converted via toDocumentSpace
	// since the highlight layer is an absolutely (not fixed) positioned overlay
	// anchored at the document's origin
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

	// same idea as above — a fresh, live measurement, converted to document-
	// relative terms only for the sake of rendering into our absolute overlay
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
		// each animated segment's duration is however long it actually took to
		// receive that update, capped at MAX_INTERVAL - the default (300ms)
		// means any network gap that large makes the cursor visibly lag behind
		// while it eases through the backlog. lower this to bound how slow a
		// single catch-up animation can ever feel, at the cost of it being
		// slightly less smooth right after a real gap
		PerfectCursor.MAX_INTERVAL = 25;
		// document size can also change from content growing/shrinking, not just
		// the window resizing (e.g. someone spawning physics objects later) —
		// ResizeObserver catches that
		const resizeObserver = new ResizeObserver(measureDocSize);
		resizeObserver.observe(document.documentElement);

		// selectionchange fires rapidly while dragging to select, so debounce
		// rather than sending on every intermediate state
		let selectionTimer: ReturnType<typeof setTimeout> | undefined;
		function handleSelectionChange() {
			clearTimeout(selectionTimer);
			selectionTimer = setTimeout(() => {
				const root = document.querySelector('[data-cursor-bounds]');
				selection.value = root ? serializeSelection(root) : null;
			}, 100);
		}
		document.addEventListener('selectionchange', handleSelectionChange);

		let lastSend = 0;
		let lastClient = { x: 0, y: 0 };
		// container-relative, via one fresh live measurement each time. clientX
		// and a fresh getBoundingClientRect() are always in the same live,
		// viewport-relative frame at any given instant, so subtracting them
		// directly is scroll/zoom/pan-invariant with nothing else needed.
		// localPos updates unthrottled (your own cursor should feel instant);
		// pos.value (the network-synced copy) is throttled separately — same
		// underlying measurement for both, computed once, instead of two
		// independent implementations that can drift apart
		function updateCursorPos(clientX: number, clientY: number) {
			const el = document.querySelector('[data-cursor-bounds]');
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const relative = toContainerRelative(clientX, clientY, rect);
			localPos = relative;
			hasLocalPos = true;

			const now = Date.now();
			if (now - lastSend < 20) return;
			lastSend = now;
			pos.value = relative;
		}

		function handleMove(e: MouseEvent) {
			lastClient = { x: e.clientX, y: e.clientY };
			updateCursorPos(e.clientX, e.clientY);
			detectCursorState(e.clientX, e.clientY);
		}
		window.addEventListener('mousemove', handleMove);

		// continuous re-measurement instead of trying to model every possible
		// cause of movement (scroll, resize, pinch-zoom pan, or the browser
		// internally trading regular scroll for visual-viewport offset — all of
		// which turned out to be unreliable to reconstruct from separate APIs).
		// floating-ui's autoUpdate does this properly (it's built specifically
		// for "reliably know when a reference element's position changed"),
		// with animationFrame:true as the fallback for cases like pinch-zoom
		// that can't be reliably observed any other way — the same rAF-polling
		// approach we built by hand, but from the library that already solved it
		const referenceEl = document.querySelector('[data-cursor-bounds]');
		const stopAutoUpdate = referenceEl
			? autoUpdate(
					referenceEl,
					null,
					() => {
						measureOrigin();
						recomputeHighlights();
						updateCursorPos(lastClient.x, lastClient.y);
					},
					{ animationFrame: true }
				)
			: undefined;

		// cursor *type* changes are debounced (position isn't) — right at the edge
		// of an element, hit-testing can flip back and forth for a moment, so we
		// wait for a type to be stable for a beat before actually committing to it,
		// instead of instantly flickering between icons
		let pendingType: Property.Cursor = 'default';
		let debounceTimer: ReturnType<typeof setTimeout> | undefined;
		function commitCursorType(type: Property.Cursor) {
			if (type === pendingType) return;
			pendingType = type;
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				cursorType.value = type;
			}, 60);
		}

		// any <a href> anywhere on the page participates automatically, nothing to opt in.
		// runs on every mousemove (not just mouseover) since your precise position
		// within the *same* element can flip between "over text" and "over empty
		// space" without ever crossing an element boundary
		function detectCursorState(clientX: number, clientY: number) {
			const { type, link } = detectCursorType(clientX, clientY);
			hovering.value = link ? linkId(link) : null;
			commitCursorType(type);
		}
		function handleOut(e: MouseEvent) {
			if (!e.relatedTarget) {
				// pointer left the whole window
				hovering.value = null;
				commitCursorType('default');
			}
		}
		window.addEventListener('mouseout', handleOut);

		onDestroy(() => {
			stopAutoUpdate?.();
			resizeObserver.disconnect();
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

	// switch rooms when navigating to a different page
	$effect(() => {
		switchRoom(page.url.pathname);
		measureOrigin();
		measureDocSize();
		recomputeHighlights();
	});

	// one mechanism decides "is this link hovered by anyone" — you or someone else
	$effect(() => {
		const hoveredIds = new SvelteSet(Object.values(hovering.others));
		if (hovering.value) hoveredIds.add(hovering.value);

		for (const link of document.querySelectorAll('a[href]')) {
			const id = linkId(link);
			link.classList.toggle('hover-active', id !== null && hoveredIds.has(id));
		}
	});

	// recompute whenever anyone's selection changes (their DOM hasn't moved,
	// but ours might resolve to different rects even for the same range)
	$effect(() => {
		void Object.values(selection.others);
		recomputeHighlights();
	});
</script>

<!-- other users' text selections — negative z-index so it paints behind normal
     content (any positive/positioned z-index always wins over unpositioned text,
     regardless of the number, so this has to go below zero to sit behind it).
     absolute + sized to the actual document, not `fixed`: plain absolutely
     positioned content zooms/pans the same predictable way normal page content
     does, `position: fixed` does not (inconsistent across browsers specifically
     around pinch-zoom), which was dragging this along while panning instead of
     holding still relative to the content -->
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

<!-- every cursor — yours and everyone else's — through one shared template,
     instead of two separate implementations that could (and did) drift apart.
     native OS cursor is hidden site-wide; yours is included here once it's had
     a real mousemove (hasLocalPos), so it doesn't show at (0, 0) beforehand -->
<div
	class="pointer-events-none absolute top-0 left-0 z-50 overflow-hidden"
	style="width: {docSize.width}px; height: {docSize.height}px;"
>
	{#each cursorEntries as entry (entry.id)}
		<Cursor
			type={entry.type}
			color={entry.color}
			secondaryColor={entry.secondaryColor}
			x={origin.left + entry.x}
			y={origin.top + entry.y}
			opacity={entry.id === 'self' ? 1 : 0.7}
		/>
	{/each}
</div>
