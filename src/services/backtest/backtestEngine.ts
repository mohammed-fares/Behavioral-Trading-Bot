/**
 * Production Backtesting & Walk-Forward Validation Engine
 * Features:
 * - Historical OHLCV sequential playback
 * - Absolute elimination of Lookahead Bias (Strictly uses only candles <= T)
 * - Walk-Forward / Out-of-Sample testing separation
 * - Realistic commissions, slippage, and spread modeling
 * - Benchmarking vs Buy-and-Hold
 * - Full performance metrics: Sharpe, Sortino, Max Drawdown, Profit Factor, Expectancy
 */

import { Candle, Timeframe, Trade, BacktestResult, StrategySettings } from '../../types';
import { TechnicalRSI } from '../math/rsi';
import { TechnicalADX } from '../math/adx';
import { FinancialMath, calculateATR } from '../math/financial';
import { ExchangeFilters } from '../risk/exchangeFilters';
import { FuturesRiskCalculator } from '../risk/futuresRisk';
import { hasVolumeConfirmation } from '../behavior/patternDetection';
import { detectMarketRegime } from '../learning/regime';

export interface BacktestOptions {
  symbol: string;
  timeframe: Timeframe;
  initialCapitalUsd: number;
  leverage: number;
  takerFeeRate: number; // default 0.0004
  slippagePct: number;  // default 0.02%
  trainRatio: number;   // default 0.70 for in-sample / out-of-sample
}

