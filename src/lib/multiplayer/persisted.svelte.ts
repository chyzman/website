import { partyHost } from './room.svelte';
import { synced } from './synced.svelte';

const STORAGE_KEY = 'chyz:state';

type Envelope = { data: Record<string, unknown>; token: string };

function readEnvelope(storage: Storage): Envelope | null {
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Envelope;
	} catch {
		return null;
	}
}

function loadData(): Record<string, unknown> {
	if (typeof sessionStorage === 'undefined' || typeof localStorage === 'undefined') return {};
	// this tab's own session takes priority, so multiple tabs open at once
	// don't clobber each other — falls back to the shared cross-tab value
	// for a tab that hasn't set anything itself yet this session
	const envelope = readEnvelope(sessionStorage) ?? readEnvelope(localStorage);
	return envelope?.data ?? {};
}

let localData = loadData();

async function persist() {
	const res = await fetch(`http://${partyHost}/state/sign`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(localData)
	});
	const { token } = (await res.json()) as { token: string };
	const serialized = JSON.stringify({ data: localData, token } satisfies Envelope);
	// always write both — session as this tab's own priority copy, local as
	// the shared fallback any new tab starts from
	sessionStorage.setItem(STORAGE_KEY, serialized);
	localStorage.setItem(STORAGE_KEY, serialized);
}

/**
 * Like `synced()`, but also persists your own value across visits (session
 * storage taking priority over local storage — see loadData above), signed
 * by the server so it can be trusted later if something needs to enforce it.
 * Nothing verifies the signature yet — that only matters once a field actually
 * needs to be tamper-resistant, at which point whatever checks it calls
 * verifyState().
 */
export function persisted<T>(key: string, initial: T) {
	const startValue = key in localData ? (localData[key] as T) : initial;
	const s = synced(key, startValue);
	// synced()'s initial value only seeds local state, it doesn't broadcast —
	// go through the setter once so a value restored from storage actually
	// reaches other people instead of just sitting there locally until it
	// next happens to change
	s.value = startValue;

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
