import PartySocket from 'partysocket';

export type PresenceState = Record<string, unknown>;

/** Host of the party worker, shared by the WebSocket connection and plain HTTP calls to it. */
export const partyHost = import.meta.env.VITE_PARTY_HOST ?? 'localhost:8788';

type ServerMessage =
	| { type: 'init'; presence: ({ id: string } & PresenceState)[] }
	| ({ type: 'presence'; id: string } & PresenceState)
	| { type: 'leave'; id: string };

/** Reactive map of every other connection's presence state, keyed by connection id. */
export const presence = $state<Record<string, PresenceState>>({});

let socket: PartySocket | undefined;

function roomForPath(pathname: string) {
	const slug = pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]/g, '-');
	return slug || 'home';
}

function clearPresence() {
	for (const key of Object.keys(presence)) delete presence[key];
}

export function connect(pathname: string) {
	socket = new PartySocket({
		host: partyHost,
		party: 'cursor-room',
		room: roomForPath(pathname)
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

/** Switch to the room for a different page, if it's not already the active one. */
export function switchRoom(pathname: string) {
	if (!socket) return;
	const room = roomForPath(pathname);
	if (socket.room === room) return;
	clearPresence();
	socket.updateProperties({ room });
	socket.reconnect();
}

/** Merge fields into your own presence state, syncing them to everyone else in the room. */
export function patch(fields: PresenceState) {
	socket?.send(JSON.stringify({ type: 'patch', ...fields }));
}

export function disconnect() {
	socket?.close();
	socket = undefined;
	clearPresence();
}
