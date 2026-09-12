import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to sign Binance requests
function signBinanceQuery(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
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
      riskEngine: true,
      orderManager: true,
      reconciliation: true,
      auditLogger: true
    }
  });
});

// 2. Binance Public Tickers Proxy (CORS & Rate limit protection)
app.get("/api/binance/tickers", async (req, res) => {
  try {
    const marketType = (req.query.marketType as string) || "USDT_M_FUTURES";
    const endpoint = marketType === "USDT_M_FUTURES"
      ? "https://fapi.binance.com/fapi/v1/ticker/24hr"
      : "https://api.binance.com/api/v3/ticker/24hr";

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4500) });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Binance API ticker request failed", status: response.status });
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch tickers" });
  }
});

// 3. Binance Klines Proxy
app.get("/api/binance/klines", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "BTCUSDT";
    const interval = (req.query.interval as string) || "15m";
    const limit = (req.query.limit as string) || "100";
    const marketType = (req.query.marketType as string) || "USDT_M_FUTURES";

    const baseUrl = marketType === "USDT_M_FUTURES"
      ? `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      : `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(4500) });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Klines fetch failed", status: response.status });
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch klines" });
  }
});

// 4. Live Order Execution Proxy (Secure Server-Side signing)
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

// 5. Positions & Account Proxy
app.get("/api/binance/positions", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    // Return empty list if keys are not set, not an error
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Behavioral Bot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
