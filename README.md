# RabbitStockAPI 🐰📈

A high-performance stock API built with Bun that fetches real-time stock data from Trading212 and serves it through both REST API and WebSocket connections.

## Features

- 🚀 Blazing Fast - Built with Bun for optimal performance
- 📊 Real-time Data - Automatically updates stock prices every 10 seconds
- 🔌 WebSocket Support - Live streaming of price updates via WebSocket
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
# Server Configuration
SERVER_HOST="0.0.0.0"
SERVER_PORT=3000

# Trading212 API Credentials
# Get these from your Trading212 account dashboard
TRADING212_API_KEY=your_trading212_api_key_here
TRADING212_API_SECRET=your_trading212_api_secret_here

# Trading212 API Update Interval (in milliseconds)
# Minimum: 5000 (5 seconds) due to Trading212 API limits
# Default: 10000
UPDATE_INTERVAL=10000

# Logging Configuration
# 0 = ERROR, 1 = WARN, 2 = AUDIT, 3 = INFO, 4 = HTTP, 5 = DEBUG, 6 = VERBOSE, 7 = SILLY
# Default: 3 (INFO) - Recommended: 3 for production, 5 for development
LOGGER_LEVEL=3

# Proxy Configuration
# Important: Set this to match your deployment environment to prevent IP spoofing
# Options: "aws" (AWS ELB/ALB), "azure" (Azure), "cloudflare" (Cloudflare),
#          "gcp" (Google Cloud), "nginx" (Nginx), "vercel" (Vercel),
#          "direct" (no proxy/development), "development" (dev with proxy headers)
# Default: "direct"
PROXY=direct
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
      - TRADING212_API_KEY
      - TRADING212_API_SECRET
      - UPDATE_INTERVAL
      - LOGGER_LEVEL
      - PROXY
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
	-e UPDATE_INTERVAL=10000 \
	-e LOGGER_LEVEL=3 \
	-e PROXY=direct \
  rabbitcompany/rabbitstockapi:latest
```

## API Endpoints

### GET `/`

Health Check

```json
{
	"program": "RabbitStockAPI",
	"version": "2.0.0",
	"sourceCode": "https://github.com/Rabbit-Company/RabbitStockAPI",
	"monitorStats": {
		"stocksCount": 16,
		"instrumentsCount": 12810,
		"updateInterval": "10000ms"
	},
	"httpStats": {
		"pendingRequests": 1
	},
	"websocketStats": {
		"connections": 0,
		"subscribers": 0
	},
	"lastUpdate": "2025-11-01T10:43:26.025Z"
}
```

### GET `/prices`

Stock prices data (REST API)

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

### WebSocket `/ws`

Real-time stock price streaming via WebSocket

Connect to `ws://your-server:3000/ws` to receive live price updates.

#### Connection Example

```js
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
	console.log("Connected to RabbitStockAPI WebSocket");
};

ws.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log("Price update received:", data);
};

ws.onclose = () => {
	console.log("Disconnected from RabbitStockAPI WebSocket");
};
```

#### WebSocket Message Format

When stock prices update, you'll receive:

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
		}
	}
}
```

**Note**: The WebSocket connection is read-only. Any messages sent to the server will result in immediate disconnection with the message: "Just listen to prices and don't talk back, or I'll yeet you out of this WebSocket again!"
