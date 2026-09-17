import React, { useEffect, useCallback } from 'react';
import { OrderManager } from '../services/execution/orderManager';
import { BehaviorEngine } from '../services/behaviorEngine';
import { StorageService } from '../services/storage';
import { Trade, StrategySettings, UserStats, PatternStats, DisqualifiedPattern, ExitReason } from '../types';
import { TickerData } from '../services/binance';

interface UseTradeExecutionProps {
  activeTrades: Trade[];
  setActiveTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  setClosedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  stats: UserStats;
  setStats: React.Dispatch<React.SetStateAction<UserStats>>;
  settings: StrategySettings;
  patterns: PatternStats[];
  setPatterns: React.Dispatch<React.SetStateAction<PatternStats[]>>;
  tickers: { [symbol: string]: TickerData };
  isConnectionLost: boolean;
  setDisqualifiedPatterns: React.Dispatch<React.SetStateAction<DisqualifiedPattern[]>>;
  setLastDbSync: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string) => void;
}

export function useTradeExecution({
  activeTrades,
  setActiveTrades,
  setClosedTrades,
  stats,
  setStats,
  settings,
  patterns,
  setPatterns,
  tickers,
  isConnectionLost,
  setDisqualifiedPatterns,
  setLastDbSync,
  showToast,
}: UseTradeExecutionProps) {
  // Register negative lesson & disqualified pattern
  const registerNegativeLesson = useCallback((trade: Trade, lossUsd: number, reason: string) => {
    if (!trade.patternTag) return;
    const absLoss = Math.abs(lossUsd);
    const newDisq: DisqualifiedPattern = {
      id: `dp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patternTag: trade.patternTag,
      coin: trade.coin,
      timeframe: trade.timeframe || '15m',
      direction: trade.direction === 'LONG' ? 'UP' : 'DOWN',
      failedTradeId: trade.id,
      lossUsd: absLoss,
      timestamp: Date.now(),
      coolingUntil: Date.now() + (settings.failedPatternCoolingHours || 24) * 3600 * 1000,
      reason: reason || trade.exitReason || 'STOP_LOSS',
      lesson: trade.learnedLesson || `تم تجميد واستبعاد هذا النمط على ${trade.coin} بعد خسارة -$${absLoss.toFixed(2)} (${reason}) لمنع تكرار الخطأ في التداولات القادمة.`,
    };
    StorageService.addDisqualifiedPattern(newDisq);
    setDisqualifiedPatterns(prev => [newDisq, ...prev]);
    setLastDbSync(Date.now());
  }, [settings.failedPatternCoolingHours, setDisqualifiedPatterns, setLastDbSync]);

  // Active Trades Management Loop
  useEffect(() => {
    if (activeTrades.length === 0) return;

    const interval = setInterval(() => {
      if (isConnectionLost || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        return;
      }

      setActiveTrades(prevActive => {
        let hasChanges = false;
        const remainingTrades: Trade[] = [];
        const newlyClosed: Trade[] = [];

        for (const trade of prevActive) {
          const currentTicker = tickers[trade.coin];
          const currentPrice = currentTicker ? currentTicker.price : trade.currentPrice;

          const { updatedTrade, shouldClose, reason } = BehaviorEngine.evaluateTradeManagement(
            trade,
            currentPrice,
            settings
          );

          if (shouldClose) {
            hasChanges = true;
            newlyClosed.push(updatedTrade);

            const pnlUsd = updatedTrade.realizedPnLUsd || 0;
            if (pnlUsd < 0) {
              registerNegativeLesson(updatedTrade, pnlUsd, reason);
            }

            const { updatedPatterns } = BehaviorEngine.learnFromClosedTrade(
              updatedTrade,
              patterns
            );
            setPatterns(updatedPatterns);
            StorageService.savePatterns(updatedPatterns);

            setStats(prevStats => {
              const isWin = pnlUsd > 0;
              const newBalance = Number((prevStats.balance + pnlUsd).toFixed(2));
              const newRealizedPnL = Number((prevStats.realizedPnL + pnlUsd).toFixed(2));
              const newWinCount = isWin ? prevStats.winCount + 1 : prevStats.winCount;
              const newLossCount = !isWin ? prevStats.lossCount + 1 : prevStats.lossCount;
              const totalTrades = newWinCount + newLossCount;
              const newWinRate = Number(((newWinCount / totalTrades) * 100).toFixed(1));

              const updatedStats: UserStats = {
                ...prevStats,
                balance: newBalance,
                realizedPnL: newRealizedPnL,
                winCount: newWinCount,
                lossCount: newLossCount,
                totalTrades,
                winRate: newWinRate,
                consecutiveLosses: isWin ? 0 : prevStats.consecutiveLosses + 1,
                todayLossUsd: !isWin ? prevStats.todayLossUsd + pnlUsd : prevStats.todayLossUsd,
              };
              StorageService.saveUserStats(updatedStats);
              return updatedStats;
            });

            showToast(
              reason === 'SMART_EXIT'
                ? `⚡ إغلاق ذكي (Smart Exit): تم حجز أرباح بقيمة +$${updatedTrade.realizedPnLUsd} على ${trade.coin}!`
                : reason === 'TAKE_PROFIT'
                ? `🎯 تحقيق الهدف بنجاح: +$${updatedTrade.realizedPnLUsd} على ${trade.coin}!`
                : `🛡️ تفعيل وقف الخسارة: -$${Math.abs(updatedTrade.realizedPnLUsd || 0)} على ${trade.coin}`
            );
          } else {
            remainingTrades.push(updatedTrade);
          }
        }

        if (newlyClosed.length > 0) {
          setClosedTrades(prevClosed => {
            const nextClosed = [...newlyClosed, ...prevClosed];
            StorageService.saveClosedTrades(nextClosed);
            return nextClosed;
          });
          StorageService.saveActiveTrades(remainingTrades);
        }

        return remainingTrades;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [tickers, settings, patterns, activeTrades.length, isConnectionLost, registerNegativeLesson, setActiveTrades, setClosedTrades, setPatterns, setStats, showToast]);

  // Manual Trade Close
  const handleCloseTradeManual = useCallback(async (tradeId: string, reason: string) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    const isSmart = reason === 'SMART_EXIT';
    const exitReason: ExitReason = isSmart ? 'SMART_EXIT' : 'MANUAL';
    const currentPrice = tickers[trade.coin]?.price || trade.currentPrice;

    const closedTradeResult = await OrderManager.executeCloseOrder(
      trade,
      currentPrice,
      exitReason,
      settings.tradingExecutionMode || 'PAPER'
    );

    const closedTrade: Trade = {
      ...closedTradeResult,
      learnedLesson: isSmart
        ? `حجز أرباح قمة ذكي: تم الخروج عند +$${closedTradeResult.realizedPnLUsd} (${closedTradeResult.realizedPnLPct}%) لحماية رأس المال.`
        : `إغلاق يدوي من المستخدم عند ربح/خسارة $${closedTradeResult.realizedPnLUsd}.`,
    };

    setActiveTrades(prev => {
      const remaining = prev.filter(t => t.id !== tradeId);
      StorageService.saveActiveTrades(remaining);
      return remaining;
    });

    setClosedTrades(prev => {
      const next = [closedTrade, ...prev];
      StorageService.saveClosedTrades(next);
      return next;
    });

    setStats(prev => {
      const pnl = closedTrade.realizedPnLUsd || 0;
      if (pnl < 0) {
        registerNegativeLesson(closedTrade, pnl, reason);
      }
      const isWin = pnl > 0;
      const nextStats: UserStats = {
        ...prev,
        balance: Number((prev.balance + pnl).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + pnl).toFixed(2)),
        winCount: isWin ? prev.winCount + 1 : prev.winCount,
        lossCount: !isWin ? prev.lossCount + 1 : prev.lossCount,
        totalTrades: prev.totalTrades + 1,
        winRate: Number((((isWin ? prev.winCount + 1 : prev.winCount) / (prev.totalTrades + 1)) * 100).toFixed(1)),
      };
      StorageService.saveUserStats(nextStats);
      return nextStats;
    });

    showToast(`تم إغلاق صفقة ${trade.coin} بنجاح (${closedTrade.realizedPnLUsd && closedTrade.realizedPnLUsd >= 0 ? '+' : ''}$${closedTrade.realizedPnLUsd})`);
  }, [activeTrades, tickers, settings, registerNegativeLesson, setActiveTrades, setClosedTrades, setStats, showToast]);

  // Emergency stop and close all open positions
  const handleEmergencyCloseAll = useCallback(async () => {
    if (activeTrades.length === 0) return;
    let totalRealized = 0;
    const closedList: Trade[] = [];

    for (const trade of activeTrades) {
      const currentPrice = tickers[trade.coin]?.price || trade.currentPrice;
      const closed = await OrderManager.executeCloseOrder(
        trade,
        currentPrice,
        'EMERGENCY_STOP',
        settings.tradingExecutionMode || 'PAPER'
      );
      const pnl = closed.realizedPnLUsd || 0;
      totalRealized += pnl;
      if (pnl < 0) {
        registerNegativeLesson(closed, pnl, 'EMERGENCY_STOP');
      }
      closedList.push({
        ...closed,
        learnedLesson: `إغلاق طوارئ فوري لحماية رأس المال (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}).`,
      });
    }

    setActiveTrades([]);
    StorageService.saveActiveTrades([]);

    setClosedTrades(prev => {
      const updated = [...closedList, ...prev];
      StorageService.saveClosedTrades(updated);
      return updated;
    });

    setStats(prev => {
      const updated: UserStats = {
        ...prev,
        balance: Number((prev.balance + totalRealized).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + totalRealized).toFixed(2)),
        totalTrades: prev.totalTrades + closedList.length,
        winCount: prev.winCount + closedList.filter(c => (c.realizedPnLUsd || 0) > 0).length,
        lossCount: prev.lossCount + closedList.filter(c => (c.realizedPnLUsd || 0) <= 0).length,
      };
      StorageService.saveUserStats(updated);
      return updated;
    });

    showToast(`🚨 تم إغلاق كافة الصفقات النشطة (${closedList.length}) وحجز النتيجة بنجاح!`);
  }, [activeTrades, tickers, settings, registerNegativeLesson, setActiveTrades, setClosedTrades, setStats, showToast]);

  return {
    handleCloseTradeManual,
    handleEmergencyCloseAll,
    registerNegativeLesson,
  };
}
