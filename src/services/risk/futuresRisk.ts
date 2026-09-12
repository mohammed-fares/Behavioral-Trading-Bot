/**
 * Futures Margin, Leverage, and Liquidation Calculation Engine
 * Calculates:
 * - Notional Value
 * - Initial Margin
 * - Maintenance Margin
 * - Liquidation Price (Cross / Isolated)
 * - Funding Cost
 */

import { FinancialMath } from '../math/financial';

export interface FuturesRiskMetrics {
  notionalUsd: number;
  initialMarginUsd: number;
  maintenanceMarginUsd: number;
  liquidationPrice: number;
  estimatedFundingFeeUsd: number;
  isSafeMargin: boolean;
}

export const FuturesRiskCalculator = {
  /**
   * Binance USDT-M Futures maintenance margin rate tiers (simplified standard tier 1)
   * Tier 1 (up to 50,000 USDT): MMR = 0.4% (0.004)
   */
  getMaintenanceMarginRate(notional: number): number {
    if (notional < 50000) return 0.004;
    if (notional < 250000) return 0.005;
    return 0.01;
  },

  /**
   * Calculate all futures risk metrics for a prospective position
   */
  calculate(
    side: 'LONG' | 'SHORT',
    entryPrice: number,
    quantity: number,
    leverage: number,
    availableBalance: number,
    fundingRate: number = 0.0001
  ): FuturesRiskMetrics {
    const notionalUsd = FinancialMath.round(entryPrice * quantity, 2);
    const clampedLeverage = Math.max(1, Math.min(20, leverage));
    const initialMarginUsd = FinancialMath.round(notionalUsd / clampedLeverage, 2);
    
    const mmr = this.getMaintenanceMarginRate(notionalUsd);
    const maintenanceMarginUsd = FinancialMath.round(notionalUsd * mmr, 2);

    // Liquidation Price calculation:
    // Long: LiqPrice = EntryPrice * (1 - (1 / Leverage) + MMR)
    // Short: LiqPrice = EntryPrice * (1 + (1 / Leverage) - MMR)
    let liquidationPrice = 0;
    if (side === 'LONG') {
      const dropFactor = (1 / clampedLeverage) - mmr;
      liquidationPrice = FinancialMath.round(entryPrice * (1 - dropFactor), 4);
      if (liquidationPrice < 0) liquidationPrice = 0;
    } else {
      const riseFactor = (1 / clampedLeverage) - mmr;
      liquidationPrice = FinancialMath.round(entryPrice * (1 + riseFactor), 4);
    }

    // Funding fee estimate: Notional * FundingRate
    const estimatedFundingFeeUsd = FinancialMath.round(notionalUsd * Math.abs(fundingRate), 4);

    // Margin safety: available balance must cover at least 150% of initial margin
    const isSafeMargin = availableBalance >= initialMarginUsd * 1.5;

    return {
      notionalUsd,
      initialMarginUsd,
      maintenanceMarginUsd,
      liquidationPrice,
      estimatedFundingFeeUsd,
      isSafeMargin
    };
  }
};
