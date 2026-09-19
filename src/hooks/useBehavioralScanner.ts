import React, { useState, useCallback, useRef } from 'react';
import { MarketDataLayer, MarketTicker } from '../services/marketData/marketDataLayer';
import { BehaviorEngine } from '../services/behaviorEngine';
import { RiskEngine } from '../services/risk/riskEngine';
import { OrderManager } from '../services/execution/orderManager';
import { AuditLogger } from '../services/audit/auditLogger';
import { RegimeDetector } from '../services/learning/regime';
import { StorageService } from '../services/storage';
import { 
  StrategySettings, 
  PatternStats, 
  Trade, 
  DecisionLog, 
  UserStats, 
  DisqualifiedPattern,
  SUPPORTED_COINS,
  TIMEFRAMES,
  Direction
} from '../types';
import { TickerData } from '../services/binance';

interface UseBehavioralScannerProps {
  tickers: { [symbol: string]: TickerData };
  settings: StrategySettings;
  patterns: PatternStats[];
  activeTrades: Trade[];
  closedTrades: Trade[];
  stats: UserStats;
  disqualifiedPatterns: DisqualifiedPattern[];
  isConnectionLost: boolean;
  setActiveTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  setDecisionLogs: React.Dispatch<React.SetStateAction<DecisionLog[]>>;
  showToast: (msg: string) => void;
}

