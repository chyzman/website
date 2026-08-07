import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/multiplayer/room.svelte', () => ({
	patch: vi.fn(),
	presence: {}
}));

import { patch, presence } from '$lib/multiplayer/room.svelte';
import { synced } from '$lib/multiplayer/synced.svelte';

describe('synced()', () => {
	beforeEach(() => {
		vi.mocked(patch).mockClear();
		for (const key of Object.keys(presence)) delete presence[key];
	});

	it('starts at the initial value', () => {
		const s = synced('example', 'default');
		expect(s.value).toBe('default');
	});

	it('updates .value locally when set', () => {
		const s = synced('example', 'default');
		s.value = 'changed';
		expect(s.value).toBe('changed');
	});

	it('broadcasts via patch() when .value is set', () => {
		const s = synced('example', 'default');
		s.value = 'changed';
		expect(patch).toHaveBeenCalledWith({ example: 'changed' });
	});

	it('does not broadcast just from being created (only from the setter)', () => {
		synced('example', 'default');
		expect(patch).not.toHaveBeenCalled();
	});

	it('.others reflects every other connection that has set this key', () => {
		presence['conn-a'] = { example: 'from a' };
		presence['conn-b'] = { example: 'from b' };
		const s = synced('example', 'default');
		expect(s.others).toEqual({ 'conn-a': 'from a', 'conn-b': 'from b' });
	});

	it('.others excludes connections that have not set this key', () => {
		presence['conn-a'] = { example: 'from a' };
		presence['conn-b'] = { someOtherKey: 'irrelevant' };
		const s = synced('example', 'default');
		expect(s.others).toEqual({ 'conn-a': 'from a' });
	});

	it('.others is scoped to its own key — unaffected by other synced() instances', () => {
		presence['conn-a'] = { color: 'red', pos: { x: 1, y: 2 } };
		const color = synced('color', 'default');
		const pos = synced('pos', null);
		expect(color.others).toEqual({ 'conn-a': 'red' });
		expect(pos.others).toEqual({ 'conn-a': { x: 1, y: 2 } });
	});

	it('.others updates when presence changes after creation', () => {
		const s = synced('example', 'default');
		expect(s.others).toEqual({});
		presence['conn-a'] = { example: 'joined later' };
		expect(s.others).toEqual({ 'conn-a': 'joined later' });
	});
});
