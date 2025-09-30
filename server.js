import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';

const {
  PORT = process.env.PORT || 8787,
  ALPACA_KEY,
  ALPACA_SECRET,
  ALPACA_STREAM_URL = 'wss://stream.data.alpaca.markets/v2/iex',
  SYMBOLS = 'SPY',
  PROXY_TOKEN
} = process.env;

if (!ALPACA_KEY || !ALPACA_SECRET) {
  console.error('Missing ALPACA_KEY or ALPACA_SECRET in environment');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: true }));

// Track SSE clients
const clients = new Set();

function broadcast(line) {
  const data = typeof line === 'string' ? line : JSON.stringify(line);
  for (const res of clients) {
    res.write(`data: ${data}\n\n`);
  }
}

// Manage upstream WS connection
let ws = null;
let reconnectDelay = 1000;

function connect() {
  ws = new WebSocket(ALPACA_STREAM_URL);

  ws.on('open', () => {
    reconnectDelay = 1000;
    ws.send(JSON.stringify({ action: 'auth', key: ALPACA_KEY, secret: ALPACA_SECRET }));
    const trades = SYMBOLS.split(',').map(s => s.trim()).filter(Boolean);
    ws.send(JSON.stringify({ action: 'subscribe', trades }));
    console.log('Connected to Alpaca stream:', trades.join(','));
  });

  ws.on('message', (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      broadcast(msg);
    } catch (e) {
      broadcast(buf.toString());
    }
  });

  ws.on('close', () => scheduleReconnect('close'));
  ws.on('error', (err) => scheduleReconnect('error', err));
}

function scheduleReconnect(reason, err) {
  if (err) console.error('Upstream error:', err.message);
  try { ws.terminate(); } catch {}
  ws = null;
  const delay = Math.min(reconnectDelay, 30000);
  console.log(`Reconnecting in ${delay} ms due to ${reason}`);
  setTimeout(connect, delay);
  reconnectDelay *= 2;
}

connect();

// Simple health check
app.get('/', (_req, res) => res.type('text/plain').send('ok'));

// SSE endpoint
app.get('/stream', (req, res) => {
  if (PROXY_TOKEN && req.query.token !== PROXY_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');

  res.write(`: connected\n\n`);
  clients.add(res);

  const iv = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 15000);

  req.on('close', () => {
    clearInterval(iv);
    clients.delete(res);
    try { res.end(); } catch {}
  });
});

app.listen(PORT, () => {
  console.log(`SSE proxy running on port ${PORT}`);
});
