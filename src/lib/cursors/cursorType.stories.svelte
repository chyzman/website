<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import { detectCursorType } from './cursorType';

	const { Story } = defineMeta({
		title: 'Cursors/cursorType'
	});

	function center(el: Element) {
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}

	// real fixture markup, matching the site's actual --cursor-hint rules
	// (a { --cursor-hint: pointer }, text elements { --cursor-hint: text }) —
	// this needs a real browser (not jsdom), since real text layout/hit-testing
	// is exactly what had actual bugs (I-beam outside real glyphs, hover
	// flicker at link edges)
	async function testDetection({ canvasElement }: { canvasElement: HTMLElement }) {
		const canvas = within(canvasElement);

		const link = canvas.getByTestId('test-link');
		const linkCenter = center(link);
		const { type: linkType } = detectCursorType(linkCenter.x, linkCenter.y);
		await expect(linkType).toBe('pointer');

		// sampled near the top of the paragraph's first line specifically, not
		// its vertical center — if the text wraps to multiple lines, the
		// bounding box's center can land in the gap *between* lines instead of
		// on any actual glyph, which isOverText correctly reports as false
		const paragraph = canvas.getByTestId('test-paragraph');
		const pRect = paragraph.getBoundingClientRect();
		const { type: textType } = detectCursorType(pRect.left + 10, pRect.top + 8);
		await expect(textType).toBe('text');

		const emptySpace = canvas.getByTestId('empty-space');
		const emptyCenter = center(emptySpace);
		const { type: emptyType } = detectCursorType(emptyCenter.x, emptyCenter.y);
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
