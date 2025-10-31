export function extractSymbol(ticker: string): string {
	const parts = ticker.split("_");
	return parts[0] || "";
}

export function encodeBasicAuth(apiKey: string, apiSecret: string): string {
	const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
	return `Basic ${credentials}`;
}

export function validateEnvironment(): { apiKey: string; apiSecret: string } {
	const apiKey = process.env.TRADING212_API_KEY;
	const apiSecret = process.env.TRADING212_API_SECRET;

	if (!apiKey || !apiSecret) {
		throw new Error("Missing API_KEY or API_SECRET environment variables");
	}

	return { apiKey, apiSecret };
}
