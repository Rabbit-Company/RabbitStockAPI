export interface Instrument {
	ticker: string;
	type: string;
	workingScheduleId: number;
	isin: string;
	currencyCode: string;
	name: string;
	shortName: string;
	maxOpenQuantity: number;
	addedOn: string;
}

export interface PortfolioItem {
	ticker: string;
	quantity: number;
	averagePrice: number;
	currentPrice: number;
	ppl: number;
	fxPpl: number | null;
	initialFillDate: string;
	frontend: string;
	maxBuy: number;
	maxSell: number;
	pieQuantity: number;
}

export interface StockData {
	price: number;
	currency: string;
	updated: number;
}

export interface StocksResponse {
	stocks: Record<string, StockData>;
}

export interface Trading212Config {
	apiKey: string;
	apiSecret: string;
	baseUrl: string;
}
