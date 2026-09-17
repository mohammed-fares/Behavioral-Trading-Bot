import { describe, it, expect } from 'vitest';
import { TechnicalADX, CandleLike } from '../src/services/math/adx';

describe('TechnicalADX Math Invariants', () => {
  it('should return fallback values when candles are fewer than period * 2', () => {
    const candles: CandleLike[] = [
      { high: 105, low: 95, close: 100 },
      { high: 106, low: 96, close: 101 },
    ];
    const result = TechnicalADX.calculate(candles, 14);
    expect(result.adx).toBe(25);
    expect(result.plusDI).toBe(20);
    expect(result.minusDI).toBe(20);
  });

  it('should detect a strong uptrend (+DI > -DI and high ADX)', () => {
    // 35 candles with consistent strong upward steps
    const candles: CandleLike[] = [];
    let price = 100;
    for (let i = 0; i < 35; i++) {
      price += 2;
      candles.push({
        high: price + 1.5,
        low: price - 0.5,
        close: price + 1,
      });
    }

    const result = TechnicalADX.calculate(candles, 14);
    expect(result.plusDI).toBeGreaterThan(result.minusDI);
    expect(result.adx).toBeGreaterThan(25);
  });

  it('should detect a strong downtrend (-DI > +DI and high ADX)', () => {
    // 35 candles with consistent strong downward steps
    const candles: CandleLike[] = [];
    let price = 200;
    for (let i = 0; i < 35; i++) {
      price -= 2;
      candles.push({
        high: price + 0.5,
        low: price - 1.5,
        close: price - 1,
      });
    }

    const result = TechnicalADX.calculate(candles, 14);
    expect(result.minusDI).toBeGreaterThan(result.plusDI);
    expect(result.adx).toBeGreaterThan(25);
  });
});
