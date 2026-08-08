import { persisted } from '$lib/multiplayer/persisted.svelte';
import { centralColor } from 'utils';

export const DEFAULT_PRIMARY = 'oklch(85% 0.18 100)';
export const DEFAULT_SECONDARY = 'black';

export const color = persisted('color', DEFAULT_PRIMARY);
export const secondaryColor = persisted('secondaryColor', DEFAULT_SECONDARY);

export type Colors = { color: string; secondaryColor: string; central: string };

export const myColors: Colors = $derived({
	color: color.value,
	secondaryColor: secondaryColor.value,
	central: centralColor(color.value, secondaryColor.value)
});

export const idle = {
	grace: 5000,
	fade: 15000
};

export const cursor = {
	remoteOpacity: 0.7,
	iconScale: 20 / 164
};

export const DEBOUNCE = 50;

export const chat = {
	displayMs: 5000,
	fadeMs: 3000
};
