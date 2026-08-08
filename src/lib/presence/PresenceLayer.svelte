<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
    import {SvelteMap, SvelteSet} from "svelte/reactivity";
	import * as perfectCursorsPkg from 'perfect-cursors';
	import type { PerfectCursor as PerfectCursorType } from 'perfect-cursors';
	const { PerfectCursor } = perfectCursorsPkg;
	import Cursor, { detectCursorType } from './cursor/Cursor.svelte';
	import SelectionHighlight, {
		resolveSelectionRects,
		serializeSelection,
		type SerializedRange
	} from './selection/SelectionHighlight.svelte';
	import ChatBubbles from './chat/ChatBubbles.svelte';
	import ChatInput from './chat/ChatInput.svelte';
	import TypingIndicator from './chat/TypingIndicator.svelte';
	import type { Property } from 'csstype';
	import { connect, disconnect, switchRoom, sendChat } from '$lib/multiplayer/room.svelte';
	import { synced } from '$lib/multiplayer/synced.svelte';
	import {
		color,
		DEFAULT_PRIMARY,
		secondaryColor,
		DEFAULT_SECONDARY,
		idle,
		cursor,
		chat,
		DEBOUNCE
	} from '$lib/settings/settings.svelte';
	import { centralColor } from 'utils';
	import { UPDATE_INTERVAL, MAX_CHAT_MESSAGES, type ChatMessage } from 'shared';

	function linkId(el: Element): string | null {
		const href = el.getAttribute('href');
		if (!href) return null;
		const siblings = document.querySelectorAll(`a[href="${CSS.escape(href)}"]`);
		const index = Array.from(siblings).indexOf(el);
		return `${href}#${index}`;
	}

	type ViewportState = { scrollX: number; scrollY: number };
	function readViewportState(): ViewportState {
		return { scrollX: window.scrollX, scrollY: window.scrollY };
	}
	function toDocumentSpace(x: number, y: number, viewport: ViewportState): { x: number; y: number } {
		return { x: x + viewport.scrollX, y: y + viewport.scrollY };
	}
	function toContainerRelative(
		clientX: number,
		clientY: number,
		containerRect: { left: number; top: number }
	): { x: number; y: number } {
		return { x: clientX - containerRect.left, y: clientY - containerRect.top };
	}

	const pos = synced('pos', null as { x: number; y: number } | null);
	const hovering = synced('hovering', null as string | null);
	const cursorType = synced<Property.Cursor>('cursorType', 'default');
	const selection = synced('selection', null as SerializedRange | null);
	const chatMessages = synced<ChatMessage[]>('chatMessages', []);
	const typing = synced('typing', false);

	// chat isn't sent through the generic patch/broadcast mechanism (the
	// server owns the authoritative array and excludes the sender from its
	// own broadcast), so your own messages are tracked locally instead
	let myMessages = $state<ChatMessage[]>([]);
	let localPos = $state({ x: 0, y: 0 });
	let chatInputOpen = $state(false);

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

	let fadeOpacity = $state<Record<string, number>>({});
	let fadeDuration = $state<Record<string, number>>({});
	const fadeTimers = new SvelteMap<string, ReturnType<typeof setTimeout>>();
	const knownLastActiveAt = new SvelteMap<string, number>();

	type FadeStep = { opacity: number; duration: number };
	function scheduleFade(id: string, immediate: FadeStep, next: (FadeStep & { delay: number }) | null) {
		fadeOpacity[id] = immediate.opacity;
		fadeDuration[id] = immediate.duration;
		if (next) {
			fadeTimers.set(
				id,
				setTimeout(() => {
					fadeDuration[id] = next.duration;
					fadeOpacity[id] = next.opacity;
				}, next.delay)
			);
		}
	}

	$effect(() => {
		const activeIds = new SvelteSet<string>();
		for (const [id, last] of Object.entries(lastActiveAt.others)) {
			if (last == null) continue;
			activeIds.add(id);
			if (knownLastActiveAt.get(id) === last) continue;
			const isNew = !knownLastActiveAt.has(id);
			knownLastActiveAt.set(id, last);

			clearTimeout(fadeTimers.get(id));
			const sinceFadeStart = Date.now() - last - idle.grace;

			let immediate: FadeStep;
			let next: (FadeStep & { delay: number }) | null;
			if (sinceFadeStart < 0) {
				immediate = { opacity: 1, duration: 200 };
				next = { delay: -sinceFadeStart, opacity: 0, duration: idle.fade };
			} else if (sinceFadeStart < idle.fade) {
				immediate = { opacity: 1 - sinceFadeStart / idle.fade, duration: 0 };
				next = { delay: 0, opacity: 0, duration: idle.fade - sinceFadeStart };
			} else {
				immediate = { opacity: 0, duration: 0 };
				next = null;
			}

			if (isNew) {
				fadeOpacity[id] = 0;
				fadeDuration[id] = 0;
				setTimeout(() => scheduleFade(id, { ...immediate, duration: 200 }, next), 0);
			} else {
				scheduleFade(id, immediate, next);
			}
		}
		for (const id of knownLastActiveAt.keys()) {
			if (activeIds.has(id)) continue;
			clearTimeout(fadeTimers.get(id));
			fadeTimers.delete(id);
			knownLastActiveAt.delete(id);
			delete fadeOpacity[id];
			delete fadeDuration[id];
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
					color: color.others[id] ?? DEFAULT_PRIMARY,
					secondaryColor: secondaryColor.others[id] ?? DEFAULT_SECONDARY
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

	function submitChat(text: string) {
		chatInputOpen = false;
		typing.value = false;
		myMessages = [...myMessages, { text, sentAt: Date.now() }].slice(-MAX_CHAT_MESSAGES);
		sendChat(text);
	}
	function cancelChat() {
		chatInputOpen = false;
		typing.value = false;
	}

	onMount(() => {
		connect(page.url.pathname);
		measureOrigin();
		measureDocSize();
		PerfectCursor.MAX_INTERVAL = UPDATE_INTERVAL + 5;

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

		let selectionTimer: ReturnType<typeof setTimeout> | undefined;
		function handleSelectionChange() {
			clearTimeout(selectionTimer);
			selectionTimer = setTimeout(() => {
				selection.value = container ? serializeSelection(container) : null;
			}, DEBOUNCE);
		}
		document.addEventListener('selectionchange', handleSelectionChange);

		let lastSend = 0;
		let lastSentPos: { x: number; y: number } | null = null;
		function updateCursorPos(clientX: number, clientY: number) {
			const now = Date.now();
			if (now - lastSend < UPDATE_INTERVAL) return;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const relative = toContainerRelative(clientX, clientY, rect);
			if (lastSentPos && lastSentPos.x === relative.x && lastSentPos.y === relative.y) return;
			lastSend = now;
			lastSentPos = relative;
			pos.value = relative;
		}

		function handleMove(e: MouseEvent) {
			lastClient = { x: e.clientX, y: e.clientY };
			lastClientVv = currentVvState();
			hasClient = true;
			updateCursorPos(e.clientX, e.clientY);
			if (container) localPos = toContainerRelative(e.clientX, e.clientY, container.getBoundingClientRect());
			detectCursorState(e.target as Element | null, e.clientX, e.clientY);
		}
		window.addEventListener('mousemove', handleMove);

		function handleKeydown(e: KeyboardEvent) {
			if (chatInputOpen || (e.key !== '/' && e.key !== 'Enter')) return;
			const active = document.activeElement;
			const isEditable =
				active instanceof HTMLElement &&
				(active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
			if (isEditable) return;
			e.preventDefault();
			chatInputOpen = true;
			typing.value = true;
		}
		window.addEventListener('keydown', handleKeydown);

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
				if (container) localPos = toContainerRelative(adjustedX, adjustedY, container.getBoundingClientRect());
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
			}, DEBOUNCE);
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
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseout', handleOut);
			window.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('selectionchange', handleSelectionChange);
			clearTimeout(debounceTimer);
			clearTimeout(selectionTimer);
			for (const animator of cursorAnimators.values()) animator.dispose();
			cursorAnimators.clear();
			for (const timer of fadeTimers.values()) clearTimeout(timer);
			fadeTimers.clear();
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
		{@const rectColor = color.others[id] ?? DEFAULT_PRIMARY}
		<div
			style="opacity: {fadeOpacity[id] ?? 0}; transition: opacity {fadeDuration[id] ?? 200}ms linear;"
		>
			{#each rects as rect, i (i)}
				<SelectionHighlight {rect} color={rectColor} />
			{/each}
		</div>
	{/each}
</div>

<div
	class="pointer-events-none absolute top-0 left-0 z-50 overflow-hidden"
	style="width: {docSize.width}px; height: {docSize.height}px;"
>
	{#if myMessages.length || chatInputOpen}
		<div
			class="pointer-events-none absolute flex flex-col items-center gap-1"
			style="left: {origin.left + localPos.x}px; top: {origin.top +
				localPos.y}px; transform-origin: 50% 100%; transform: translate(-50%, calc(-100% - {12 /
				viewportScale}px)) scale({1 / viewportScale});"
		>
			<ChatBubbles messages={myMessages} color={centralColor(color.value, secondaryColor.value)} />
			{#if chatInputOpen}
				<ChatInput
					color={centralColor(color.value, secondaryColor.value)}
					onsubmit={submitChat}
					oncancel={cancelChat}
				/>
			{/if}
		</div>
	{/if}
	{#each cursorEntries as entry (entry.id)}
		{@const messages = chatMessages.others[entry.id]}
		<div
			style="opacity: {fadeOpacity[entry.id] ?? 0}; transition: opacity {fadeDuration[entry.id] ??
				200}ms linear;"
		>
			{#if messages?.length || typing.others[entry.id]}
				<div
					class="pointer-events-none absolute flex flex-col items-center gap-1"
					style="left: {origin.left + entry.x}px; top: {origin.top +
						entry.y}px; transform-origin: 50% 100%; transform: translate(-50%, calc(-100% - {12 /
						viewportScale}px)) scale({1 / viewportScale});"
				>
					{#if messages?.length}
						<ChatBubbles {messages} color={centralColor(entry.color, entry.secondaryColor)} />
					{/if}
					{#if typing.others[entry.id]}
						<TypingIndicator color={centralColor(entry.color, entry.secondaryColor)} />
					{/if}
				</div>
			{/if}
			<Cursor
				type={entry.type}
				color={entry.color}
				secondaryColor={entry.secondaryColor}
				x={origin.left + entry.x}
				y={origin.top + entry.y}
				scale={1 / viewportScale}
				opacity={cursor.remoteOpacity}
			/>
		</div>
	{/each}
</div>
