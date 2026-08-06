import { Server, routePartykitRequest } from "partyserver";
import type { Connection, WSMessage } from "partyserver";
import { signState } from "./sign";

type PresenceState = Record<string, unknown>;

type ClientMessage = { type: "patch" } & PresenceState;

type ServerMessage =
	| { type: "init"; presence: ({ id: string } & PresenceState)[] }
	| ({ type: "presence"; id: string } & PresenceState)
	| { type: "leave"; id: string };

export class CursorRoom extends Server<Env> {
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
		if (parsed.type !== "patch") return;
		const patch: PresenceState = Object.fromEntries(
			Object.entries(parsed).filter(([key]) => key !== "type")
		);

		connection.setState((prev) => ({ ...prev, ...patch }));

		const out: ServerMessage = { type: "presence", id: connection.id, ...patch };
		this.broadcast(JSON.stringify(out), [connection.id]);
	}

	onClose(connection: Connection) {
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
