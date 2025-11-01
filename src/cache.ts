import { server } from ".";
import type { Instrument, PortfolioItem, StockData, StocksResponse } from "./types";
import { extractSymbol } from "./utils";

export class StockCache {
	private stocks: Record<string, StockData> = {};
	private instruments: Map<string, string> = new Map(); // ticker -> currencyCode

	updateInstruments(instruments: Instrument[]): void {
		this.instruments.clear();
		instruments.forEach((instrument) => {
			this.instruments.set(instrument.ticker, instrument.currencyCode);
		});
	}

	updateStocks(portfolio: PortfolioItem[]): void {
		const timestamp = Date.now();
		const newStocks: Record<string, StockData> = {};

		portfolio.forEach((item) => {
			const symbol = extractSymbol(item.ticker);
			const currency = this.instruments.get(item.ticker) || "UNKNOWN";

			newStocks[symbol] = {
				price: item.currentPrice,
				currency,
				updated: timestamp,
			};

			server.publish(symbol, JSON.stringify({ event: "update", symbol: symbol, data: newStocks[symbol] }));
		});

		this.stocks = newStocks;
	}

	getStocks(): StocksResponse {
		return { stocks: { ...this.stocks } };
	}

	getSymbols(): string[] {
		return Object.keys(this.stocks);
	}

	getStockCount(): number {
		return Object.keys(this.stocks).length;
	}

	getInstrumentCount(): number {
		return this.instruments.size;
	}
}
