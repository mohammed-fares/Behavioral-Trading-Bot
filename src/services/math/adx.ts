/**
 * Standard Wilder's ADX (Average Directional Movement Index)
 * Full standard Wilder's formulation: TR, +DM, -DM, Smoothed ATR, +DI, -DI, DX, and Smoothed ADX.
 */

export interface ADXPoint {
  adx: number;
  plusDI: number;
  minusDI: number;
}

export interface CandleLike {
  high: number;
  low: number;
  close: number;
}

export const TechnicalADX = {
  /**
   * Calculates standard Wilder's ADX for an array of candles.
   * @param candles Array of candles (oldest first, newest last)
   * @param period Period for ADX and DI (standard is 14)
   */
  calculate(candles: CandleLike[], period: number = 14): ADXPoint {
    if (!candles || candles.length < period * 2) {
      return { adx: 25, plusDI: 20, minusDI: 20 };
    }

    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    // Step 1: Calculate raw TR, +DM, -DM
    for (let i = 1; i < candles.length; i++) {
      const curr = candles[i];
      const prev = candles[i - 1];

      // True Range: max(H - L, |H - PrevC|, |L - PrevC|)
      const trueRange = Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close)
      );
      tr.push(trueRange);

      // Directional Movement
      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }

    if (tr.length < period) {
      return { adx: 25, plusDI: 20, minusDI: 20 };
    }

    // Step 2: Initial sums for first `period`
    let smoothTR = 0;
    let smoothPlusDM = 0;
    let smoothMinusDM = 0;

    for (let i = 0; i < period; i++) {
      smoothTR += tr[i];
      smoothPlusDM += plusDM[i];
      smoothMinusDM += minusDM[i];
    }

    const dxSeries: number[] = [];

    const diPlusFirst = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const diMinusFirst = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diffFirst = Math.abs(diPlusFirst - diMinusFirst);
    const sumFirst = diPlusFirst + diMinusFirst;
    dxSeries.push(sumFirst > 0 ? (diffFirst / sumFirst) * 100 : 0);

    let latestPlusDI = diPlusFirst;
    let latestMinusDI = diMinusFirst;

    // Step 3: Wilder's smoothing for subsequent candles
    for (let i = period; i < tr.length; i++) {
      smoothTR = smoothTR - (smoothTR / period) + tr[i];
      smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDM[i];
      smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDM[i];

      latestPlusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      latestMinusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

      const diff = Math.abs(latestPlusDI - latestMinusDI);
      const sum = latestPlusDI + latestMinusDI;
      const dx = sum > 0 ? (diff / sum) * 100 : 0;
      dxSeries.push(dx);
    }

    // Step 4: ADX is Wilder's smoothed average of DX
    if (dxSeries.length < period) {
      const avgDX = dxSeries.reduce((a, b) => a + b, 0) / dxSeries.length;
      return {
        adx: Math.round(avgDX * 10) / 10,
        plusDI: Math.round(latestPlusDI * 10) / 10,
        minusDI: Math.round(latestMinusDI * 10) / 10
      };
    }

    // First ADX is simple average of first `period` DX values
    let adx = 0;
    for (let i = 0; i < period; i++) {
      adx += dxSeries[i];
    }
    adx = adx / period;

    // Subsequent ADX smoothed: (Prior ADX * 13 + current DX) / 14
    for (let i = period; i < dxSeries.length; i++) {
      adx = (adx * (period - 1) + dxSeries[i]) / period;
    }

    return {
      adx: Math.min(100, Math.max(0, Math.round(adx * 10) / 10)),
      plusDI: Math.min(100, Math.max(0, Math.round(latestPlusDI * 10) / 10)),
      minusDI: Math.min(100, Math.max(0, Math.round(latestMinusDI * 10) / 10))
    };
  }
};
