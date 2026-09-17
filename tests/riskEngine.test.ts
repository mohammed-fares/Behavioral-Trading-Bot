import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../src/services/risk/riskEngine';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../src/services/seedData';
import { MarketTicker } from '../src/services/marketData/marketDataLayer';

describe('RiskEngine Invariant Tests', () => {
  const validTicker: MarketTicker = {
    symbol: 'BTCUSDT',
    marketType: 'USDT_M_FUTURES',
    lastPrice: 65000,
    bid: 64995,
    ask: 65005,
    spreadPct: 0.015,
    change24h: 1.2,
    high24h: 66000,
    low24h: 64000,
    volume24h: 5000000,
    exchangeTime: Date.now(),
    localReceiveTime: Date.now(),
    dataSource: 'REAL_MARKET',
    isStale: false,
  };

  it('should reject trade immediately when market data is unavailable (fail-closed)', () => {
    const result = RiskEngine.evaluateTrade(
      'BTCUSDT',
      'LONG',
      65000,
      1.5,
      1.0,
      [],
      DEFAULT_STATS,
      DEFAULT_SETTINGS,
      undefined // No ticker
    );

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('فشل جلب بيانات السوق الحية'))).toBe(true);
    expect(result.recommendedQuantity).toBe(0);
  });

  it('should reject trade when spread exceeds max allowed spread', () => {
    const highSpreadTicker: MarketTicker = {
      ...validTicker,
      spreadPct: 0.15, // > 0.08 limit
    };

    const result = RiskEngine.evaluateTrade(
      'BTCUSDT',
      'LONG',
      65000,
      1.5,
      1.0,
      [],
      DEFAULT_STATS,
      DEFAULT_SETTINGS,
      highSpreadTicker
    );

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('السبريد مرتفع جداً'))).toBe(true);
  });

  it('should reject trade when consecutive losses hit the maximum threshold', () => {
    const exhaustedStats = {
      ...DEFAULT_STATS,
      consecutiveLosses: DEFAULT_SETTINGS.maxConsecutiveLosses,
    };

    const result = RiskEngine.evaluateTrade(
      'BTCUSDT',
      'LONG',
      65000,
      1.5,
      1.0,
      [],
      exhaustedStats,
      DEFAULT_SETTINGS,
      validTicker
    );

    expect(result.approved).toBe(false);
    expect(result.reasons.some(r => r.includes('قاطع الدائرة') || r.includes('خسائر متتالية'))).toBe(true);
  });

  it('should approve trade and size position safely when all invariants are satisfied', () => {
    const healthyStats = {
      ...DEFAULT_STATS,
      balance: 1000,
      initialBalance: 1000,
      equity: 1000,
      todayLossUsd: 0,
      consecutiveLosses: 0,
    };

    const result = RiskEngine.evaluateTrade(
      'BTCUSDT',
      'LONG',
      65000,
      2.0,
      1.0,
      [],
      healthyStats,
      DEFAULT_SETTINGS,
      validTicker
    );

    expect(result.approved).toBe(true);
    expect(result.recommendedSizeUsd).toBeGreaterThan(0);
    expect(result.recommendedQuantity).toBeGreaterThan(0);
  });
});
