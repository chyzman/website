function relativeLightness(colorString: string): number {
	if (typeof document === 'undefined') return 0.5;
	const el = document.createElement('div');
	el.style.color = colorString;
	document.body.appendChild(el);
	const resolved = getComputedStyle(el).color;
	document.body.removeChild(el);
	const match = resolved.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
	if (!match) return 0.5;
	const [r, g, b] = match.slice(1).map(Number);
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function centralColor(first: string, ...rest: string[]): string {
	let best = first;
	let bestDist = Math.abs(relativeLightness(first) - 0.5);
	for (const color of rest) {
		const dist = Math.abs(relativeLightness(color) - 0.5);
		if (dist < bestDist) {
			best = color;
			bestDist = dist;
		}
	}
	return best;
}
