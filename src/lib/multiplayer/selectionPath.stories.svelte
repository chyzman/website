<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import { serializeSelection, resolveSelectionRects } from './selectionPath';

	const { Story } = defineMeta({
		title: 'Multiplayer/selectionPath'
	});

	// programmatically selects from (startEl, startOffset) to (endEl, endOffset)
	// — real DOM Selection/Range APIs, fully scriptable (unlike real zoom gestures)
	function selectText(startEl: Node, startOffset: number, endEl: Node, endOffset: number) {
		const range = document.createRange();
		range.setStart(startEl, startOffset);
		range.setEnd(endEl, endOffset);
		const sel = window.getSelection()!;
		sel.removeAllRanges();
		sel.addRange(range);
	}

	function firstTextNode(el: Element): Text {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const node = walker.nextNode();
		if (!node) throw new Error('no text node found');
		return node as Text;
	}
</script>

<!-- regression coverage for the real bugs found debugging this: rects that
     shouldn't bridge across real gaps (separate nav links), rects that
     should merge (a link embedded directly in a sentence), and avoiding
     full-container-width boxes for fully-selected block elements. needs a
     real browser — this is exactly the DOM layout/hit-testing logic that
     had actual bugs, jsdom's layout engine isn't faithful enough -->

<Story
	name="Separate links on the same line stay separate, not bridged"
	asChild
	play={async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const root = canvas.getByTestId('root');
		const a = canvas.getByTestId('link-a');
		const b = canvas.getByTestId('link-b');

		selectText(firstTextNode(a), 0, firstTextNode(b), firstTextNode(b).length);
		const serialized = serializeSelection(root);
		if (!serialized) throw new Error('expected a serialized selection');
		const rects = resolveSelectionRects(root, serialized);

		// two separate links with a real gap between them should stay as two
		// distinct boxes, not get bridged into one spanning both
		await expect(rects.length).toBe(2);
	}}
>
	<nav data-testid="root" style="display: flex; gap: 24px;">
		<a href="/a" data-testid="link-a">Home</a>
		<a href="/b" data-testid="link-b">Projects</a>
	</nav>
</Story>

<Story
	name="A link embedded in a sentence merges with surrounding text"
	asChild
	play={async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const root = canvas.getByTestId('root');
		const p = canvas.getByTestId('paragraph');

		// select the whole sentence, including the embedded link with no gap
		// around it — should read as one continuous line, not split boxes
		const first = firstTextNode(p);
		let last: Text = first;
		const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
		let node;
		while ((node = walker.nextNode())) last = node as Text;

		selectText(first, 0, last, last.length);
		const serialized = serializeSelection(root);
		if (!serialized) throw new Error('expected a serialized selection');
		const rects = resolveSelectionRects(root, serialized);

		await expect(rects.length).toBe(1);
	}}
>
	<div data-testid="root">
		<p data-testid="paragraph">click <a href="/here">here</a> now</p>
	</div>
</Story>

<Story
	name="Fully-selected heading stays tight, not full container width"
	asChild
	play={async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const root = canvas.getByTestId('root');
		const h1 = canvas.getByTestId('heading');
		const p = canvas.getByTestId('paragraph');

		// select from the heading through the paragraph — the heading is fully
		// contained, which is exactly the case that used to produce a
		// full-container-width box instead of a tight one
		selectText(firstTextNode(h1), 0, firstTextNode(p), firstTextNode(p).length);
		const serialized = serializeSelection(root);
		if (!serialized) throw new Error('expected a serialized selection');
		const rects = resolveSelectionRects(root, serialized);

		const headingRect = rects[0];
		const containerWidth = root.getBoundingClientRect().width;
		await expect(headingRect.width).toBeLessThan(containerWidth * 0.5);
	}}
>
	<div data-testid="root" style="width: 500px;">
		<h1 data-testid="heading">hi</h1>
		<p data-testid="paragraph">more text down here</p>
	</div>
</Story>
