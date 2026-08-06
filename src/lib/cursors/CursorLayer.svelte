<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import defaultIcon from '$lib/assets/cursors/default.svg?raw';
	import pointerIcon from '$lib/assets/cursors/pointer.svg?raw';
	import textIcon from '$lib/assets/cursors/text.svg?raw';
	import grabIcon from '$lib/assets/cursors/grab.svg?raw';
	import grabbingIcon from '$lib/assets/cursors/grabbing.svg?raw';
	import { connect, disconnect, switchRoom } from '$lib/multiplayer/room.svelte';
	import { synced } from '$lib/multiplayer/synced.svelte';
	import { linkId } from '$lib/multiplayer/linkId';
	import {
		resolveSelectionRects,
		serializeSelection,
		type SerializedRange
	} from '$lib/multiplayer/selectionPath';

	// size/stroke-width/fill are baked into each svg file itself, since none
	// of them actually vary per instance — only position and color (via
	// currentColor, set by the wrapping element's class) do.
	// 'grab'/'grabbing' aren't set anywhere yet, reserved for when physics
	// objects can be hovered-to-grab vs actively dragged
	const cursorIcons = {
		default: defaultIcon,
		pointer: pointerIcon,
		text: textIcon,
		grab: grabIcon,
		grabbing: grabbingIcon
	};
	type CursorKind = keyof typeof cursorIcons;

	// where each icon's meaningful "hotspot" is, as a fraction of its own
	// 24x24 box — computed from each icon's actual path data, not guessed:
	// - default: arrow tip starts at (4.037, 4.688)
	// - pointer: the raised index finger peaks around (8, 2), well above
	//   and left of center, not the middle of the icon
	// - text: not a symmetric shape (see text.svg) — center is an approximation
	// - grab: tallest finger peaks around (12, 6)
	// - grabbing: a roughly symmetric fist shape, center is a fair approximation
	const cursorHotspots: Record<CursorKind, { x: number; y: number }> = {
		default: { x: 4.037 / 24, y: 4.688 / 24 },
		pointer: { x: 8 / 24, y: 2 / 24 },
		text: { x: 0.5, y: 0.5 },
		grab: { x: 12 / 24, y: 6 / 24 },
		grabbing: { x: 0.5, y: 0.5 }
	};
	const iconSize = 18;

	// pos.x/y are pixel offsets from the content container's top-left corner —
	// the container is a fixed width, so this lines up the same for every viewer,
	// regardless of their own window size (unlike raw page coordinates would).
	const pos = synced('pos', null as { x: number; y: number } | null);
	const hovering = synced('hovering', null as string | null);
	const cursorKind = synced<CursorKind>('cursorKind', 'default');
	const selection = synced('selection', null as SerializedRange | null);

	// document-relative position (clientX/Y + scroll), updated every mousemove
	// with no throttling — this is what renders *your own* cursor, so it has to
	// feel as instant as a native one. `pos.value` (network-synced) is throttled
	// separately, but both are derived the same way, through the same code path
	// below (see cursorEntries) — there's only one cursor-rendering implementation,
	// not a separate one for "you" vs "everyone else" that could drift apart
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

	type CursorEntry = { id: string; x: number; y: number; kind: CursorKind };
	// one combined list — yourself plus everyone else — rendered through the
	// exact same template below, instead of two separate implementations
	let cursorEntries = $derived.by((): CursorEntry[] => {
		const entries: CursorEntry[] = [];
		for (const [id, p] of Object.entries(pos.others)) {
			if (p) entries.push({ id, x: p.x, y: p.y, kind: cursorKind.others[id] ?? 'default' });
		}
		// pushed last so your own cursor renders on top of everyone else's
		if (hasLocalPos) {
			entries.push({
				id: 'self',
				x: localPos.x - origin.left,
				y: localPos.y - origin.top,
				kind: cursorKind.value
			});
		}
		return entries;
	});

	// resolved fresh from each remote selection's path, on our own current DOM —
	// getClientRects() is always viewport-relative; window.scrollX/Y converts
	// that to document-relative, since the highlight layer is an absolutely
	// (not fixed) positioned overlay anchored at the document's origin
	let highlightRects = $state<Record<string, DOMRect[]>>({});
	function recomputeHighlights() {
		const root = document.querySelector('[data-cursor-bounds]');
		if (!root) return;
		const next: Record<string, DOMRect[]> = {};
		for (const [id, range] of Object.entries(selection.others)) {
			if (!range) continue;
			next[id] = resolveSelectionRects(root, range).map(
				(r) => new DOMRect(r.left + window.scrollX, r.top + window.scrollY, r.width, r.height)
			);
		}
		highlightRects = next;
	}

	// same idea as above — a fresh, live measurement, converted to document-
	// relative terms only for the sake of rendering into our absolute overlay
	function measureOrigin() {
		const el = document.querySelector('[data-cursor-bounds]');
		if (!el) return;
		const rect = el.getBoundingClientRect();
		origin = { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
	}

	// whether (x, y) is actually over rendered text glyphs, not just somewhere
	// inside a text-bearing block (which would also include empty trailing
	// space after short lines, and gaps between lines)
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

		// expand to the whole text node so getClientRects reflects the actual
		// rendered line box(es), not just a zero-width caret position
		const full = document.createRange();
		full.selectNodeContents(range.startContainer);
		for (const rect of full.getClientRects()) {
			if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
				return true;
			}
		}
		return false;
	}

	onMount(() => {
		connect(page.url.pathname);
		measureOrigin();
		measureDocSize();
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

		let last = 0;
		let lastClient = { x: 0, y: 0 };
		// container-relative, via a fresh live measurement each time. clientX and
		// a fresh getBoundingClientRect() are always in the same live, viewport-
		// relative frame at any given instant, so subtracting them directly is
		// scroll/zoom/pan-invariant with nothing else needed
		function updatePos(clientX: number, clientY: number) {
			const now = Date.now();
			if (now - last < 33) return;
			last = now;
			const el = document.querySelector('[data-cursor-bounds]');
			if (!el) return;
			const rect = el.getBoundingClientRect();
			pos.value = { x: clientX - rect.left, y: clientY - rect.top };
		}
		// document-relative (matches `origin`'s convention), so cursorEntries can
		// render it the same way as everyone else's synced position
		function updateLocalPos(clientX: number, clientY: number) {
			localPos = { x: clientX + window.scrollX, y: clientY + window.scrollY };
			hasLocalPos = true;
		}

		function handleMove(e: MouseEvent) {
			lastClient = { x: e.clientX, y: e.clientY };
			updateLocalPos(e.clientX, e.clientY);
			updatePos(e.clientX, e.clientY);
			detectCursorState(e.clientX, e.clientY);
		}
		window.addEventListener('mousemove', handleMove);

		// continuous re-measurement instead of trying to model every possible
		// cause of movement (scroll, resize, pinch-zoom pan, or the browser
		// internally trading regular scroll for visual-viewport offset — all of
		// which turned out to be unreliable to reconstruct from separate APIs).
		// getBoundingClientRect() is always the live ground truth regardless of
		// the cause, so just re-read it every frame instead of reasoning about
		// which event fired
		let rafId: number;
		function tick() {
			measureOrigin();
			recomputeHighlights();
			updateLocalPos(lastClient.x, lastClient.y);
			updatePos(lastClient.x, lastClient.y);
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);

		// cursor *kind* changes are debounced (position isn't) — right at the edge
		// of an element, hit-testing can flip back and forth for a moment, so we
		// wait for a kind to be stable for a beat before actually committing to it,
		// instead of instantly flickering between icons
		let pendingKind: CursorKind = 'default';
		let debounceTimer: ReturnType<typeof setTimeout> | undefined;
		function commitCursorKind(kind: CursorKind) {
			if (kind === pendingKind) return;
			pendingKind = kind;
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				cursorKind.value = kind;
			}, 60);
		}

		// any <a href> anywhere on the page participates automatically, nothing to opt in.
		// runs on every mousemove (not just mouseover) since your precise position
		// within the *same* element can flip between "over text" and "over empty
		// space" without ever crossing an element boundary
		function detectCursorState(clientX: number, clientY: number) {
			const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
			if (!target) return;

			const link = target.closest?.('a[href]');
			hovering.value = link ? linkId(link) : null;

			// --cursor-hint (not the real `cursor` property, which we force to
			// `none` everywhere to hide the native cursor) carries the semantic
			// intent, so CSS stays the single source of truth for what counts
			// as "text" vs "pointer" instead of a separate tag-name check here
			const hint = getComputedStyle(target).getPropertyValue('--cursor-hint').trim();
			if (hint === 'pointer') {
				commitCursorKind('pointer');
			} else if (hint === 'text' && isOverText(clientX, clientY)) {
				commitCursorKind('text');
			} else {
				commitCursorKind('default');
			}
		}
		function handleOut(e: MouseEvent) {
			if (!e.relatedTarget) {
				// pointer left the whole window
				hovering.value = null;
				commitCursorKind('default');
			}
		}
		window.addEventListener('mouseout', handleOut);

		onDestroy(() => {
			cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseout', handleOut);
			document.removeEventListener('selectionchange', handleSelectionChange);
			clearTimeout(debounceTimer);
			clearTimeout(selectionTimer);
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
		{#each rects as rect, i (i)}
			<div
				class="bg-accent/25 absolute"
				style="left: {rect.left}px; top: {rect.top - 2}px; width: {rect.width}px; height: {rect.height +
					4}px;"
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
		{@const icon = cursorIcons[entry.kind]}
		{@const hotspot = cursorHotspots[entry.kind]}
		{@const translate = `translate(${origin.left + entry.x - hotspot.x * iconSize}px, ${
			origin.top + entry.y - hotspot.y * iconSize
		}px)`}
		<div
			class="text-accent absolute top-0 left-0 transition-transform duration-[30ms] ease-linear {entry.id ===
			'self'
				? 'opacity-100'
				: 'opacity-70'}"
			style="transform: {translate}"
		>
			{@html icon}
		</div>
	{/each}
</div>
