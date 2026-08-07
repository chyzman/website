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
	sessionStorage.setItem(STORAGE_KEY, serialized);
	localStorage.setItem(STORAGE_KEY, serialized);
}

export function persisted<T>(key: string, initial: T) {
	const startValue = key in localData ? (localData[key] as T) : initial;
	const s = synced(key, startValue);
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
