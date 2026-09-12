/**
 * Standard Wilder's RSI (Relative Strength Index)
 * Matches TradingView / TA standard calculations using Wilder's exponential smoothing.
 */

export interface RSIResult {
  current: number;
  series: number[];
}

export const TechnicalRSI = {
  /**
   * Calculates Wilder's RSI series for an array of closing prices.
   * @param closes Array of closing prices (oldest first, newest last)
   * @param period Lookback period (default 14)
   */
  calculateSeries(closes: number[], period: number = 14): number[] {
    if (!closes || closes.length <= period) {
      return closes.map(() => 50);
    }

    const rsiSeries: number[] = new Array(closes.length).fill(50);
    let gains = 0;
    let losses = 0;

    // Step 1: Initial Simple Average of Gains & Losses for first `period`
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    if (avgLoss === 0) {
      rsiSeries[period] = 100;
    } else if (avgGain === 0) {
      rsiSeries[period] = 0;
    } else {
      const rs = avgGain / avgLoss;
      rsiSeries[period] = Math.round((100 - (100 / (1 + rs))) * 100) / 100;
    }

    // Step 2: Wilder's Smoothing for remaining points
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

      if (avgLoss === 0) {
        rsiSeries[i] = 100;
      } else if (avgGain === 0) {
        rsiSeries[i] = 0;
      } else {
        const rs = avgGain / avgLoss;
        const rsiVal = 100 - (100 / (1 + rs));
        rsiSeries[i] = Math.round(rsiVal * 100) / 100;
      }
    }

    return rsiSeries;
  },

  /**
   * Calculates the latest RSI value.
   */
  calculate(closes: number[], period: number = 14): number {
    const series = this.calculateSeries(closes, period);
    return series.length > 0 ? series[series.length - 1] : 50;
  }
};
