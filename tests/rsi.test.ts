import { describe, it, expect } from 'vitest';
import { TechnicalRSI } from '../src/services/math/rsi';

describe('TechnicalRSI Math Invariants', () => {
  it('should return fallback 50 when closes are fewer than period + 1 (15)', () => {
    const rsi = TechnicalRSI.calculate([100, 101, 102], 14);
    expect(rsi).toBe(50);
  });

  it('should return near 100 on purely rising prices over 14 periods', () => {
    // 15 strictly ascending closes
    const risingCloses = [
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
    ];
    const rsi = TechnicalRSI.calculate(risingCloses, 14);
    expect(rsi).toBeGreaterThan(95);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it('should return near 0 on purely falling prices over 14 periods', () => {
    // 15 strictly descending closes
    const fallingCloses = [
      24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10
    ];
    const rsi = TechnicalRSI.calculate(fallingCloses, 14);
    expect(rsi).toBeLessThan(5);
    expect(rsi).toBeGreaterThanOrEqual(0);
  });

  it('should return 50 on flat prices', () => {
    const flatCloses = new Array(20).fill(100);
    const rsi = TechnicalRSI.calculate(flatCloses, 14);
    expect(rsi).toBe(50);
  });

  it('should use exactly the latest 15 closes when a longer array is passed', () => {
    // 50 falling then 15 rising
    const longSeries = [
      ...new Array(50).fill(200).map((v, i) => v - i),
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
    ];
    const rsi = TechnicalRSI.calculate(longSeries, 14);
    // Because the last 15 are all rising, RSI should be calculated strictly on that 14-period window
    expect(rsi).toBeGreaterThan(95);
  });
});
