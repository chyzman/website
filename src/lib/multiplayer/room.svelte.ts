import PartySocket from 'partysocket';
import type { PresenceState, ServerMessage } from 'shared';

export type { PresenceState };

// deriving this from wherever the site happens to be running would break
// under preview deployments (unrelated auto-generated hostnames), so the
// real address is explicit and only ever declared once, in party's own
// wrangler.jsonc route config - VITE_SYNC_HOST just has to match it
export function partyBase(): { host: string; protocol: 'http' | 'https' } {
	const host = import.meta.env.VITE_SYNC_HOST ?? (import.meta.env.DEV ? 'localhost:8787' : undefined);
	if (!host) {
		throw new Error(
			'VITE_SYNC_HOST is not set - see party/wrangler.jsonc for the address it needs to match'
		);
	}
	return { host, protocol: import.meta.env.DEV ? 'http' : 'https' };
}

export const presence = $state<Record<string, PresenceState>>({});

let socket: PartySocket | undefined;
let myState: PresenceState = {};

function roomForPath(pathname: string) {
	const slug = pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]/g, '-');
	return slug || 'home';
}

function clearPresence() {
	for (const key of Object.keys(presence)) delete presence[key];
}

export function connect(pathname: string) {
	const { host, protocol } = partyBase();
	socket = new PartySocket({
		host,
		protocol: protocol === 'https' ? 'wss' : 'ws',
		party: 'cursor-room',
		room: roomForPath(pathname)
	});

	socket.addEventListener('open', () => {
		if (Object.keys(myState).length > 0) {
			socket!.send(JSON.stringify({ type: 'patch', ...myState }));
		}
	});

	socket.addEventListener('message', (event) => {
		const msg: ServerMessage = JSON.parse(event.data);
		if (msg.type === 'init') {
			clearPresence();
			for (const p of msg.presence) {
				const { id, ...state } = p;
				presence[id] = state;
			}
		} else if (msg.type === 'presence') {
			const { id } = msg;
			const patchFields: PresenceState = Object.fromEntries(
				Object.entries(msg).filter(([key]) => key !== 'type' && key !== 'id')
			);
			presence[id] = { ...presence[id], ...patchFields };
		} else if (msg.type === 'leave') {
			delete presence[msg.id];
		}
	});
}

export function switchRoom(pathname: string) {
	if (!socket) return;
	const room = roomForPath(pathname);
	if (socket.room === room) return;
	clearPresence();
	socket.updateProperties({ room });
	socket.reconnect();
}

export function patch(fields: PresenceState) {
	myState = { ...myState, ...fields };
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({ type: 'patch', ...fields }));
	}
}

export function sendChat(text: string) {
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({ type: 'chat', text }));
	}
}

export function disconnect() {
	socket?.close();
	socket = undefined;
	myState = {};
	clearPresence();
}
