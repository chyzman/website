import { partyHost } from './room.svelte';
import { synced } from './synced.svelte';

const STORAGE_KEY = 'chyz:state';

type Envelope = { data: Record<string, unknown>; token: string };

function loadData(): Record<string, unknown> {
	if (typeof localStorage === 'undefined') return {};
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return {};
	try {
		const envelope: Envelope = JSON.parse(raw);
		return envelope.data ?? {};
	} catch {
		return {};
	}
}

let localData = loadData();

async function persist() {
	const res = await fetch(`http://${partyHost}/state/sign`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(localData)
	});
	const { token } = (await res.json()) as { token: string };
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: localData, token } satisfies Envelope));
}

/**
 * Like `synced()`, but also persists your own value across visits (in localStorage),
 * signed by the server so it can be trusted later if something needs to enforce it.
 * Nothing verifies the signature yet — that only matters once a field actually needs
 * to be tamper-resistant, at which point whatever checks it calls verifyState().
 */
export function persisted<T>(key: string, initial: T) {
	const startValue = key in localData ? (localData[key] as T) : initial;
	const s = synced(key, startValue);

	return {
		get value() {
			return s.value;
		},
		set value(v: T) {
			s.value = v;
			localData = { ...localData, [key]: v };
			void persist();
		},
		get others() {
			return s.others;
		}
	};
}
