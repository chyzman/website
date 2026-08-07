<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import { detectCursorType } from '$lib/presence/cursor/Cursor.svelte';

	const { Story } = defineMeta({
		title: 'Cursors/cursorType'
	});

	function center(el: Element) {
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}

	async function testDetection({ canvasElement }: { canvasElement: HTMLElement }) {
		const canvas = within(canvasElement);

		const link = canvas.getByTestId('test-link');
		const linkCenter = center(link);
		const { type: linkType } = detectCursorType(link, linkCenter.x, linkCenter.y);
		await expect(linkType).toBe('pointer');

		const paragraph = canvas.getByTestId('test-paragraph');
		const pRect = paragraph.getBoundingClientRect();
		const { type: textType } = detectCursorType(paragraph, pRect.left + 10, pRect.top + 8);
		await expect(textType).toBe('text');

		const emptySpace = canvas.getByTestId('empty-space');
		const emptyCenter = center(emptySpace);
		const { type: emptyType } = detectCursorType(emptySpace, emptyCenter.x, emptyCenter.y);
		await expect(emptyType).toBe('default');
	}
</script>

<Story name="Detection" play={testDetection} asChild>
	<div style="padding: 40px; max-width: 400px;">
		<a href="/test" data-testid="test-link">A link to click</a>
		<p data-testid="test-paragraph">
			Some ordinary paragraph text, long enough to have real width.
		</p>
		<div data-testid="empty-space" style="height: 100px;"></div>
	</div>
</Story>
