export type ViewportState = {
	scrollX: number;
	scrollY: number;
};

export function readViewportState(): ViewportState {
	return { scrollX: window.scrollX, scrollY: window.scrollY };
}

export function toDocumentSpace(
	x: number,
	y: number,
	viewport: ViewportState
): { x: number; y: number } {
	return { x: x + viewport.scrollX, y: y + viewport.scrollY };
}

export function toContainerRelative(
	clientX: number,
	clientY: number,
	containerRect: { left: number; top: number }
): { x: number; y: number } {
	return { x: clientX - containerRect.left, y: clientY - containerRect.top };
}
