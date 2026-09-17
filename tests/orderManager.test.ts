import { describe, it, expect } from 'vitest';
import { OrderManager } from '../src/services/execution/orderManager';
import { DEFAULT_SETTINGS } from '../src/services/seedData';
import { Trade } from '../src/types';

describe('OrderManager Execution Tests', () => {
  it('should generate unique client order ids with prefix', () => {
    const id1 = OrderManager.generateClientOrderId('ENTRY');
    const id2 = OrderManager.generateClientOrderId('ENTRY');
    expect(id1).toContain('ENTRY_');
    expect(id1).not.toBe(id2);
  });

  it('should execute simulated paper entry order with slippage and fees', async () => {
    const result = await OrderManager.executeEntryOrder(
      'BTCUSDT',
      'LONG',
      65000,
      0.01,
      650,
      66300,
      2.0,
      64350,
      1.0,
      'TEST-BREAKOUT',
      75,
      5,
      DEFAULT_SETTINGS,
      'PAPER'
    );

    expect(result.success).toBe(true);
    expect(result.trade).toBeDefined();
    const trade = result.trade!;
    expect(trade.status).toBe('OPEN');
    expect(trade.coin).toBe('BTCUSDT');
    expect(trade.direction).toBe('LONG');
    expect(trade.entryPrice).toBeGreaterThan(0);
    expect(trade.feesPaidUsd).toBeGreaterThan(0);
  });

  it('should calculate realized PnL and return closed trade upon close', async () => {
    const dummyOpenTrade: Trade = {
      id: 'test-trade-1',
      coin: 'ETHUSDT',
      direction: 'LONG',
      timeframe: '15m',
      entryPrice: 3000,
      currentPrice: 3000,
      peakPrice: 3000,
      sizeUsd: 300,
      quantity: 0.1,
      leverage: 10,
      marginUsd: 30,
      targetPrice: 3060,
      targetPct: 2.0,
      stopLossPrice: 2970,
      stopLossPct: 1.0,
      patternTag: 'TEST-P',
      confidence: 70,
      supportingTimeframesCount: 5,
      entryTime: Date.now() - 1000 * 60 * 30,
      expectedDurationMinutes: 45,
      peakPnLPct: 0,
      currentPnLUsd: 0,
      currentPnLPct: 0,
      isTrailingActive: false,
      status: 'OPEN',
      orderState: 'PROTECTED',
      feesPaidUsd: 0.12,
    };

    // Close at profit: 3090 (+3%)
    const closed = await OrderManager.executeCloseOrder(
      dummyOpenTrade,
      3090,
      'TAKE_PROFIT',
      'PAPER'
    );

    expect(closed.status).toBe('CLOSED');
    expect(closed.exitReason).toBe('TAKE_PROFIT');
    expect(closed.exitPrice).toBeGreaterThan(3000);
    expect(Math.abs(closed.exitPrice - 3090)).toBeLessThan(5); // within simulated slippage
    expect(closed.realizedPnLUsd).toBeGreaterThan(0);
    expect(closed.realizedPnLPct).toBeGreaterThan(0);
    expect(closed.durationMinutes).toBeGreaterThanOrEqual(1);
  });
});
