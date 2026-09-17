import { Trade, StrategySettings, Candle } from '../../types';
import { FinancialMath, calculateATR } from '../math/financial';
import { TechnicalADX } from '../math/adx';

export function evaluateTradeManagement(
  trade: Trade,
  currentPrice: number,
  settings: StrategySettings,
  candles?: Candle[]
): { updatedTrade: Trade; shouldClose: boolean; reason?: string } {
  const isLong = trade.direction === 'LONG';
  let qty = trade.quantity || (trade.sizeUsd / trade.entryPrice);
  const grossPnLUsd = FinancialMath.calcPnL(trade.direction, trade.entryPrice, currentPrice, qty);
  const feesPaid = trade.feesPaidUsd || 0;
  const currentPnLUsd = FinancialMath.round(grossPnLUsd - feesPaid, 2);
  const currentPnLPct = FinancialMath.calcReturnPct(currentPnLUsd, trade.marginUsd || (trade.sizeUsd / trade.leverage));
  
  const peakPrice = isLong ? Math.max(trade.peakPrice, currentPrice) : Math.min(trade.peakPrice, currentPrice);
  const peakPnLPct = Math.max(trade.peakPnLPct, currentPnLPct);

  const now = Date.now();
  const durationMinutes = Math.round((now - trade.entryTime) / 60000);

  // Dynamic Stop Loss and Take Profit when candles are provided
  let effectiveTargetPct = trade.targetPct || settings.takeProfitPct || 2.5;
  let effectiveStopLossPct = trade.stopLossPct || settings.stopLossPct || 1.5;

  if (candles && candles.length >= 15) {
    const atr = calculateATR(candles, 14);
    if (atr > 0) {
      const dynamicSL = isLong ? trade.entryPrice - (1.5 * atr) : trade.entryPrice + (1.5 * atr);
      effectiveStopLossPct = Math.abs((trade.entryPrice - dynamicSL) / trade.entryPrice) * 100;
    }

    const adx = TechnicalADX.calculate(candles, 14);
    if (adx.adx > 35) {
      effectiveTargetPct = 3.5;
    } else if (adx.adx >= 25) {
      effectiveTargetPct = 2.5;
    } else {
      effectiveTargetPct = 1.5;
    }
  }

  // Smart Exit Check:
  // When profit reaches 50% of target, activate trailing stop
  const targetThresholdPct = effectiveTargetPct * (settings.smartExitThresholdPct / 100);
  const isTrailingActive = trade.isTrailingActive || peakPnLPct >= targetThresholdPct;

  let trailingStopPrice = trade.trailingStopPrice;
  if (isTrailingActive && !trailingStopPrice) {
    trailingStopPrice = trade.entryPrice;
  }

  let stopLossPrice = trade.stopLossPrice;
  let isBreakEvenSet = trade.isBreakEvenSet || false;
  let isPartialTaken = trade.isPartialTaken || false;

  // Partial Take Profit: Take 50% profit at 50% of target, let rest run
  if (currentPnLPct >= effectiveTargetPct * 0.5 && !isPartialTaken) {
    qty = qty * 0.5;
    isPartialTaken = true;
    stopLossPrice = trade.entryPrice;
    isBreakEvenSet = true;
  }

  // Break-Even Stop: Move SL to entry when profit reaches 1.0%
  if (currentPnLPct >= 1.0 && !isBreakEvenSet) {
    stopLossPrice = trade.entryPrice;
    isBreakEvenSet = true;
  }

  let shouldClose = false;
  let exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SMART_EXIT' | 'TIMEOUT' | undefined = undefined;

  // 1. Take Profit hit
  if (currentPnLPct >= effectiveTargetPct) {
    shouldClose = true;
    exitReason = 'TAKE_PROFIT';
  }
  // 2. Break-Even or Stop Loss hit
  else if (isBreakEvenSet && ((isLong && currentPrice <= trade.entryPrice) || (!isLong && currentPrice >= trade.entryPrice))) {
    shouldClose = true;
    exitReason = 'STOP_LOSS';
  }
  else if (currentPnLPct <= -effectiveStopLossPct) {
    shouldClose = true;
    exitReason = 'STOP_LOSS';
  }
  // 3. Smart Exit: Retracement >= 25% from peak after hitting trailing threshold
  else if (isTrailingActive && peakPnLPct > 0.5) {
    const pullbackPct = ((peakPnLPct - currentPnLPct) / peakPnLPct) * 100;
    if (pullbackPct >= settings.smartExitRetracementPct) {
      shouldClose = true;
      exitReason = 'SMART_EXIT';
    }
  }
  // 4. Time-Based Exit: Close if open longer than 2x expected duration and profit < 0.3%
  else if (durationMinutes > (trade.expectedDurationMinutes || 45) * 2 && currentPnLPct < 0.3) {
    shouldClose = true;
    exitReason = 'TIMEOUT';
  }

  const updatedTrade: Trade = {
    ...trade,
    quantity: qty,
    targetPct: effectiveTargetPct,
    stopLossPct: effectiveStopLossPct,
    currentPrice,
    peakPrice,
    peakPnLPct,
    currentPnLUsd,
    currentPnLPct,
    isTrailingActive,
    trailingStopPrice,
    stopLossPrice,
    isBreakEvenSet,
    isPartialTaken,
    durationMinutes,
    status: shouldClose ? 'CLOSED' : 'OPEN',
    exitPrice: shouldClose ? currentPrice : undefined,
    exitTime: shouldClose ? now : undefined,
    exitReason: shouldClose ? exitReason : undefined,
    realizedPnLUsd: shouldClose ? currentPnLUsd : undefined,
    realizedPnLPct: shouldClose ? currentPnLPct : undefined,
  };

  return {
    updatedTrade,
    shouldClose,
    reason: exitReason,
  };
}
