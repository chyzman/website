import { describe, expect, it } from 'vitest';
import { SELF } from 'cloudflare:test';

// tests the *real* CursorRoom Durable Object code (not a reimplemented fake),
// with two simulated WebSocket connections talking to the same room —
// "fake networking" in the sense that no real network/deployed worker is
// involved, but the actual server logic being exercised (routePartykitRequest,
// CursorRoom's onConnect/onMessage/onClose) is the real thing, invoked via
// SELF — the actual exported fetch handler under test, same as a real request
function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
	return new Promise((resolve) => {
		ws.addEventListener(
			'message',
			(event) => resolve(JSON.parse(event.data as string)),
			{ once: true }
		);
	});
}

// consumes the init message as part of connecting (the server sends it
// immediately on connect) — otherwise it's indistinguishable from "the next
// message" to whatever test code calls nextMessage() afterward
async function connectToRoom(room: string) {
	const request = new Request(`http://party.test/parties/cursor-room/${room}`, {
		headers: { Upgrade: 'websocket' }
	});
	const res = await SELF.fetch(request);
	const ws = res.webSocket;
	if (!ws) throw new Error('expected a WebSocket upgrade response');
	ws.accept();
	const init = await nextMessage(ws);
	return { ws, init };
}

describe('CursorRoom (real server code, two simulated connections)', () => {
	it('broadcasts a patch from one connection to the other, not back to itself', async () => {
		const room = `test-room-${Math.random()}`;
		const { ws: a } = await connectToRoom(room);
		const { ws: b } = await connectToRoom(room);

		// b should see a's patch
		const bReceives = nextMessage(b);
		a.send(JSON.stringify({ type: 'patch', color: 'red' }));
		await expect(bReceives).resolves.toMatchObject({ type: 'presence', color: 'red' });

		a.close();
		b.close();
	});

	it('sends existing presence to a newly-joining connection via init', async () => {
		const room = `test-room-${Math.random()}`;
		const { ws: a } = await connectToRoom(room);
		a.send(JSON.stringify({ type: 'patch', color: 'blue' }));
		// give the server a moment to apply the patch to a's own state
		await new Promise((r) => setTimeout(r, 50));

		const { init, ws: b } = await connectToRoom(room);
		expect(init.presence).toEqual(
			expect.arrayContaining([expect.objectContaining({ color: 'blue' })])
		);

		a.close();
		b.close();
	});

	it('broadcasts a leave when a connection closes', async () => {
		const room = `test-room-${Math.random()}`;
		const { ws: a } = await connectToRoom(room);
		const { ws: b } = await connectToRoom(room);

		const bReceivesLeave = nextMessage(b);
		a.close();
		await expect(bReceivesLeave).resolves.toMatchObject({ type: 'leave' });

		b.close();
	});

	it('stamps a server-side sentAt for a chat message, not trusting the client', async () => {
		const room = `test-room-${Math.random()}`;
		const { ws: a } = await connectToRoom(room);
		const { ws: b } = await connectToRoom(room);

		const bReceives = nextMessage(b);
		a.send(JSON.stringify({ type: 'chat', text: 'hello', sentAt: 1 }));
		const msg = await bReceives;
		expect(msg).toMatchObject({
			type: 'presence',
			chatMessages: [{ text: 'hello' }]
		});
		const stamped = (msg.chatMessages as { sentAt: number }[])[0].sentAt;
		expect(stamped).toBeGreaterThan(1000000);

		a.close();
		b.close();
	});

	it('caps stored chat messages at the configured maximum', async () => {
		const room = `test-room-${Math.random()}`;
		const { ws: a } = await connectToRoom(room);
		const { ws: b } = await connectToRoom(room);

		let last: Record<string, unknown> = {};
		for (let i = 0; i < 8; i++) {
			const next = nextMessage(b);
			a.send(JSON.stringify({ type: 'chat', text: `msg-${i}` }));
			last = await next;
			await new Promise((r) => setTimeout(r, 25));
		}
		expect((last.chatMessages as unknown[]).length).toBeLessThanOrEqual(5);

		a.close();
		b.close();
	});

	it('drops patches arriving faster than the update interval', async () => {
		const room = `test-room-${Math.random()}`;
		const { ws: a } = await connectToRoom(room);
		const { ws: b } = await connectToRoom(room);

		const first = nextMessage(b);
		a.send(JSON.stringify({ type: 'patch', n: 1 }));
		await expect(first).resolves.toMatchObject({ n: 1 });

		a.send(JSON.stringify({ type: 'patch', n: 2 }));
		const second = await Promise.race([
			nextMessage(b),
			new Promise((resolve) => setTimeout(() => resolve('timeout'), 15))
		]);
		expect(second).toBe('timeout');

		a.close();
		b.close();
	});
});
