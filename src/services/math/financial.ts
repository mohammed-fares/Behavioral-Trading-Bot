/**
 * Financial Arithmetic & Precision Utilities
 * Bypasses standard IEEE-754 floating point issues in critical trade calculations.
 */

export const FinancialMath = {
  /**
   * Rounds a number to a specific number of decimal places without floating drift.
   */
  round(val: number, decimals: number = 2): number {
    if (isNaN(val) || !isFinite(val)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round((val + Number.EPSILON) * factor) / factor;
  },

  /**
   * Round to exchange step size (e.g. 0.001 for BTC quantity)
   */
  roundStep(val: number, stepSize: number): number {
    if (stepSize <= 0) return val;
    const precision = Math.max(0, Math.ceil(-Math.log10(stepSize)));
    const quotient = Math.floor(val / stepSize);
    return this.round(quotient * stepSize, precision);
  },

  /**
   * Round to exchange tick size (e.g. 0.1 for BTC price)
   */
  roundTick(val: number, tickSize: number): number {
    if (tickSize <= 0) return val;
    const precision = Math.max(0, Math.ceil(-Math.log10(tickSize)));
    const quotient = Math.round(val / tickSize);
    return this.round(quotient * tickSize, precision);
  },

  /**
   * Calculate exact PnL for Long and Short
   */
  calcPnL(side: 'LONG' | 'SHORT', entryPrice: number, exitPrice: number, quantity: number): number {
    if (entryPrice <= 0 || quantity <= 0) return 0;
    if (side === 'LONG') {
      return this.round((exitPrice - entryPrice) * quantity, 4);
    } else {
      return this.round((entryPrice - exitPrice) * quantity, 4);
    }
  },

  /**
   * Calculate percentage return based on margin
   */
  calcReturnPct(pnl: number, marginUsd: number): number {
    if (marginUsd <= 0) return 0;
    return this.round((pnl / marginUsd) * 100, 2);
  },

  /**
   * Calculate trading fee
   * Futures taker fee: ~0.04% (0.0004), Maker fee: ~0.02% (0.0002)
   * Spot fee: ~0.1% (0.001)
   */
  calcFee(notionalUsd: number, feeRate: number = 0.0004): number {
    return this.round(notionalUsd * feeRate, 4);
  },

  /**
   * Calculate Slippage based on volume and spread
   */
  calcSimulatedSlippage(price: number, spreadPct: number = 0.02, volatilityPct: number = 0.5): number {
    // Slippage ranges from half spread to half spread + 10% of volatility
    const slipPct = (spreadPct / 2) + (Math.random() * volatilityPct * 0.1);
    return this.round(price * (slipPct / 100), 4);
  }
};
