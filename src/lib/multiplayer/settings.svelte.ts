import { persisted } from './persisted.svelte';

export const DEFAULT_COLOR = 'oklch(85% 0.18 100)';
export const DEFAULT_SECONDARY_COLOR = 'black';

export const color = persisted('color', DEFAULT_COLOR);
export const secondaryColor = persisted('secondaryColor', DEFAULT_SECONDARY_COLOR);
