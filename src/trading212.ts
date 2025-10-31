import type { Instrument, PortfolioItem, Trading212Config } from "./types";
import { encodeBasicAuth } from "./utils";

export class Trading212Client {
	private config: Trading212Config;
	private authHeader: string;

	constructor(config: Trading212Config) {
		this.config = config;
		this.authHeader = encodeBasicAuth(config.apiKey, config.apiSecret);
	}

	private async request<T>(endpoint: string): Promise<T> {
		const url = `${this.config.baseUrl}${endpoint}`;
		const response = await fetch(url, {
			headers: {
				Authorization: this.authHeader,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return response.json() as T;
	}

	async getInstruments(): Promise<Instrument[]> {
		return this.request<Instrument[]>("/api/v0/equity/metadata/instruments");
	}

	async getPortfolio(): Promise<PortfolioItem[]> {
		return this.request<PortfolioItem[]>("/api/v0/equity/portfolio");
	}
}
