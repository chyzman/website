import PartySocket from 'partysocket';

export type PresenceState = Record<string, unknown>;

export const partyHost = import.meta.env.VITE_PARTY_HOST ?? 'localhost:8787';

type ServerMessage =
	| { type: 'init'; presence: ({ id: string } & PresenceState)[] }
	| ({ type: 'presence'; id: string } & PresenceState)
	| { type: 'leave'; id: string };

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
	socket = new PartySocket({
		host: partyHost,
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

export function disconnect() {
	socket?.close();
	socket = undefined;
	myState = {};
	clearPresence();
}
