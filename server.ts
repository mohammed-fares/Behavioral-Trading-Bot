import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to sign Binance requests
function signBinanceQuery(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

// ----------------------------------------------------
// Memory File Storage (Phase 5)
// ----------------------------------------------------
const MEMORY_FILE = path.join(process.cwd(), "data", "memory.json");

function readMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read memory file:", err);
  }
  return {
    patterns: [],
    swings: [],
    trades: [],
    closedTrades: [],
    activeTrades: [],
    decisions: [],
    hourlyReports: [],
    disqualifiedPatterns: [],
    stats: {
      balance: 100,
      initialBalance: 100,
      equity: 100,
      realizedPnL: 0,
      winCount: 0,
      lossCount: 0,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdownPct: 0,
      consecutiveLosses: 0,
      todayLossUsd: 0
    }
  };
}

function writeMemory(data: any): boolean {
  try {
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write memory file:", err);
    return false;
  }
}

// 1. Health & Server Sync Endpoint
app.get("/api/health", (req, res) => {
  const serverTime = Date.now();
  const hasBinanceKey = Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);

  res.json({
    status: "ok",
    serverTime,
    environment: process.env.NODE_ENV || "development",
    binanceConfigured: hasBinanceKey,
    uptimeSeconds: Math.floor(process.uptime()),
    features: {
      marketDataLayer: true,
      webSocketServer: true,
      memoryPersistence: true,
      riskEngine: true,
      orderManager: true,
      reconciliation: true,
      auditLogger: true
    }
  });
});

// 2. Memory Persistence Endpoints (Phase 5)
app.get("/api/memory", (req, res) => {
  const memory = readMemory();
  res.json({ success: true, data: memory });
});

app.post("/api/memory", (req, res) => {
  try {
    const body = req.body;
    let current = readMemory();

    if (body.key && body.value !== undefined) {
      current[body.key] = body.value;
    } else if (body.data && typeof body.data === "object") {
      current = { ...current, ...body.data };
    } else if (typeof body === "object") {
      current = { ...current, ...body };
    }

    const ok = writeMemory(current);
    if (!ok) {
      return res.status(500).json({ success: false, error: "Failed to persist memory to disk" });
    }
    res.json({ success: true, timestamp: Date.now() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to update memory" });
  }
});

// 2.5. Binance Ping Proxy
app.get("/api/binance/ping", async (req, res) => {
  try {
    const response = await fetch("https://fapi.binance.com/fapi/v1/ping", { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      return res.json({ success: true, serverTime: Date.now() });
    }
  } catch (_) {}
  try {
    const spotRes = await fetch("https://api.binance.com/api/v3/ping", { signal: AbortSignal.timeout(4000) });
    if (spotRes.ok) {
      return res.json({ success: true, serverTime: Date.now() });
    }
  } catch (_) {}
  res.status(503).json({ success: false, error: "Binance unreachable" });
});

// 3. Binance Public Tickers Proxy (CORS & Rate limit protection)
app.get("/api/binance/tickers", async (req, res) => {
  try {
    const marketType = (req.query.marketType as string) || "USDT_M_FUTURES";
    const endpoint = marketType === "USDT_M_FUTURES"
      ? "https://fapi.binance.com/fapi/v1/ticker/24hr"
      : "https://api.binance.com/api/v3/ticker/24hr";

    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(7000) });
      if (response.ok) {
        const data = await response.json();
        return res.json({ success: true, data });
      }
    } catch (_) {}

    // Fallback to spot if futures ticker request encounters transient glitch
    const fallbackEndpoint = "https://api.binance.com/api/v3/ticker/24hr";
    const fallbackRes = await fetch(fallbackEndpoint, { signal: AbortSignal.timeout(7000) });
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      return res.json({ success: true, data, fallback: true });
    }
    res.status(502).json({ success: false, error: "Both Binance futures and spot tickers failed" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch tickers" });
  }
});

// 4. Binance Klines Proxy
app.get("/api/binance/klines", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "BTCUSDT";
    const interval = (req.query.interval as string) || "15m";
    const limit = (req.query.limit as string) || "100";
    const marketType = (req.query.marketType as string) || "USDT_M_FUTURES";
    const startTime = req.query.startTime ? `&startTime=${req.query.startTime}` : "";
    const endTime = req.query.endTime ? `&endTime=${req.query.endTime}` : "";

    const baseUrl = marketType === "USDT_M_FUTURES"
      ? `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${startTime}${endTime}`
      : `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${startTime}${endTime}`;

    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(7000) });
      if (response.ok) {
        const data = await response.json();
        return res.json({ success: true, data });
      }
    } catch (_) {}

    // Fallback to spot klines if futures encounters rate-limit or network hiccup
    const spotUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${startTime}${endTime}`;
    const spotRes = await fetch(spotUrl, { signal: AbortSignal.timeout(7000) });
    if (spotRes.ok) {
      const data = await spotRes.json();
      return res.json({ success: true, data, fallback: true });
    }

    res.status(502).json({ error: "Klines fetch failed across both Futures and Spot endpoints" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch klines" });
  }
});

// 5. Live Order Execution Proxy (Secure Server-Side signing)
app.post("/api/binance/order", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(403).json({
      success: false,
      error: "Binance API keys not configured on server. Live orders require BINANCE_API_KEY and BINANCE_API_SECRET in environment settings."
    });
  }

  try {
    const { symbol, side, type, quantity, price, stopPrice, newClientOrderId, marketType } = req.body;
    const isFutures = marketType !== "SPOT";
    const timestamp = Date.now();

    const params: Record<string, string> = {
      symbol: symbol || "BTCUSDT",
      side: side || "BUY",
      type: type || "MARKET",
      quantity: quantity.toString(),
      timestamp: timestamp.toString(),
      recvWindow: "5000"
    };

    if (newClientOrderId) params.newClientOrderId = newClientOrderId;
    if (price && type === "LIMIT") {
      params.price = price.toString();
      params.timeInForce = "GTC";
    }
    if (stopPrice) {
      params.stopPrice = stopPrice.toString();
    }

    const queryString = Object.keys(params)
      .map(k => `${k}=${encodeURIComponent(params[k])}`)
      .join("&");
    const signature = signBinanceQuery(queryString, apiSecret);

    const fullUrl = isFutures
      ? `https://fapi.binance.com/fapi/v1/order?${queryString}&signature=${signature}`
      : `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`;

    const binanceRes = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": apiKey
      }
    });

    const result = await binanceRes.json();
    if (!binanceRes.ok) {
      return res.status(binanceRes.status).json({ success: false, error: result.msg || "Binance order rejected", data: result });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to place order" });
  }
});

