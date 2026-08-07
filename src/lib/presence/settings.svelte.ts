import { persisted } from '$lib/multiplayer/persisted.svelte';

export const DEFAULT_COLOR = 'oklch(85% 0.18 100)';
export const DEFAULT_SECONDARY_COLOR = 'black';

export const color = persisted('color', DEFAULT_COLOR);
export const secondaryColor = persisted('secondaryColor', DEFAULT_SECONDARY_COLOR);

export const idle = {
	tickIntervalMs: 500,
	graceMs: 5000,
	fadeMs: 15000
};

export const network = {
	posSendIntervalMs: 20
};

export const debounce = {
	cursorTypeMs: 60,
	selectionMs: 100
};

export const cursor = {
	remoteOpacity: 0.7,
	iconScale: 20 / 164,
	perfectCursorMaxIntervalMs: 25
};
