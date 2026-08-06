import { patch, presence } from './room.svelte';

/**
 * A reactive value that's shared with everyone else in the current room.
 * Assigning `.value` broadcasts it; `.others` reactively reflects everyone
 * else's current value for the same key (only connections that have set it).
 */
export function synced<T>(key: string, initial: T) {
	let value = $state(initial);
	return {
		get value() {
			return value;
		},
		set value(v: T) {
			value = v;
			patch({ [key]: v });
		},
		get others(): Record<string, T> {
			const result: Record<string, T> = {};
			for (const [id, state] of Object.entries(presence)) {
				if (key in state) result[id] = state[key] as T;
			}
			return result;
		}
	};
}