// 6. Positions & Account Proxy
app.get("/api/binance/positions", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.json({ success: true, positions: [], configured: false });
  }

  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = signBinanceQuery(queryString, apiSecret);

    const url = `https://fapi.binance.com/fapi/v2/positionRisk?${queryString}&signature=${signature}`;
    const response = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey }
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ success: false, error: err.msg || "Position risk fetch failed" });
    }

    const data = await response.json();
    res.json({ success: true, positions: data, configured: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch positions" });
  }
});

// ----------------------------------------------------
// WebSocket Server for Real-Time Streaming (Phase 3)
// ----------------------------------------------------
const wss = new WebSocketServer({ server, path: "/ws/market" });

const activeSymbols = new Set([
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 
  'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT'
]);

let binanceWs: WebSocket | null = null;
let reconnectTimer: any = null;

function connectBinanceWs() {
  if (binanceWs) {
    try { binanceWs.terminate(); } catch (_) {}
    binanceWs = null;
  }

  try {
    binanceWs = new WebSocket("wss://fstream.binance.com/ws/!ticker@arr");

    binanceWs.on("open", () => {
      console.log("[WebSocket] Upstream Binance stream connected");
    });

    binanceWs.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (Array.isArray(data)) {
          const filtered = data
            .filter((t: any) => activeSymbols.has(t.s))
            .map((t: any) => ({
              symbol: t.s,
              lastPrice: parseFloat(t.c || "0"),
              bid: parseFloat(t.b || "0"),
              ask: parseFloat(t.a || "0"),
              high24h: parseFloat(t.h || "0"),
              low24h: parseFloat(t.l || "0"),
              volume24h: parseFloat(t.q || "0"),
              change24h: parseFloat(t.P || "0"),
              timestamp: t.E || Date.now()
            }));

          if (filtered.length > 0) {
            const messageStr = JSON.stringify({
              type: "TICKERS_UPDATE",
              tickers: filtered,
              timestamp: Date.now()
            });

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
              }
            });
          }
        }
      } catch (_) {
        // ignore parse glitch
      }
    });

    binanceWs.on("close", () => {
      console.log("[WebSocket] Binance stream disconnected, reconnecting in 3s...");
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectBinanceWs, 3000);
    });

    binanceWs.on("error", (err) => {
      console.warn("[WebSocket] Binance stream error:", err.message);
      try { binanceWs?.close(); } catch (_) {}
    });
  } catch (err: any) {
    console.warn("[WebSocket] Binance connection error:", err?.message || err);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectBinanceWs, 5000);
  }
}

connectBinanceWs();

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ 
    type: "WELCOME", 
    message: "Behavioral Trading Bot Real-Time Stream Connected", 
    timestamp: Date.now() 
  }));

  ws.on("message", (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      } else if (parsed.type === "SUBSCRIBE" && parsed.symbols) {
        if (Array.isArray(parsed.symbols)) {
          parsed.symbols.forEach((s: string) => activeSymbols.add(s.toUpperCase()));
        }
      }
    } catch (_) {}
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: [
            "**/data/**",
            "**/data/**/*",
            "**/data/memory.json",
            "**/*.json",
            "**/logs/**",
            /[/\\]data[/\\]/,
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Behavioral Bot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
