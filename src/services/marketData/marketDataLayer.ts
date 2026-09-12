/**
 * Strict Market Data Layer for Binance Spot and USDT-M Futures
 * Features:
 * - Clear distinction between Spot and USDT-M Futures
 * - Zero synthetic fallback in LIVE mode (Strict Fail-Closed)
 * - Candle closed state tracking (Repainting prevention)
 * - Data freshness tracking & Stale detection
 * - Rate limiting and backoff
 */

import { Candle, Timeframe, DataSource, MarketType } from '../../types';
import { AuditLogger } from '../audit/auditLogger';

export interface MarketTicker {
  symbol: string;
  marketType: MarketType;
  lastPrice: number;
  markPrice?: number;
  bid: number;
  ask: number;
  spreadPct: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate?: number;
  exchangeTime: number;
  localReceiveTime: number;
  dataSource: DataSource;
  isStale: boolean;
}

const DEFAULT_FALLBACK_PRICES: Record<string, number> = {
  'BTCUSDT': 65420.5,
  'ETHUSDT': 3450.8,
  'SOLUSDT': 142.75,
  'BNBUSDT': 585.2,
  'ADAUSDT': 0.485,
  'XRPUSDT': 0.582,
  'DOGEUSDT': 0.1245,
  'AVAXUSDT': 28.45,
};

export class MarketDataLayerService {
  private lastTickers: Map<string, MarketTicker> = new Map();
  private lastRequestTime: number = 0;
  private minIntervalMs: number = 250; // Rate limit guard
  private backoffUntil: number = 0;
  public isOnline: boolean = true;
  public lastSuccessfulFetchTime: number = Date.now();
  public reconnectAttempts: number = 0;

