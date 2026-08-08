<script lang="ts">
	import type { ChatMessage } from 'shared';
	import { chat } from '$lib/settings/settings.svelte';

	let { messages, color }: { messages: ChatMessage[]; color: string } = $props();

	let fading = $state<Record<number, boolean>>({});
	let hidden = $state<Record<number, boolean>>({});
	const timers = new Map<number, ReturnType<typeof setTimeout>[]>();

	$effect(() => {
		const seen = new Set<number>();
		for (const m of messages) {
			seen.add(m.sentAt);
			if (timers.has(m.sentAt)) continue;
			const fadeAt = m.sentAt + chat.displayMs;
			const removeAt = fadeAt + chat.fadeMs;
			const fadeTimer = setTimeout(() => (fading[m.sentAt] = true), Math.max(0, fadeAt - Date.now()));
			const removeTimer = setTimeout(
				() => (hidden[m.sentAt] = true),
				Math.max(0, removeAt - Date.now())
			);
			timers.set(m.sentAt, [fadeTimer, removeTimer]);
		}
		for (const [sentAt, ts] of timers) {
			if (seen.has(sentAt)) continue;
			for (const t of ts) clearTimeout(t);
			timers.delete(sentAt);
			delete fading[sentAt];
			delete hidden[sentAt];
		}
	});

	let visible = $derived(messages.filter((m) => !hidden[m.sentAt]));
</script>

{#each visible as m (m.sentAt)}
	<div
		class="pointer-events-none rounded-md bg-canvas px-2 py-1 text-xs whitespace-nowrap shadow"
		style="color: {color}; opacity: {fading[m.sentAt] ? 0 : 1}; transition: opacity {chat.fadeMs}ms linear;"
	>
		{m.text}
	</div>
{/each}
