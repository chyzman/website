// Pure position-math, deliberately kept separate from CursorLayer.svelte and
// its `window.*` reads — this is the actual logic that kept getting subtly
// wrong across several rounds of live pinch-zoom debugging. Pulling it out
// as pure functions (explicit inputs, no hidden global reads) makes it
// something we can verify with fixed/fake inputs (see PositionDebug.stories),
// instead of only being able to check it by physically re-pinch-zooming.

export type ViewportState = {
	/** window.scrollX — regular document scroll. */
	scrollX: number;
	/** window.scrollY — regular document scroll. */
	scrollY: number;
	/**
	 * window.visualViewport?.offsetLeft ?? 0 — how far the visual viewport has
	 * panned within the layout viewport during pinch-zoom. Doesn't move
	 * scrollX/Y at all, so without this, panning while zoomed is invisible
	 * to toDocumentSpace entirely (the actual cause of the "cursor left
	 * behind until you move the mouse" bug).
	 */
	visualViewportOffsetLeft: number;
	/** window.visualViewport?.offsetTop ?? 0 — see visualViewportOffsetLeft. */
	visualViewportOffsetTop: number;
};

/** Reads the current live viewport state directly from `window`. */
export function readViewportState(): ViewportState {
	const vv = window.visualViewport;
	return {
		scrollX: window.scrollX,
		scrollY: window.scrollY,
		visualViewportOffsetLeft: vv?.offsetLeft ?? 0,
		visualViewportOffsetTop: vv?.offsetTop ?? 0
	};
}

/**
 * Converts a viewport-relative point (e.g. from getBoundingClientRect()) into
 * document-relative terms — the one place this conversion happens, used
 * uniformly for rendering everyone (including yourself) instead of separate
 * implementations that can silently drift apart.
 */
export function toDocumentSpace(
	x: number,
	y: number,
	viewport: ViewportState
): { x: number; y: number } {
	return {
		x: x + viewport.scrollX + viewport.visualViewportOffsetLeft,
		y: y + viewport.scrollY + viewport.visualViewportOffsetTop
	};
}

/**
 * Converts a viewport-relative point into position relative to a container's
 * own top-left corner. Deliberately doesn't need scroll/visualViewport at
 * all — clientX and a freshly-measured container rect are always in the same
 * live viewport-relative frame at any given instant, so subtracting them
 * directly is scroll/zoom/pan-invariant with nothing else needed.
 */
export function toContainerRelative(
	clientX: number,
	clientY: number,
	containerRect: { left: number; top: number }
): { x: number; y: number } {
	return { x: clientX - containerRect.left, y: clientY - containerRect.top };
}
