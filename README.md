# alpaca-proxy

# Alpaca SSE Proxy

A Node.js proxy to stream Alpaca market data (SPY etc.) to WordPress via Server-Sent Events (SSE).

## Deploy to Render

1. Fork or push this repo to your GitHub.
2. In [Render](https://render.com):
   - Create new **Web Service**
   - Connect this repo
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance type: Free

3. In **Environment Variables**, add:
   - `ALPACA_KEY` = your Alpaca API key
   - `ALPACA_SECRET` = your Alpaca API secret
   - `ALPACA_STREAM_URL` = `wss://stream.data.alpaca.markets/v2/iex` (or SIP if you have access)
   - `SYMBOLS` = `SPY`
   - `PROXY_TOKEN` = any secret string (e.g. `myproxy123`)

4. After deploy, test:
   ```bash
   curl -N "https://your-service.onrender.com/stream?token=myproxy123"
