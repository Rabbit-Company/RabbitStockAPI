import { Trading212Client } from "./trading212";
import { StockCache } from "./cache";
import { validateEnvironment } from "./utils";
import { Web } from "@rabbit-company/web";
import { Logger } from "./logger";
import { cors } from "@rabbit-company/web-middleware/cors";
import { logger } from "@rabbit-company/web-middleware/logger";
import { Algorithm, rateLimit } from "@rabbit-company/web-middleware/rate-limit";

const { apiKey, apiSecret } = validateEnvironment();
const config = {
	apiKey,
	apiSecret,
	baseUrl: "https://live.trading212.com",
};

const host = process.env.SERVER_HOST || "0.0.0.0";
const port = parseInt(process.env.SERVER_PORT || "3000") || 3000;

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

app.use(
	rateLimit({
		algorithm: Algorithm.FIXED_WINDOW,
		windowMs: 10 * 1000, // 10 seconds
		max: 10,
	})
);

app.get("/", (c) => {
	return c.json({
		message: "RabbitStockAPI is running",
		stocksCount: stockCache.getStockCount(),
		instrumentsCount: stockCache.getInstrumentCount(),
		lastUpdate: new Date().toISOString(),
	});
});

app.get("/stocks", (c) => {
	return c.json(stockCache.getStocks());
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

		setInterval(updateStockPrices, 10000);

		Logger.info("RabbitStockAPI started successfully");
		Logger.info("Server running on http://localhost:3000");
		Logger.info("Available endpoints:");
		Logger.info("	GET /          - Health check");
		Logger.info("	GET /stocks    - Stock data");
	} catch (error: any) {
		Logger.error("Failed to initialize application", error);
		process.exit(1);
	}
}

app.listen({
	hostname: host,
	port: port,
});

initializeApp().catch(Logger.error);
