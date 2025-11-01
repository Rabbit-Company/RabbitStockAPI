import { Trading212Client } from "./trading212";
import { StockCache } from "./cache";
import { validateEnvironment } from "./utils";
import { Web } from "@rabbit-company/web";
import { Logger } from "./logger";
import { cors } from "@rabbit-company/web-middleware/cors";
import { logger } from "@rabbit-company/web-middleware/logger";
import { IP_EXTRACTION_PRESETS, ipExtract } from "@rabbit-company/web-middleware/ip-extract";
import type { CloudProvider } from "./types";
import pkg from "../package.json" with { type: "json" };

const { apiKey, apiSecret } = validateEnvironment();
const config = {
	apiKey,
	apiSecret,
	baseUrl: "https://live.trading212.com",
};

const host = process.env.SERVER_HOST || "0.0.0.0";
const port = parseInt(process.env.SERVER_PORT || "3000") || 3000;
const proxy = Object.keys(IP_EXTRACTION_PRESETS).includes(process.env.PROXY || "direct") ? (process.env.PROXY as CloudProvider) : "direct";
const updateInterval = parseInt(process.env.UPDATE_INTERVAL || "10000") || 10000;
const actualInterval = Math.max(updateInterval, 5000);

if (updateInterval < 5000) {
	Logger.warn(`Update interval too low: ${updateInterval}ms. Using minimum 5000ms for Trading212 API compliance`);
}

const tradingClient = new Trading212Client(config);
const stockCache = new StockCache();

const app = new Web();

app.use(
	logger({
		logger: Logger,
		logResponses: false,
	})
);

app.use(
	cors({
		allowMethods: ["GET"],
	})
);

app.use(ipExtract(proxy));

app.websocket({
	idleTimeout: 120,
	maxPayloadLength: 1024 * 1024, // 1 MB
	open(ws) {
		ws.send(
			JSON.stringify({
				event: "connected",
				message: "Welcome! Use { action: 'subscribe', symbols: ['UBNT', 'NET'] } to receive price updates for specified symbols.",
			})
		);
	},
	message(ws, message) {
		if (typeof message !== "string") return;

		let data: any;
		try {
			data = JSON.parse(message);
		} catch {
			ws.send(JSON.stringify({ event: "error", message: "Invalid JSON" }));
			return;
		}

		if (!data || typeof data.action !== "string") {
			ws.send(JSON.stringify({ event: "error", message: "Missing 'action' field" }));
			return;
		}

		const validSymbols = stockCache.getSymbols();
		const isValidSymbol = (s: any) => typeof s === "string" && validSymbols.includes(s);

		if (data.action === "ping") {
			ws.send(JSON.stringify({ event: "pong", timestamp: Date.now() }));
		} else if (data.action === "subscribe") {
			if (!Array.isArray(data.symbols)) {
				ws.send(JSON.stringify({ event: "error", message: "Expected 'symbols' array" }));
				return;
			}
			const symbols: string[] = data.symbols.filter(isValidSymbol);
			symbols.forEach((symbol) => ws.subscribe(symbol));

			ws.send(JSON.stringify({ event: "subscribed", symbols }));
		} else if (data.action === "unsubscribe") {
			if (!Array.isArray(data.symbols)) {
				ws.send(JSON.stringify({ event: "error", message: "Expected 'symbols' array" }));
				return;
			}
			const symbols: string[] = data.symbols.filter(isValidSymbol);
			symbols.forEach((symbol) => ws.unsubscribe(symbol));

			ws.send(JSON.stringify({ event: "unsubscribed", symbols }));
		} else {
			ws.send(JSON.stringify({ event: "error", message: "Unknown action" }));
		}
	},
	close(ws) {
		ws.send?.(JSON.stringify({ event: "disconnected", message: "Connection closed." }));
	},
});

app.get("/ws", (ctx) => {
	if (ctx.req.headers.get("upgrade") === "websocket") {
		return new Response(null, { status: 101 });
	}
	return ctx.text("Use WebSocket protocol to connect");
});

app.get("/", (c) => {
	return c.json(
		{
			program: "RabbitStockAPI",
			version: pkg.version,
			sourceCode: "https://github.com/Rabbit-Company/RabbitStockAPI",
			monitorStats: {
				stocksCount: stockCache.getStockCount(),
				instrumentsCount: stockCache.getInstrumentCount(),
				updateInterval: `${actualInterval}ms`,
			},
			httpStats: {
				pendingRequests: server.pendingRequests,
			},
			websocketStats: {
				connections: server.pendingWebSockets,
				subscribers: Object.fromEntries(stockCache.getSymbols().map((symbol) => [symbol, server.subscriberCount(symbol)])),
			},
			lastUpdate: new Date().toISOString(),
		},
		200,
		{ "Cache-Control": `public, s-maxage=${Math.floor(actualInterval / 2 / 1000)}, max-age=0, stale-while-revalidate=300, stale-if-error=86400` }
	);
});

app.get("/prices", (c) => {
	return c.json(stockCache.getStocks(), 200, {
		"Cache-Control": `public, s-maxage=${Math.floor(actualInterval / 2 / 1000)}, max-age=0, stale-while-revalidate=300, stale-if-error=86400`,
	});
});

async function fetchInstruments(): Promise<void> {
	try {
		Logger.debug("Fetching instruments metadata...");
		const instruments = await tradingClient.getInstruments();
		stockCache.updateInstruments(instruments);
		Logger.debug(`Loaded ${instruments.length} instruments`);
	} catch (error: any) {
		Logger.error("Error fetching instruments", error);
		process.exit(1);
	}
}

async function updateStockPrices(): Promise<void> {
	try {
		Logger.debug("Fetching portfolio data...");
		const portfolio = await tradingClient.getPortfolio();
		stockCache.updateStocks(portfolio);
		Logger.debug(`Updated ${Object.keys(stockCache.getStocks().stocks).length} stock prices`);
	} catch (error: any) {
		Logger.error("Error updating stock prices", error);
	}
}

async function initializeApp(): Promise<void> {
	try {
		await fetchInstruments();
		await updateStockPrices();

		const actualInterval = Math.max(updateInterval, 5000);
		setInterval(updateStockPrices, actualInterval);

		Logger.info("RabbitStockAPI started successfully");
		Logger.info(`Server running on http://${host}:${port}`);
		Logger.info(`Stock updates every ${actualInterval}ms (Trading212 compliant)`);
		Logger.info("Available endpoints:");
		Logger.info("	GET /          - Health check and stats");
		Logger.info("	GET /prices    - Stock price data");
		Logger.info("	GET /ws        - WebSocket connection");
	} catch (error: any) {
		Logger.error("Failed to initialize application", error);
		process.exit(1);
	}
}

export const server = await app.listen({
	hostname: host,
	port: port,
});

initializeApp().catch(Logger.error);
