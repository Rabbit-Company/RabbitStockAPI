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
		ws.subscribe("prices");
	},
	message(ws) {
		ws.close(1008, "Just listen to prices and don't talk back, or I'll yeet you out of this WebSocket again!");
	},
	close(ws) {
		ws.unsubscribe("prices");
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
				subscribers: server.subscriberCount("prices"),
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
		server.publish("prices", JSON.stringify(stockCache.getStocks()));
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

const server = await app.listen({
	hostname: host,
	port: port,
});

initializeApp().catch(Logger.error);
