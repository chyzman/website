<script lang="ts">
	let {
		color,
		onsubmit,
		oncancel
	}: {
		color: string;
		onsubmit: (text: string) => void;
		oncancel: () => void;
	} = $props();

	const placeholder = 'Say something…';
	let text = $state('');
	let el: HTMLDivElement | undefined = $state();

	$effect(() => {
		el?.focus();
	});

	function handleInput() {
		text = el?.textContent ?? '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			const trimmed = text.trim();
			if (trimmed) onsubmit(trimmed);
			else oncancel();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			oncancel();
		}
	}
</script>

<div
	bind:this={el}
	contenteditable="plaintext-only"
	role="textbox"
	tabindex="0"
	oninput={handleInput}
	onkeydown={handleKeydown}
	onblur={oncancel}
	data-placeholder={placeholder}
	class="pointer-events-auto rounded-md bg-canvas px-2 py-1 text-xs whitespace-nowrap shadow outline-none empty:before:content-[attr(data-placeholder)]"
	style="color: {color};"
></div>
