export type PresenceState = Record<string, unknown>;

export type ChatMessage = { text: string; sentAt: number };

export type ClientMessage = ({ type: 'patch' } & PresenceState) | { type: 'chat'; text: string };

export type ServerMessage =
	| { type: 'init'; presence: ({ id: string } & PresenceState)[] }
	| ({ type: 'presence'; id: string } & PresenceState)
	| { type: 'leave'; id: string };

export const UPDATE_INTERVAL = 20;
export const MAX_CHAT_MESSAGES = 5;