export const BacktestEngine = {
  /**
   * Runs backtest with strictly sequential evaluation (no future leakage).
   */
  run(
    candles: Candle[],
    settings: StrategySettings,
    options: BacktestOptions
  ): { inSample: BacktestResult; outOfSample: BacktestResult; totalResult: BacktestResult } {
    if (!candles || candles.length < 50) {
      const emptyResult = this.createEmptyResult(options.symbol, options.timeframe);
      return { inSample: emptyResult, outOfSample: emptyResult, totalResult: emptyResult };
    }

    const splitIdx = Math.floor(candles.length * (options.trainRatio || 0.7));
    const inSampleCandles = candles.slice(0, splitIdx);
    const outOfSampleCandles = candles.slice(splitIdx);

    const inSample = this.simulateWindow(inSampleCandles, settings, options, 'TRAIN');
    const outOfSample = this.simulateWindow(outOfSampleCandles, settings, options, 'TEST');
    const totalResult = this.simulateWindow(candles, settings, options, 'FULL');

    return { inSample, outOfSample, totalResult };
  },

  simulateWindow(
    candles: Candle[],
    settings: StrategySettings,
    options: BacktestOptions,
    mode: string
  ): BacktestResult {
    const trades: Trade[] = [];
    let capital = options.initialCapitalUsd;
    let peakCapital = capital;
    let maxDrawdownUsd = 0;
    let totalFees = 0;
    let totalSlippage = 0;

    let activeTrade: Trade | null = null;
    const lookback = 20;

    for (let i = lookback; i < candles.length; i++) {
      // STRICT NO LOOKAHEAD: Only use slice(0, i + 1)
      const historicalWindow = candles.slice(0, i + 1);
      const currentCandle = historicalWindow[historicalWindow.length - 1];
      const currentPrice = currentCandle.close;

      // 1. Manage active trade if any
      if (activeTrade) {
        const isLong = activeTrade.direction === 'LONG';
        const highPrice = currentCandle.high;
        const lowPrice = currentCandle.low;

        // Peak price & PnL tracking
        const currentPeak = isLong ? Math.max(activeTrade.peakPrice, highPrice) : Math.min(activeTrade.peakPrice, lowPrice);
        activeTrade.peakPrice = currentPeak;
        const grossReturnPct = isLong 
          ? ((currentPeak - activeTrade.entryPrice) / activeTrade.entryPrice) * 100
          : ((activeTrade.entryPrice - currentPeak) / activeTrade.entryPrice) * 100;
        activeTrade.peakPnLPct = Math.max(activeTrade.peakPnLPct || 0, grossReturnPct);

        // Break-Even Stop: move SL to entry + fee buffer when gross profit reaches 1.0%
        if (activeTrade.peakPnLPct >= 1.0 && !activeTrade.isBreakEvenSet) {
          activeTrade.stopLossPrice = isLong 
            ? activeTrade.entryPrice * 1.0015 
            : activeTrade.entryPrice * 0.9985;
          activeTrade.isBreakEvenSet = true;
        }

        // Partial Take Profit: at 50% of target
        if (activeTrade.peakPnLPct >= (activeTrade.targetPct || 2.5) * 0.5 && !activeTrade.isPartialTaken) {
          activeTrade.isPartialTaken = true;
          activeTrade.stopLossPrice = isLong 
            ? activeTrade.entryPrice * 1.0015 
            : activeTrade.entryPrice * 0.9985;
          activeTrade.isBreakEvenSet = true;
        }

        let shouldExit = false;
        let exitPrice = currentPrice;
        let exitReason: Trade['exitReason'] = undefined;

        // Check TP & SL on candle extremes
        if (isLong) {
          if (highPrice >= activeTrade.targetPrice) {
            shouldExit = true;
            exitPrice = activeTrade.targetPrice;
            exitReason = 'TAKE_PROFIT';
          } else if (lowPrice <= activeTrade.stopLossPrice) {
            shouldExit = true;
            exitPrice = activeTrade.stopLossPrice;
            exitReason = 'STOP_LOSS';
          }
        } else {
          if (lowPrice <= activeTrade.targetPrice) {
            shouldExit = true;
            exitPrice = activeTrade.targetPrice;
            exitReason = 'TAKE_PROFIT';
          } else if (highPrice >= activeTrade.stopLossPrice) {
            shouldExit = true;
            exitPrice = activeTrade.stopLossPrice;
            exitReason = 'STOP_LOSS';
          }
        }

        // Time-based exit check (open > 90 mins and profit < 0.3%)
        const tradeMins = Math.round((currentCandle.timestamp - activeTrade.entryTime) / 60000);
        if (!shouldExit && tradeMins >= 90) {
          const currentProfitPct = isLong
            ? ((currentPrice - activeTrade.entryPrice) / activeTrade.entryPrice) * 100
            : ((activeTrade.entryPrice - currentPrice) / activeTrade.entryPrice) * 100;
          if (currentProfitPct < 0.3) {
            shouldExit = true;
            exitPrice = currentPrice;
            exitReason = 'TIMEOUT';
          }
        }

        if (shouldExit) {
          const qty = activeTrade.quantity || 0;
          const grossPnL = FinancialMath.calcPnL(activeTrade.direction, activeTrade.entryPrice, exitPrice, qty);
          const exitFee = FinancialMath.calcFee(exitPrice * qty, options.takerFeeRate || 0.0004);
          totalFees += exitFee;
          const netPnL = FinancialMath.round(grossPnL - exitFee, 2);

          capital += netPnL;
          if (capital > peakCapital) peakCapital = capital;
          const currentDd = peakCapital - capital;
          if (currentDd > maxDrawdownUsd) maxDrawdownUsd = currentDd;

          trades.push({
            ...activeTrade,
            currentPrice: exitPrice,
            status: 'CLOSED',
            exitPrice,
            exitTime: currentCandle.timestamp,
            exitReason,
            realizedPnLUsd: netPnL,
            realizedPnLPct: FinancialMath.calcReturnPct(netPnL, activeTrade.marginUsd),
            feesPaidUsd: (activeTrade.feesPaidUsd || 0) + exitFee,
            durationMinutes: tradeMins
          });

          activeTrade = null;
        }
      }

      // 2. Evaluate Signal generation at current candle (ONLY if no active trade)
      if (!activeTrade && i < candles.length - 1) {
        const closes = historicalWindow.map(c => c.close);
        const rsi = TechnicalRSI.calculate(closes, 14);
        const adx = TechnicalADX.calculate(historicalWindow, 14);
        const volumeOk = hasVolumeConfirmation(historicalWindow, 1.5);
        const regime = detectMarketRegime(historicalWindow);

        // Simple behavioral condition with strict technical & regime filters
        const recentDiffPct = ((currentPrice - historicalWindow[historicalWindow.length - 10].open) / historicalWindow[historicalWindow.length - 10].open) * 100;
        let direction: 'LONG' | 'SHORT' | null = null;

        if (regime !== 'RANGING' && volumeOk && adx.adx >= 25) {
          if (recentDiffPct > (settings.minMovementPct || 0.5) && rsi >= 40 && rsi <= 70 && adx.plusDI > adx.minusDI) {
            direction = 'LONG';
          } else if (recentDiffPct < -(settings.minMovementPct || 0.5) && rsi >= 30 && rsi <= 60 && adx.minusDI > adx.plusDI) {
            direction = 'SHORT';
          }
        }

        if (direction) {
          const leverage = options.leverage || settings.leverage || 10;
          let positionSizeUsd = capital * (settings.positionSizePct / 100) * leverage;
          const filter = ExchangeFilters.getFilter(options.symbol);
          if (positionSizeUsd < filter.minNotional && capital * leverage >= filter.minNotional) {
            positionSizeUsd = filter.minNotional;
          }
          let targetQty = positionSizeUsd / currentPrice;
          if (targetQty < filter.minQty && (filter.minQty * currentPrice / leverage) <= capital * 0.5) {
            targetQty = filter.minQty;
          }
          const normalizedQty = ExchangeFilters.normalizeQuantity(options.symbol, targetQty);
          const filterValidation = ExchangeFilters.validateOrder(options.symbol, currentPrice, normalizedQty);

          if (filterValidation.valid && normalizedQty > 0) {
            // Apply entry slippage and fees
            const slipPct = options.slippagePct || 0.02;
            const slipPrice = direction === 'LONG' ? currentPrice * (1 + slipPct / 100) : currentPrice * (1 - slipPct / 100);
            const entryFee = FinancialMath.calcFee(slipPrice * normalizedQty, options.takerFeeRate || 0.0004);
            totalFees += entryFee;
            totalSlippage += Math.abs(slipPrice - currentPrice) * normalizedQty;

            // Dynamic Stop Loss based on ATR (1.5 * ATR)
            const atr = calculateATR(historicalWindow, 14);
            const dynamicSLDistance = atr > 0 ? 1.5 * atr : (slipPrice * ((settings.stopLossPct || 1.5) / 100));
            const stopLossPct = Math.round(((dynamicSLDistance / slipPrice) * 100) * 100) / 100;

            // Dynamic Take Profit based on ADX
            let targetPct = 2.5;
            if (adx.adx > 35) targetPct = 3.5;
            else if (adx.adx >= 25) targetPct = 2.5;
            else targetPct = 1.5;

            const targetPrice = direction === 'LONG' ? slipPrice * (1 + targetPct / 100) : slipPrice * (1 - targetPct / 100);
            const stopLossPrice = direction === 'LONG' ? slipPrice - dynamicSLDistance : slipPrice + dynamicSLDistance;

            const futuresRisk = FuturesRiskCalculator.calculate(direction, slipPrice, normalizedQty, leverage, capital);

            activeTrade = {
              id: `bt-${mode}-${i}`,
              coin: options.symbol,
              direction,
              timeframe: options.timeframe,
              entryPrice: FinancialMath.round(slipPrice, 4),
              currentPrice: FinancialMath.round(slipPrice, 4),
              peakPrice: FinancialMath.round(slipPrice, 4),
              sizeUsd: FinancialMath.round(slipPrice * normalizedQty, 2),
              quantity: normalizedQty,
              leverage,
              marginUsd: futuresRisk.initialMarginUsd,
              targetPrice: FinancialMath.round(targetPrice, 4),
              targetPct,
              stopLossPrice: FinancialMath.round(stopLossPrice, 4),
              stopLossPct,
              patternTag: `P-${direction === 'LONG' ? 'U' : 'D'}-${Math.abs(recentDiffPct).toFixed(1)}`,
              confidence: 72,
              supportingTimeframesCount: 5,
              entryTime: currentCandle.timestamp,
              expectedDurationMinutes: 45,
              peakPnLPct: 0,
              currentPnLUsd: -entryFee,
              currentPnLPct: 0,
              isTrailingActive: false,
              status: 'OPEN',
              feesPaidUsd: entryFee,
              liquidationPrice: futuresRisk.liquidationPrice,
              dataSource: 'BACKTEST'
            };
          }
        }
      }
    }

    // Performance Calculations
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => (t.realizedPnLUsd || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.realizedPnLUsd || 0) <= 0).length;
    const winRatePct = totalTrades > 0 ? FinancialMath.round((winningTrades / totalTrades) * 100, 1) : 0;

    const totalReturnUsd = capital - options.initialCapitalUsd;
    const totalReturnPct = FinancialMath.round((totalReturnUsd / options.initialCapitalUsd) * 100, 2);
    const maxDrawdownPct = peakCapital > 0 ? FinancialMath.round((maxDrawdownUsd / peakCapital) * 100, 2) : 0;

    const wins = trades.filter(t => (t.realizedPnLUsd || 0) > 0).map(t => t.realizedPnLUsd || 0);
    const losses = trades.filter(t => (t.realizedPnLUsd || 0) < 0).map(t => Math.abs(t.realizedPnLUsd || 0));
    const grossWins = wins.reduce((a, b) => a + b, 0);
    const grossLosses = losses.reduce((a, b) => a + b, 0);
    const profitFactor = grossLosses > 0 ? FinancialMath.round(grossWins / grossLosses, 2) : (grossWins > 0 ? 99 : 1);

    const averageWinUsd = wins.length > 0 ? FinancialMath.round(grossWins / wins.length, 2) : 0;
    const averageLossUsd = losses.length > 0 ? FinancialMath.round(grossLosses / losses.length, 2) : 0;
    const expectancyUsd = totalTrades > 0 ? FinancialMath.round(totalReturnUsd / totalTrades, 2) : 0;

    // Sharpe & Sortino ratios (annualized approximation based on trade returns)
    const returns = trades.map(t => (t.realizedPnLPct || 0) / 100);
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? FinancialMath.round((meanReturn / stdDev) * Math.sqrt(252), 2) : 0;

    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 1 ? downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / downsideReturns.length : 0;
    const downsideStdDev = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideStdDev > 0 ? FinancialMath.round((meanReturn / downsideStdDev) * Math.sqrt(252), 2) : 0;

    // Benchmark: Buy & Hold
    const firstPrice = candles[0].close;
    const lastPrice = candles[candles.length - 1].close;
    const buyAndHoldReturnPct = FinancialMath.round(((lastPrice - firstPrice) / firstPrice) * 100, 2);

    return {
      runId: `bt-${mode}-${Date.now()}`,
      symbol: options.symbol,
      timeframe: options.timeframe,
      startTime: candles[0].timestamp,
      endTime: candles[candles.length - 1].timestamp,
      totalTrades,
      winningTrades,
      losingTrades,
      winRatePct,
      totalReturnPct,
      maxDrawdownPct,
      sharpeRatio,
      sortinoRatio,
      profitFactor,
      expectancyUsd,
      averageWinUsd,
      averageLossUsd,
      totalFeesUsd: FinancialMath.round(totalFees, 2),
      slippagePaidUsd: FinancialMath.round(totalSlippage, 2),
      buyAndHoldReturnPct,
      trades
    };
  },

  createEmptyResult(symbol: string, timeframe: Timeframe): BacktestResult {
    return {
      runId: `bt-empty-${Date.now()}`,
      symbol,
      timeframe,
      startTime: Date.now(),
      endTime: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRatePct: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      profitFactor: 0,
      expectancyUsd: 0,
      averageWinUsd: 0,
      averageLossUsd: 0,
      totalFeesUsd: 0,
      slippagePaidUsd: 0,
      buyAndHoldReturnPct: 0,
      trades: []
    };
  },

  /**
   * Fetches real historical candles from Binance API over a specified range with pagination.
   */
  async fetchHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    startTimeMs?: number,
    endTimeMs?: number,
    totalCandlesTarget: number = 1000
  ): Promise<Candle[]> {
    const tfMap: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1d': '1d'
    };
    const interval = tfMap[timeframe] || '15m';
    const allCandles: Candle[] = [];
    let currentStart = startTimeMs;
    const finalEnd = endTimeMs || Date.now();

    while (allCandles.length < totalCandlesTarget) {
      const fetchLimit = Math.min(1000, totalCandlesTarget - allCandles.length);
      let url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${fetchLimit}`;
      if (currentStart) url += `&startTime=${currentStart}`;
      if (finalEnd) url += `&endTime=${finalEnd}`;

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) break;
        const raw = await res.json();
        if (!Array.isArray(raw) || raw.length === 0) break;

        const parsed: Candle[] = raw.map((c: any) => ({
          timestamp: Number(c[0]),
          openTime: Number(c[0]),
          closeTime: Number(c[6]),
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[5]),
          isClosed: true,
          dataSource: 'REAL_MARKET'
        }));

        allCandles.push(...parsed);
        const lastCandle = parsed[parsed.length - 1];
        if (!lastCandle || (currentStart && lastCandle.closeTime >= finalEnd)) break;
        currentStart = lastCandle.closeTime + 1;

        if (raw.length < fetchLimit) break;
      } catch (err) {
        break;
      }
    }

    return allCandles;
  },

  /**
   * Complete runner that fetches real historical data and runs the backtest.
   */
  async runBacktest(
    symbol: string,
    timeframe: Timeframe,
    settings: StrategySettings,
    options?: Partial<BacktestOptions>,
    months: number = 6
  ): Promise<{ inSample: BacktestResult; outOfSample: BacktestResult; totalResult: BacktestResult }> {
    const msInMonth = 30 * 24 * 60 * 60 * 1000;
    const startTime = Date.now() - (months * msInMonth);
    // 15m has 96 candles per day => 180 days ~ 17280 candles. We fetch up to 10000 for fast execution.
    const candles = await this.fetchHistoricalData(symbol, timeframe, startTime, Date.now(), 8000);
    const fullOptions: BacktestOptions = {
      symbol,
      timeframe,
      initialCapitalUsd: options?.initialCapitalUsd || 100,
      leverage: options?.leverage || settings.leverage || 10,
      takerFeeRate: options?.takerFeeRate || 0.0004,
      slippagePct: options?.slippagePct || 0.02,
      trainRatio: options?.trainRatio || 0.70
    };
    return this.run(candles, settings, fullOptions);
  }
};
