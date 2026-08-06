async function importKey(secret: string) {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"]
	);
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
	let str = "";
	for (const byte of new Uint8Array(bytes)) str += String.fromCharCode(byte);
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const str = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
	const bytes = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
	return bytes;
}

/** Sign arbitrary JSON-serializable data. Only holders of `secret` can produce a valid token for it. */
export async function signState(data: unknown, secret: string): Promise<string> {
	const key = await importKey(secret);
	const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(data)));
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
	return `${payload}.${toBase64Url(signature)}`;
}

/** Verify a token produced by signState, returning the original data, or null if invalid/tampered. */
export async function verifyState(token: string, secret: string): Promise<unknown | null> {
	const [payload, signature] = token.split(".");
	if (!payload || !signature) return null;

	const key = await importKey(secret);
	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		fromBase64Url(signature),
		new TextEncoder().encode(payload)
	);
	if (!valid) return null;

	try {
		return JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
	} catch {
		return null;
	}
}
