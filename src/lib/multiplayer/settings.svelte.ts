import { persisted } from './persisted.svelte';

// matches the current --color-accent value in layout.css, so nothing visually
// changes until there's actually a UI to pick a different one
export const DEFAULT_COLOR = 'oklch(85% 0.18 100)';
// matches the original icons' own line-art color until there's a UI to
// pick a real secondary - `--color-ink` is wrong here since it's a *light*
// tone (this is a dark-mode site), not the black outline these icons want
export const DEFAULT_SECONDARY_COLOR = 'black';

/**
 * The user's own primary accent color — drives every use of --color-accent
 * (links, selection, hover) for themselves, and the fill/background layer of
 * two-tone cursor icons (see Cursor.svelte's --cursor-primary). Synced so
 * everyone else's cursor/selection renders in *their* chosen color too. No
 * UI to change it yet, but persisted() + synced() underneath are real.
 */
export const color = persisted('color', DEFAULT_COLOR);

/**
 * The user's own secondary cursor color — used for the outline/line-art
 * layer of two-tone cursor icons. Independent from `color`, same
 * persisted/synced setup, no UI yet either.
 */
export const secondaryColor = persisted('secondaryColor', DEFAULT_SECONDARY_COLOR);