export function useBehavioralScanner({
  tickers,
  settings,
  patterns,
  activeTrades,
  closedTrades,
  stats,
  disqualifiedPatterns,
  isConnectionLost,
  setActiveTrades,
  setDecisionLogs,
  showToast,
}: UseBehavioralScannerProps) {
  const [isScanningNow, setIsScanningNow] = useState<boolean>(false);
  const isScanningRef = useRef<boolean>(false);

  const runBehavioralScan = useCallback(async (targetCoin?: string) => {
    if (isScanningRef.current) return;
    if (isConnectionLost || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      AuditLogger.warn('STRATEGY', 'SCAN_BLOCKED_DISCONNECTED', 'محاولة مسح ملغاة: تم إيقاف البوت بسبب انقطاع الاتصال لحظر البيانات الوهمية.');
      return;
    }

    isScanningRef.current = true;
    setIsScanningNow(true);
    const coinsToScan = targetCoin ? [targetCoin] : SUPPORTED_COINS.map(c => c.symbol);

    try {
      for (const coin of coinsToScan) {
        const candles15m = await MarketDataLayer.fetchCandles(
          coin, 
          '15m', 
          30, 
          settings.marketType || 'USDT_M_FUTURES', 
          settings.tradingExecutionMode || 'PAPER'
        );

        if (!candles15m || candles15m.length < 10) continue;

        const swingResult = BehaviorEngine.detectSwingAndPattern(coin, '15m', candles15m, settings.minMovementPct || 0.4);

        if (swingResult) {
          const { swing, patternTag } = swingResult;
          const patternStat = BehaviorEngine.findPatternStats(patternTag, patterns, coin);
          const currentPrice = tickers[coin]?.price || swing.endPrice;
          const regime = RegimeDetector.detect(candles15m);

          const timeframeSignals = await Promise.all(
            TIMEFRAMES.map(async (tf) => {
              if (tf.id === '15m') {
                return {
                  timeframe: tf.id,
                  direction: swing.direction,
                  confidence: patternStat?.confidence || 68,
                  patternTag: patternTag,
                };
              }
              try {
                const tfCandles = await MarketDataLayer.fetchCandles(
                  coin,
                  tf.id,
                  20,
                  settings.marketType || 'USDT_M_FUTURES',
                  settings.tradingExecutionMode || 'PAPER'
                );
                if (tfCandles && tfCandles.length >= 10) {
                  const tfSwingResult = BehaviorEngine.detectSwingAndPattern(
                    coin,
                    tf.id,
                    tfCandles,
                    settings.minMovementPct || 0.35
                  );
                  if (tfSwingResult) {
                    const tfStat = BehaviorEngine.findPatternStats(tfSwingResult.patternTag, patterns, coin);
                    return {
                      timeframe: tf.id,
                      direction: tfSwingResult.swing.direction,
                      confidence: tfStat?.confidence || (tfSwingResult.swing.direction === 'SIDEWAYS' ? 50 : 64),
                      patternTag: tfSwingResult.patternTag,
                    };
                  }
                }
              } catch {
                // Fallback
              }

              const change24h = tickers[coin]?.change24h || 0;
              const derivedDir: Direction = change24h > 1.0 ? 'UP' : change24h < -1.0 ? 'DOWN' : 'SIDEWAYS';
              return {
                timeframe: tf.id,
                direction: derivedDir,
                confidence: derivedDir === swing.direction ? 62 : 48,
                patternTag: `P-${derivedDir === 'UP' ? 'U' : derivedDir === 'DOWN' ? 'D' : 'S'}-1.0-30`,
              };
            })
          );

          const alignment = BehaviorEngine.evaluateTimeframeAlignment(
            coin,
            '15m',
            patternStat?.confidence || 65,
            swing.direction,
            timeframeSignals
          );

          const decision = BehaviorEngine.makeDecision(
            coin,
            '15m',
            patternStat,
            patternTag,
            alignment,
            currentPrice,
            activeTrades,
            closedTrades,
            settings,
            stats,
            disqualifiedPatterns,
            'REAL_MARKET',
            regime,
            candles15m
          );

          const tradeDirection = decision.direction === 'UP' ? 'LONG' : 'SHORT';

          if (decision.status === 'APPROVED' && decision.proposedTrade && settings.autoTradingEnabled) {
            const rawTicker = tickers[coin];
            const marketTicker: MarketTicker = {
              symbol: coin,
              marketType: settings.marketType || 'USDT_M_FUTURES',
              lastPrice: currentPrice,
              bid: currentPrice * 0.9998,
              ask: currentPrice * 1.0002,
              spreadPct: 0.04,
              change24h: rawTicker?.change24h || 0,
              high24h: rawTicker?.high24h || currentPrice * 1.02,
              low24h: rawTicker?.low24h || currentPrice * 0.98,
              volume24h: rawTicker?.volume24h || 1000000,
              exchangeTime: rawTicker?.lastUpdated || Date.now(),
              localReceiveTime: rawTicker?.lastUpdated || Date.now(),
              dataSource: 'REAL_MARKET',
              isStale: false
            };

            const riskCheck = RiskEngine.evaluateTrade(
              coin,
              tradeDirection,
              decision.proposedTrade.entryPrice,
              decision.proposedTrade.targetPct,
              decision.proposedTrade.stopLossPct,
              activeTrades,
              stats,
              settings,
              marketTicker
            );

            if (!riskCheck.approved) {
              AuditLogger.warn('RISK_ENGINE', 'TRADE_BLOCKED_BY_RISK', `حظر صفقة ${coin} عبر محرك المخاطر: ${riskCheck.reasons.join(', ')}`, { symbol: coin, metadata: { reasons: riskCheck.reasons } });
            } else {
              const orderQty = riskCheck.recommendedQuantity > 0 
                ? riskCheck.recommendedQuantity 
                : Number((decision.proposedTrade.sizeUsd / decision.proposedTrade.entryPrice).toFixed(4));
              const orderSizeUsd = riskCheck.recommendedSizeUsd > 0
                ? riskCheck.recommendedSizeUsd
                : decision.proposedTrade.sizeUsd;

              const execResult = await OrderManager.executeEntryOrder(
                coin,
                tradeDirection,
                decision.proposedTrade.entryPrice,
                orderQty,
                orderSizeUsd,
                decision.proposedTrade.targetPrice,
                decision.proposedTrade.targetPct,
                decision.proposedTrade.stopLossPrice,
                decision.proposedTrade.stopLossPct,
                patternTag,
                decision.finalConfidence,
                decision.supportingCount,
                settings,
                settings.tradingExecutionMode || 'PAPER'
              );

              if (execResult.success && execResult.trade) {
                const newTrade = {
                  ...execResult.trade,
                  highProbabilitySetup: decision.highProbabilitySetup,
                  confluenceScore: decision.confluenceScore,
                };
                setActiveTrades(prev => {
                  const updated = [newTrade, ...prev];
                  StorageService.saveActiveTrades(updated);
                  return updated;
                });

                AuditLogger.info('ORDER_MANAGER', 'TRADE_EXECUTED', `تم فتح صفقة ${coin} (${tradeDirection}) بحجم $${newTrade.sizeUsd} ورافعة ${newTrade.leverage}x`, {
                  symbol: coin,
                  metadata: {
                    direction: tradeDirection,
                    sizeUsd: newTrade.sizeUsd,
                    orderId: newTrade.orderId,
                    clientOrderId: newTrade.clientOrderId
                  }
                });

                showToast(`🚀 تم فتح صفقة جديدة آلياً: ${coin} ${newTrade.direction} (ثقة ${decision.finalConfidence}% | رافعة ${newTrade.leverage}x)`);
              }
            }
          }

          setDecisionLogs(prev => {
            const filteredPrev = prev.filter(d => d.id !== decision.id);
            const updated = [decision, ...filteredPrev].slice(0, 100);
            StorageService.saveDecisionLogs(updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      isScanningRef.current = false;
      setIsScanningNow(false);
    }
  }, [tickers, settings, patterns, activeTrades, closedTrades, stats, disqualifiedPatterns, isConnectionLost, setActiveTrades, setDecisionLogs, showToast]);

  return {
    isScanningNow,
    runBehavioralScan,
  };
}
