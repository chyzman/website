import { Server, routePartykitRequest } from "partyserver";
import type { Connection, WSMessage } from "partyserver";
import { signState } from "./sign";
import type { ChatMessage, ClientMessage, PresenceState, ServerMessage } from "shared";
import { MAX_CHAT_MESSAGES, UPDATE_INTERVAL } from "shared";

export class CursorRoom extends Server<Env> {
	#lastAccepted = new Map<string, number>();

	#rateLimited(connectionId: string, key: string): boolean {
		const rateKey = `${connectionId}:${key}`;
		const now = Date.now();
		const last = this.#lastAccepted.get(rateKey) ?? 0;
		if (now - last < UPDATE_INTERVAL) return true;
		this.#lastAccepted.set(rateKey, now);
		return false;
	}

	onConnect(connection: Connection<PresenceState>) {
		const presence: ({ id: string } & PresenceState)[] = [];
		for (const other of this.getConnections<PresenceState>()) {
			if (other.id === connection.id || !other.state) continue;
			presence.push({ id: other.id, ...other.state });
		}
		const init: ServerMessage = { type: "init", presence };
		connection.send(JSON.stringify(init));
	}

	onMessage(connection: Connection<PresenceState>, message: WSMessage) {
		if (typeof message !== "string") return;

		let parsed: ClientMessage;
		try {
			parsed = JSON.parse(message);
		} catch {
			return;
		}

		const rateKey =
			parsed.type === "patch"
				? Object.keys(parsed)
						.filter((key) => key !== "type")
						.sort()
						.join(",")
				: parsed.type;
		if (this.#rateLimited(connection.id, rateKey)) return;

		if (parsed.type === "patch") {
			this.#handlePatch(connection, parsed);
		} else if (parsed.type === "chat") {
			this.#handleChat(connection, parsed.text);
		}
	}

	#handlePatch(connection: Connection<PresenceState>, parsed: ClientMessage) {
		const fields = Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== "type"));
		const prevState: PresenceState = connection.state ?? {};
		const changed = Object.entries(fields).some(
			([key, value]) => JSON.stringify(prevState[key]) !== JSON.stringify(value)
		);
		const patch: PresenceState = changed ? { ...fields, lastActiveAt: Date.now() } : fields;

		connection.setState((prev) => ({ ...prev, ...patch }));

		const out: ServerMessage = { type: "presence", id: connection.id, ...patch };
		this.broadcast(JSON.stringify(out), [connection.id]);
	}

	#handleChat(connection: Connection<PresenceState>, text: string) {
		const prevState: PresenceState = connection.state ?? {};
		const prevMessages = (prevState.chatMessages as ChatMessage[] | undefined) ?? [];
		const message: ChatMessage = { text, sentAt: Date.now() };
		const chatMessages = [...prevMessages, message].slice(-MAX_CHAT_MESSAGES);
		const lastActiveAt = Date.now();

		connection.setState((prev) => ({ ...prev, chatMessages, lastActiveAt }));

		const out: ServerMessage = { type: "presence", id: connection.id, chatMessages, lastActiveAt };
		this.broadcast(JSON.stringify(out), [connection.id]);
	}

	onClose(connection: Connection) {
		for (const key of this.#lastAccepted.keys()) {
			if (key.startsWith(`${connection.id}:`)) this.#lastAccepted.delete(key);
		}
		const out: ServerMessage = { type: "leave", id: connection.id };
		this.broadcast(JSON.stringify(out), [connection.id]);
	}
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/state/sign" && request.method === "POST") {
			const data = await request.json();
			const token = await signState(data, env.STATE_SECRET);
			return new Response(JSON.stringify({ token }), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*"
				}
			});
		}

		return (
			(await routePartykitRequest(request, env)) ??
			new Response("Not found", { status: 404 })
		);
	},
} satisfies ExportedHandler<Env>;
