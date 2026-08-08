<script lang="ts">
	let { color }: { color: string } = $props();

	let dots = $state(1);

	$effect(() => {
		const interval = setInterval(() => {
			dots = (dots % 3) + 1;
		}, 400);
		return () => clearInterval(interval);
	});
</script>

<div
	class="pointer-events-none rounded-md bg-canvas px-2 py-1 text-xs whitespace-nowrap shadow"
	style="color: {color};"
>
	{'.'.repeat(dots)}
</div>
