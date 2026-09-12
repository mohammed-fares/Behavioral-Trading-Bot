/**
 * Market Regime Detection Engine
 * Determines market condition: TREND_UP, TREND_DOWN, RANGE, HIGH_VOLATILITY, LOW_VOLATILITY.
 */

import { MarketRegime, Candle } from '../../types';
import { TechnicalADX } from '../math/adx';
import { TechnicalRSI } from '../math/rsi';

export const RegimeDetector = {
  detect(candles: Candle[]): MarketRegime {
    if (!candles || candles.length < 30) {
      return 'RANGE';
    }

    const closes = candles.map(c => c.close);
    const adxResult = TechnicalADX.calculate(candles, 14);
    const rsi = TechnicalRSI.calculate(closes, 14);

    // Calculate ATR (Average True Range)
    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const p = candles[i - 1];
      const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
      trueRanges.push(tr);
    }
    const recentTR = trueRanges.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const historicalTR = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
    const currentPrice = closes[closes.length - 1];
    const atrPct = (recentTR / currentPrice) * 100;

    // Fast EMA (10) and Slow EMA (30)
    let emaFast = closes[0];
    let emaSlow = closes[0];
    const kFast = 2 / (10 + 1);
    const kSlow = 2 / (30 + 1);

    for (let i = 1; i < closes.length; i++) {
      emaFast = closes[i] * kFast + emaFast * (1 - kFast);
      emaSlow = closes[i] * kSlow + emaSlow * (1 - kSlow);
    }

    // High / Low Volatility check
    if (recentTR > historicalTR * 1.8 || atrPct > 2.5) {
      return 'HIGH_VOLATILITY';
    }
    if (recentTR < historicalTR * 0.55 && atrPct < 0.35) {
      return 'LOW_VOLATILITY';
    }

    // Strong Trend
    if (adxResult.adx >= 25) {
      if (adxResult.plusDI > adxResult.minusDI && emaFast > emaSlow) {
        return 'TREND_UP';
      } else if (adxResult.minusDI > adxResult.plusDI && emaFast < emaSlow) {
        return 'TREND_DOWN';
      }
    }

    // Otherwise Range / Consolidation
    return 'RANGE';
  }
};