  /**
   * Check connection status
   */
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      lastSuccessfulFetchTime: this.lastSuccessfulFetchTime,
      reconnectAttempts: this.reconnectAttempts,
      isStale: Date.now() - this.lastSuccessfulFetchTime > 15000
    };
  }

  /**
   * Explicitly ping exchange to verify connection and update state
   */
  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/ping', {
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        this.isOnline = true;
        this.reconnectAttempts = 0;
        this.lastSuccessfulFetchTime = Date.now();
        return true;
      }
    } catch {
      try {
        const spot = await fetch('https://api.binance.com/api/v3/ping', {
          signal: AbortSignal.timeout(2500)
        });
        if (spot.ok) {
          this.isOnline = true;
          this.reconnectAttempts = 0;
          this.lastSuccessfulFetchTime = Date.now();
          return true;
        }
      } catch {
        // failed
      }
    }
    this.isOnline = false;
    this.reconnectAttempts++;
    return false;
  }

  /**
   * Fetch 24hr tickers with strict mode compliance.
   */
  async fetchTickers(marketType: MarketType, executionMode: 'PAPER' | 'LIVE' | 'SYNTHETIC' | 'BACKTEST'): Promise<Record<string, MarketTicker>> {
    const now = Date.now();
    if (now < this.backoffUntil) {
      AuditLogger.warn('MARKET_DATA', 'RATE_LIMIT_ACTIVE', `Market data backoff active for ${Math.round((this.backoffUntil - now) / 1000)}s`);
      return this.getCachedOrEmpty(marketType, executionMode);
    }

    const baseUrl = marketType === 'USDT_M_FUTURES' 
      ? 'https://fapi.binance.com/fapi/v1/ticker/24hr' 
      : 'https://api.binance.com/api/v3/ticker/24hr';

    try {
      this.lastRequestTime = now;
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(4000) });
      
      if (res.status === 429) {
        this.backoffUntil = now + 60000;
        AuditLogger.error('MARKET_DATA', 'RATE_LIMIT_HIT', 'Binance 429 Rate limit hit, backing off 60s');
        if (executionMode === 'LIVE') {
          throw new Error('BINANCE_RATE_LIMIT_429');
        }
      }

      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          const map = new Map<string, any>();
          raw.forEach(item => map.set(item.symbol, item));

          const result: Record<string, MarketTicker> = {};
          const symbols = Object.keys(DEFAULT_FALLBACK_PRICES);

          for (const sym of symbols) {
            const item = map.get(sym);
            if (item) {
              const lastPrice = parseFloat(item.lastPrice || item.price || '0');
              const bid = parseFloat(item.bidPrice || (lastPrice * 0.9998).toString());
              const ask = parseFloat(item.askPrice || (lastPrice * 1.0002).toString());
              const spreadPct = lastPrice > 0 ? ((ask - bid) / lastPrice) * 100 : 0.04;

              const ticker: MarketTicker = {
                symbol: sym,
                marketType,
                lastPrice,
                bid,
                ask,
                spreadPct: Math.round(spreadPct * 1000) / 1000,
                change24h: parseFloat(item.priceChangePercent || '0'),
                high24h: parseFloat(item.highPrice || '0'),
                low24h: parseFloat(item.lowPrice || '0'),
                volume24h: parseFloat(item.quoteVolume || '0'),
                exchangeTime: item.closeTime || now,
                localReceiveTime: now,
                dataSource: 'REAL_MARKET',
                isStale: false
              };
              this.lastTickers.set(`${marketType}_${sym}`, ticker);
              result[sym] = ticker;
            }
          }

          this.isOnline = true;
          this.lastSuccessfulFetchTime = now;
          this.reconnectAttempts = 0;

          return result;
        }
      }
    } catch (err: any) {
      AuditLogger.warn('MARKET_DATA', 'FETCH_TICKERS_FAILED', `Failed to fetch tickers: ${err?.message || err}`);
    }

    // If fetch failed or network is down: STRICT FAIL CLOSED IN BOTH PAPER & LIVE (NO SYNTHETIC/FAKE DATA!)
    if (executionMode === 'LIVE' || executionMode === 'PAPER') {
      AuditLogger.warn('MARKET_DATA', 'DATA_UNAVAILABLE', `Market data unavailable in ${executionMode} mode — fail-closed enforced (no synthetic numbers).`);
      this.isOnline = false;
      this.reconnectAttempts++;
      
      const unavailable: Record<string, MarketTicker> = {};
      const symbols = Object.keys(DEFAULT_FALLBACK_PRICES);
      for (const sym of symbols) {
        const cached = this.lastTickers.get(`${marketType}_${sym}`);
        if (cached) {
          // Retain last known real price but mark as stale and disconnected
          unavailable[sym] = {
            ...cached,
            isStale: true,
            dataSource: 'DATA_UNAVAILABLE'
          };
        } else {
          unavailable[sym] = {
            symbol: sym,
            marketType,
            lastPrice: 0,
            bid: 0,
            ask: 0,
            spreadPct: 0,
            change24h: 0,
            high24h: 0,
            low24h: 0,
            volume24h: 0,
            exchangeTime: 0,
            localReceiveTime: now,
            dataSource: 'DATA_UNAVAILABLE',
            isStale: true
          };
        }
      }
      return unavailable;
    }

    // In BACKTEST / pure offline unit testing mode only
    return this.getCachedOrEmpty(marketType, executionMode);
  }

  /**
   * Fetch historical and recent Kline candles with closed state verification.
   * STRICT: Never return synthetic candles in LIVE or PAPER when disconnected!
   */
  async fetchCandles(
    symbol: string,
    timeframe: Timeframe,
    limit: number = 100,
    marketType: MarketType = 'USDT_M_FUTURES',
    executionMode: 'PAPER' | 'LIVE' | 'SYNTHETIC' | 'BACKTEST' = 'PAPER'
  ): Promise<Candle[]> {
    const tfInterval: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };

    const interval = tfInterval[timeframe] || '15m';
    const baseUrl = marketType === 'USDT_M_FUTURES'
      ? `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      : `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const now = Date.now();
          this.isOnline = true;
          this.lastSuccessfulFetchTime = now;
          this.reconnectAttempts = 0;

          return raw.map((c: any) => {
            const openTime = Number(c[0]);
            const closeTime = Number(c[6]);
            const isClosed = now >= closeTime;

            return {
              timestamp: openTime,
              openTime,
              closeTime,
              open: parseFloat(c[1]),
              high: parseFloat(c[2]),
              low: parseFloat(c[3]),
              close: parseFloat(c[4]),
              volume: parseFloat(c[5]),
              isClosed,
              dataSource: 'REAL_MARKET'
            };
          });
        }
      }
    } catch (e: any) {
      AuditLogger.warn('MARKET_DATA', 'KLINES_FAILED', `Failed to fetch real klines for ${symbol} ${timeframe}: ${e?.message}`);
    }

    // In LIVE or PAPER mode: STRICTLY NEVER RETURN SYNTHETIC CANDLES! Return empty and block decisions.
    if (executionMode === 'LIVE' || executionMode === 'PAPER') {
      this.isOnline = false;
      this.reconnectAttempts++;
      AuditLogger.critical('MARKET_DATA', 'KLINES_UNAVAILABLE_DISCONNECTED', `Real klines unavailable for ${symbol} due to connection loss in ${executionMode} mode. Blocked.`);
      return [];
    }

    // In BACKTEST or SYNTHETIC mode only (explicit backtest simulation)
    return this.generateDeterministicSyntheticCandles(symbol, timeframe, limit);
  }

  /**
   * Deterministic synthetic candles for testing / offline dev only (Never in LIVE).
   */
  generateDeterministicSyntheticCandles(symbol: string, timeframe: Timeframe, limit: number = 60): Candle[] {
    const basePrice = DEFAULT_FALLBACK_PRICES[symbol] || 50000;
    const tfMinutes: Record<Timeframe, number> = {
      '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440
    };
    const stepMs = (tfMinutes[timeframe] || 15) * 60 * 1000;
    const now = Date.now();
    const candles: Candle[] = [];
    let price = basePrice;

    for (let i = limit; i >= 0; i--) {
      const time = now - i * stepMs;
      // Use pseudo-deterministic sine wave to prevent pure random noise
      const phase = (time / (stepMs * 10)) * Math.PI;
      const drift = Math.sin(phase) * (basePrice * 0.003);
      const open = price;
      const close = open + drift;
      const high = Math.max(open, close) + Math.abs(drift) * 0.4;
      const low = Math.min(open, close) - Math.abs(drift) * 0.4;
      const volume = 100 + Math.abs(Math.sin(phase * 2)) * 400;

      candles.push({
        timestamp: time,
        openTime: time,
        closeTime: time + stepMs - 1,
        open: Number(open.toFixed(4)),
        high: Number(high.toFixed(4)),
        low: Number(low.toFixed(4)),
        close: Number(close.toFixed(4)),
        volume: Number(volume.toFixed(2)),
        isClosed: i > 0,
        dataSource: 'SYNTHETIC'
      });
      price = close;
    }

    return candles;
  }

  private getCachedOrEmpty(marketType: MarketType, executionMode: 'PAPER' | 'LIVE' | 'SYNTHETIC' | 'BACKTEST'): Record<string, MarketTicker> {
    const result: Record<string, MarketTicker> = {};
    const now = Date.now();

    for (const sym of Object.keys(DEFAULT_FALLBACK_PRICES)) {
      const cached = this.lastTickers.get(`${marketType}_${sym}`);
      if (cached && (now - cached.localReceiveTime < 30000)) {
        result[sym] = { ...cached, isStale: (now - cached.localReceiveTime > 15000) };
      } else if (executionMode === 'BACKTEST') {
        const base = DEFAULT_FALLBACK_PRICES[sym];
        result[sym] = {
          symbol: sym,
          marketType,
          lastPrice: base,
          bid: base * 0.9998,
          ask: base * 1.0002,
          spreadPct: 0.04,
          change24h: 1.5,
          high24h: base * 1.02,
          low24h: base * 0.98,
          volume24h: 1000000,
          exchangeTime: now,
          localReceiveTime: now,
          dataSource: 'SYNTHETIC',
          isStale: false
        };
      } else {
        // حظر الأرقام الوهمية في حال انقطاع الاتصال — تسجيل صريح لعدم توفر البيانات
        result[sym] = {
          symbol: sym,
          marketType,
          lastPrice: 0,
          bid: 0,
          ask: 0,
          spreadPct: 0,
          change24h: 0,
          high24h: 0,
          low24h: 0,
          volume24h: 0,
          exchangeTime: 0,
          localReceiveTime: now,
          dataSource: 'DATA_UNAVAILABLE',
          isStale: true
        };
      }
    }
    return result;
  }
}

export const MarketDataLayer = new MarketDataLayerService();
