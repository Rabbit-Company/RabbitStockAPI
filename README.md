# RabbitStockAPI 🐰📈

A high-performance stock API built with Bun that fetches real-time stock data from Trading212 and serves it through a clean REST API.

## Features

- 🚀 Blazing Fast - Built with Bun for optimal performance
- 📊 Real-time Data - Automatically updates stock prices every 10 seconds
- 🔐 Secure - Proper authentication with Trading212 API
- 🐳 Docker Ready - Easy deployment with Docker and Docker Compose
- 🏥 Health Checks - Built-in monitoring and health endpoints
- 💰 Multi-currency - Supports stocks from different currencies
- 🔄 Auto-restart - Automatic recovery on failures

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Trading212 API credentials

### Environment Variables

Create a `.env` file in your project root:

```toml
TRADING212_API_KEY=your_api_key_here
TRADING212_API_SECRET=your_api_secret_here
LOGGER_LEVEL=3
```

### Running with Docker Compose

```yml
services:
  rabbitstockapi:
    image: rabbitcompany/rabbitstockapi:latest
    container_name: rabbitstockapi
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - LOGGER_LEVEL
      - TRADING212_API_KEY
      - TRADING212_API_SECRET
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s
```

Run the service:

```bash
docker-compose up -d
```

### Manual Docker Run

```bash
docker run -d \
  --name rabbitstockapi \
  -p 3000:3000 \
  -e TRADING212_API_KEY=your_key \
  -e TRADING212_API_SECRET=your_secret \
  -e LOGGER_LEVEL=3 \
  rabbitcompany/rabbitstockapi:latest
```

## API Endpoints

### GET `/`

Health Check

```json
{
	"message": "RabbitStockAPI is running",
	"stocksCount": 16,
	"instrumentsCount": 12811,
	"lastUpdate": "2025-10-31T13:49:16.007Z"
}
```

### GET `/stocks`

Stock Data

```json
{
	"stocks": {
		"VOW3d": {
			"price": 89.93,
			"currency": "EUR",
			"updated": 1761918633611
		},
		"NET": {
			"price": 241.77,
			"currency": "USD",
			"updated": 1761918633611
		},
		"UBNT": {
			"price": 785.08,
			"currency": "USD",
			"updated": 1761918633611
		},
		"AMD": {
			"price": 258.66,
			"currency": "USD",
			"updated": 1761918633611
		},
		"STX": {
			"price": 260.59,
			"currency": "USD",
			"updated": 1761918633611
		}
	}
}
```
