export type Fade = { opacity: number; fadeMs: number };

export function combineFade(a: Fade, b: Fade): Fade {
	return { opacity: a.opacity * b.opacity, fadeMs: Math.max(a.fadeMs, b.fadeMs) };
}
