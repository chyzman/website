export type DetectedType = 'pointer' | 'text' | 'default';

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

export function detectCursorType(
	target: Element | null,
	x: number,
	y: number
): { type: DetectedType; link: Element | null } {
	if (!target) return { type: 'default', link: null };
	const link = target.closest?.('a[href]') ?? null;
	if (link) return { type: 'pointer', link };

	return { type: isOverText(x, y) ? 'text' : 'default', link: null };
}
