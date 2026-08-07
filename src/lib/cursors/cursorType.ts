export type DetectedType = 'pointer' | 'text' | 'default';

/**
 * Whether (x, y) is actually over rendered text glyphs, not just somewhere
 * inside a text-bearing block (which would also include empty trailing space
 * after short lines, and gaps between lines).
 */
export function isOverText(x: number, y: number): boolean {
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

	const full = document.createRange();
	full.selectNodeContents(range.startContainer);
	for (const rect of full.getClientRects()) {
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
			return true;
		}
	}
	return false;
}

/**
 * What cursor type (and, separately, which link href if any) applies at a
 * given point — any `<a href>` anywhere participates automatically, nothing
 * to opt in. `--cursor-hint` (not the real `cursor` property, which is
 * forced to `none` everywhere to hide the native cursor) carries the
 * semantic intent, so CSS stays the single source of truth for what counts
 * as "text" vs "pointer" instead of a separate tag-name check here.
 */
export function detectCursorType(
	clientX: number,
	clientY: number
): { type: DetectedType; link: Element | null } {
	const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
	if (!target) return { type: 'default', link: null };

	const link = target.closest?.('a[href]') ?? null;

	const hint = getComputedStyle(target).getPropertyValue('--cursor-hint').trim();
	if (hint === 'pointer') return { type: 'pointer', link };
	if (hint === 'text' && isOverText(clientX, clientY)) return { type: 'text', link };
	return { type: 'default', link };
}
