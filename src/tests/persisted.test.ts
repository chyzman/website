import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$lib/multiplayer/room.svelte', () => ({
	patch: vi.fn(),
	presence: {},
	partyHost: 'test.invalid'
}));

const STORAGE_KEY = 'chyz:state';

describe('persisted()', () => {
	beforeEach(() => {
		sessionStorage.clear();
		localStorage.clear();
		vi.resetModules();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ json: async () => ({ token: 'fake-token' }) }))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('starts at the initial value when nothing is stored', async () => {
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const p = persisted('example', 'default');
		expect(p.value).toBe('default');
	});

	it('restores from localStorage when session storage is empty', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ data: { example: 'from local' }, token: 't' })
		);
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const p = persisted('example', 'default');
		expect(p.value).toBe('from local');
	});

	it('prefers session storage over local storage when both are present', async () => {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ data: { example: 'from session' }, token: 't' })
		);
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ data: { example: 'from local' }, token: 't' })
		);
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const p = persisted('example', 'default');
		expect(p.value).toBe('from session');
	});

	it('broadcasts a value restored from storage, not just future changes', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ data: { example: 'from local' }, token: 't' })
		);
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const { patch } = await import('$lib/multiplayer/room.svelte');
		persisted('example', 'default');
		expect(patch).toHaveBeenCalledWith({ example: 'from local' });
	});

	it('writes the new value to both session and local storage when set', async () => {
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const p = persisted('example', 'default');
		p.value = 'changed';
		await vi.waitFor(() => {
			expect(sessionStorage.getItem(STORAGE_KEY)).toContain('changed');
			expect(localStorage.getItem(STORAGE_KEY)).toContain('changed');
		});
	});

	it('signs with the server before persisting', async () => {
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const p = persisted('example', 'default');
		p.value = 'changed';
		await vi.waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('/state/sign'),
				expect.objectContaining({ method: 'POST' })
			);
		});
	});

	it('falls back to the initial value if stored JSON is corrupt', async () => {
		localStorage.setItem(STORAGE_KEY, 'not valid json{{{');
		const { persisted } = await import('$lib/multiplayer/persisted.svelte');
		const p = persisted('example', 'default');
		expect(p.value).toBe('default');
	});
});
