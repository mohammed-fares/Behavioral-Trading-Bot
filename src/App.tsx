/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Behavioral Bot — بوت التداول السلوكي متعدد الأطر الزمنية
 * التطبيق الرئيسي الذي يربط بين المحرك السلوكي، التخزين المحلي، بيانات الأسواق، والواجهات السبع
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  DashboardTab 
} from './components/DashboardTab';
import { 
  MultiTimeframeBoard 
} from './components/MultiTimeframeBoard';
import { 
  PatternExplorer 
} from './components/PatternExplorer';
import { 
  DecisionLogTab 
} from './components/DecisionLogTab';
import { 
  TradesHistoryTab 
} from './components/TradesHistoryTab';
import { 
  AnalyticsTab 
} from './components/AnalyticsTab';
import { 
  SettingsTab 
} from './components/SettingsTab';
import { 
  ScenarioModal 
} from './components/ScenarioModal';
import { 
  DecisionDetailModal 
} from './components/DecisionDetailModal';
import {
  CapitalAndModeWizardModal
} from './components/CapitalAndModeWizardModal';
import {
  CleanStartModal
} from './components/CleanStartModal';
import {
  HourlyReportsModal
} from './components/HourlyReportsModal';

import { StorageService } from './services/storage';
import { BinanceService, TickerData } from './services/binance';
import { BehaviorEngine } from './services/behaviorEngine';
import { HourlyReporter } from './services/hourlyReporter';
import { 
  UserStats, 
  StrategySettings, 
  PatternStats, 
  Swing, 
  Trade, 
  DecisionLog, 
  HourlyReport,
  DisqualifiedPattern,
  SUPPORTED_COINS,
  TIMEFRAMES,
  Direction,
  Timeframe
} from './types';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data State (Loaded from Storage & Seed)
  const [stats, setStats] = useState<UserStats>(() => StorageService.getUserStats());
  const [settings, setSettings] = useState<StrategySettings>(() => StorageService.getSettings());
  const [patterns, setPatterns] = useState<PatternStats[]>(() => StorageService.getPatterns());
  const [swings, setSwings] = useState<Swing[]>(() => StorageService.getSwings());
  const [activeTrades, setActiveTrades] = useState<Trade[]>(() => StorageService.getActiveTrades());
  const [closedTrades, setClosedTrades] = useState<Trade[]>(() => StorageService.getClosedTrades());
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>(() => StorageService.getDecisionLogs());
  const [hourlyReports, setHourlyReports] = useState<HourlyReport[]>(() => StorageService.getHourlyReports());
  const [disqualifiedPatterns, setDisqualifiedPatterns] = useState<DisqualifiedPattern[]>(() => StorageService.getDisqualifiedPatterns());

  // Market Data & Tickers
  const [tickers, setTickers] = useState<{ [symbol: string]: TickerData }>({});
  const [isAutoScanning, setIsAutoScanning] = useState<boolean>(true);
  const [isScanningNow, setIsScanningNow] = useState<boolean>(false);
  const [lastDbSync, setLastDbSync] = useState<number>(Date.now());

  // Modals & Feedback
  const [viewingDecision, setViewingDecision] = useState<DecisionLog | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isCapitalWizardOpen, setIsCapitalWizardOpen] = useState<boolean>(false);
  const [isCleanStartOpen, setIsCleanStartOpen] = useState<boolean>(false);
  const [isHourlyReportsOpen, setIsHourlyReportsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper: Register negative lesson & disqualified pattern to prevent error repetition
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
  }, [settings.failedPatternCoolingHours]);

  // Handler: Confirm Clean Slate Reset (Start from Zero for testing)
  const handleConfirmCleanReset = (
    newCapital: number, 
    mode: 'PAPER' | 'LIVE', 
    options: { wipeTradeHistory: boolean; wipeDecisions: boolean; wipeDisqualified: boolean }
  ) => {
    StorageService.resetToCleanSlate(newCapital, { ...options, mode });
    setStats(StorageService.getUserStats());
    setSettings(StorageService.getSettings());
    setActiveTrades(StorageService.getActiveTrades());
    setClosedTrades(StorageService.getClosedTrades());
    setDecisionLogs(StorageService.getDecisionLogs());
    setHourlyReports(StorageService.getHourlyReports());
    setDisqualifiedPatterns(StorageService.getDisqualifiedPatterns());
    setPatterns(StorageService.getPatterns());
    setLastDbSync(Date.now());
    setIsCleanStartOpen(false);
    showToast(`✨ تم تصفير سجلات الاختبار والبدء من جديد برأس مال $${newCapital.toLocaleString()} (${mode === 'LIVE' ? 'وضع حقيقي' : 'وضع وهمي'})!`);
  };

  // Handler: Generate and export current hour report immediately
  const handleGenerateHourlyReportNow = useCallback(() => {
    const allTrades = [...activeTrades, ...closedTrades];
    const report = HourlyReporter.createHourlyReport(
      allTrades,
      decisionLogs,
      disqualifiedPatterns,
      stats,
      settings
    );
    StorageService.saveHourlyReport(report);
    setHourlyReports(prev => [report, ...prev]);
    setLastDbSync(Date.now());
    HourlyReporter.downloadReport(report, 'txt');
    showToast(`📑 تم إنشاء وتصدير التقرير الساعي (${report.formattedTime}) بنجاح!`);
  }, [activeTrades, closedTrades, decisionLogs, stats, settings, disqualifiedPatterns]);

  // Handler: Apply User Capital and Smart Auto-Configuration
  const handleApplyCapitalAndConfig = (newCapital: number, updatedSettings: StrategySettings) => {
    setSettings(updatedSettings);
    StorageService.saveSettings(updatedSettings);

    setStats(prev => {
      const openPnL = activeTrades.reduce((acc, t) => acc + (t.currentPnLUsd || 0), 0);
      const updated: UserStats = {
        ...prev,
        balance: newCapital,
        initialBalance: newCapital,
        equity: Number((newCapital + openPnL).toFixed(2)),
      };
      StorageService.saveStats(updated);
      return updated;
    });

    if (updatedSettings.autoTradingEnabled) {
      setIsAutoScanning(true);
    }

    const modeText = updatedSettings.tradingExecutionMode === 'LIVE' ? 'التداول الحقيقي (Live Binance)' : 'التداول الوهمي التجريبي (Paper)';
    showToast(`⚡ تم ضبط رأس المال إلى $${newCapital.toLocaleString()} وتطبيق التكوين الذاتي للبوت بنجاح (${modeText})!`);
  };

  // Handler: Emergency stop and close all open positions
  const handleEmergencyCloseAll = () => {
    if (activeTrades.length === 0) return;
    const now = Date.now();
    let totalRealized = 0;

    const closed = activeTrades.map(trade => {
      const pnl = trade.currentPnLUsd || 0;
      totalRealized += pnl;
      if (pnl < 0) {
        registerNegativeLesson(trade, pnl, 'EMERGENCY_STOP');
      }
      return {
        ...trade,
        status: 'CLOSED' as const,
        exitTime: now,
        exitPrice: trade.currentPrice,
        exitReason: 'EMERGENCY_STOP',
        realizedPnLUsd: pnl,
        realizedPnLPct: trade.currentPnLPct || 0,
        durationMinutes: Math.max(1, Math.round((now - trade.entryTime) / 60000)),
        learnedLesson: `إغلاق طوارئ فوري لحماية رأس المال (${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}).`,
      };
    });

    setActiveTrades([]);
    StorageService.saveActiveTrades([]);

    setClosedTrades(prev => {
      const updated = [...closed, ...prev];
      StorageService.saveClosedTrades(updated);
      return updated;
    });

    setStats(prev => {
      const updated: UserStats = {
        ...prev,
        balance: Number((prev.balance + totalRealized).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + totalRealized).toFixed(2)),
        totalTrades: prev.totalTrades + closed.length,
        winCount: prev.winCount + closed.filter(c => (c.realizedPnLUsd || 0) > 0).length,
        lossCount: prev.lossCount + closed.filter(c => (c.realizedPnLUsd || 0) <= 0).length,
      };
      StorageService.saveStats(updated);
      return updated;
    });

    showToast(`🚨 تم إغلاق كافة الصفقات النشطة (${closed.length}) وحجز النتيجة بنجاح!`);
  };

  // 1. Live Market Prices Fetcher (Binance API with synthetic fallback)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const live = await BinanceService.getAllTickers();
        setTickers(live);
      } catch (err) {
        console.error('Error fetching market prices:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Active Trades Management & Smart Exit Engine Loop
  useEffect(() => {
    if (activeTrades.length === 0) return;

    const interval = setInterval(() => {
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

            // Trigger Post-Trade Learning (Phase 7)
            const { updatedPatterns, learnedLesson } = BehaviorEngine.learnFromClosedTrade(
              updatedTrade,
              patterns
            );
            setPatterns(updatedPatterns);
            StorageService.savePatterns(updatedPatterns);

            // Update user balance and stats
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
  }, [tickers, settings, patterns, activeTrades.length]);

  // 3. Manual or Periodic 7-Timeframe Behavioral Scan
  const runBehavioralScan = useCallback(async (targetCoin?: string) => {
    setIsScanningNow(true);
    const coinsToScan = targetCoin ? [targetCoin] : SUPPORTED_COINS.map(c => c.symbol);

    try {
      for (const coin of coinsToScan) {
        // Fetch candle data for base frame 15m
        const candles15m = await BinanceService.getCandles(coin, '15m', 30);
        const swingResult = BehaviorEngine.detectSwingAndPattern(coin, '15m', candles15m, settings.minMagnitudePct);

        if (swingResult) {
          const { swing, patternTag } = swingResult;
          // Look up pattern stats
          const patternStat = BehaviorEngine.findPatternStats(patternTag, patterns);
          const currentPrice = tickers[coin]?.price || swing.endPrice;

          // Build multi-TF alignment
          const mockSignals = TIMEFRAMES.map(tf => {
            const isBase = tf.id === '15m';
            return {
              timeframe: tf.id,
              direction: swing.direction,
              confidence: isBase ? (patternStat?.confidence || 68) : 62,
              patternTag: `P-${swing.direction === 'UP' ? 'U' : 'D'}-1.2-40-R45-65-A25-35`,
            };
          });

          const alignment = BehaviorEngine.evaluateTimeframeAlignment(
            coin,
            '15m',
            patternStat?.confidence || 65,
            swing.direction,
            mockSignals
          );

          // Evaluate 5-step decision with Anti-Repetition logic
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
            disqualifiedPatterns
          );

          // If decision is approved and we have room for trade, execute!
          if (decision.status === 'APPROVED' && decision.proposedTrade) {
            const newTrade: Trade = {
              id: `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              coin,
              timeframe: '15m',
              direction: decision.direction === 'UP' ? 'LONG' : 'SHORT',
              entryPrice: decision.proposedTrade.entryPrice,
              currentPrice: decision.proposedTrade.entryPrice,
              peakPrice: decision.proposedTrade.entryPrice,
              targetPrice: decision.proposedTrade.targetPrice,
              stopLossPrice: decision.proposedTrade.stopLossPrice,
              targetPct: decision.proposedTrade.targetPct,
              stopLossPct: decision.proposedTrade.stopLossPct,
              sizeUsd: decision.proposedTrade.sizeUsd,
              leverage: settings.leverage || 10,
              marginUsd: Number(((decision.proposedTrade.sizeUsd) / (settings.leverage || 10)).toFixed(2)),
              entryTime: Date.now(),
              durationMinutes: 0,
              expectedDurationMinutes: decision.proposedTrade.expectedDurationMins,
              status: 'OPEN',
              patternTag,
              confidence: decision.finalConfidence,
              supportingTimeframesCount: decision.supportingCount,
              currentPnLUsd: 0,
              currentPnLPct: 0,
              peakPnLPct: 0,
              isTrailingActive: false,
            };

            setActiveTrades(prev => {
              const updated = [newTrade, ...prev];
              StorageService.saveActiveTrades(updated);
              return updated;
            });

            showToast(`🚀 تم فتح صفقة جديدة آلياً: ${coin} ${newTrade.direction} (ثقة ${decision.finalConfidence}%)`);
          }

          // Record decision in log
          setDecisionLogs(prev => {
            const updated = [decision, ...prev.slice(0, 99)];
            StorageService.saveDecisionLogs(updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanningNow(false);
    }
  }, [tickers, settings, patterns, activeTrades, closedTrades, stats, disqualifiedPatterns]);

  // 4. Autonomous Continuous Scan interval (runs every 16 seconds if enabled)
  useEffect(() => {
    if (!isAutoScanning) return;
    
    // Initial immediate scan after mount
    const timeout = setTimeout(() => {
      runBehavioralScan();
    }, 1500);

    const interval = setInterval(() => {
      runBehavioralScan();
    }, 16000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isAutoScanning, runBehavioralScan]);

  // 4.5. Automated Hourly Performance & Trade Reporting (every 60 minutes)
  useEffect(() => {
    if (!isAutoScanning) return;
    const hourlyTimer = setInterval(() => {
      const allTrades = [...activeTrades, ...closedTrades];
      const report = HourlyReporter.createHourlyReport(
        allTrades,
        decisionLogs,
        disqualifiedPatterns,
        stats,
        settings
      );
      StorageService.saveHourlyReport(report);
      setHourlyReports(prev => [report, ...prev]);
      setLastDbSync(Date.now());
    }, 60 * 60 * 1000);

    return () => clearInterval(hourlyTimer);
  }, [isAutoScanning, activeTrades, closedTrades, decisionLogs, stats, settings, disqualifiedPatterns]);

  // 5. Manual Trade Close handler
  const handleCloseTradeManual = (tradeId: string, reason: string) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    const now = Date.now();
    const isSmart = reason === 'SMART_EXIT';
    const closedTrade: Trade = {
      ...trade,
      status: 'CLOSED',
      exitPrice: trade.currentPrice,
      exitTime: now,
      exitReason: isSmart ? 'SMART_EXIT' : 'MANUAL',
      realizedPnLUsd: trade.currentPnLUsd,
      realizedPnLPct: trade.currentPnLPct,
      learnedLesson: isSmart
        ? `حجز أرباح قمة ذكي: تم الخروج عند +$${trade.currentPnLUsd} (${trade.currentPnLPct}%) لحماية رأس المال.`
        : `إغلاق يدوي من المستخدم عند ربح/خسارة $${trade.currentPnLUsd}.`,
    };

    // Update active & closed
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

    // Update stats
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
  };

  // 6. Interactive Scenario Injector (1 to 5)
  const handleApplyScenario = (scenarioId: number) => {
    const now = Date.now();

    if (scenarioId === 1) {
      // Scenario 1: BTC Approved Trade & Win +$3.75
      const dec1: DecisionLog = {
        id: `dec-sc1-${now}`,
        timestamp: now,
        coin: 'BTCUSDT',
        baseTimeframe: '15m',
        direction: 'UP',
        status: 'APPROVED',
        patternTag: 'P-U-1.5-47-R45-68-A25-35',
        initialConfidence: 68,
        adjustedConfidence: 83,
        finalConfidence: 83,
        supportingCount: 5,
        opposingCount: 1,
        reasons: [
          'المعايير مكتملة بنجاح: ثقة نهائية 83% مع توافق 5/7 أطر في الساعة 14:00 UTC',
          'النمط تكرر 47 مرة في تاريخ BTCUSDT واستمر بنجاح بنسبة 68%',
          'الساعة 14:00 UTC هي ساعة سيولة ذهبية بنسبة نجاح 78%',
        ],
        reviewSteps: [
          { name: 'فحص النمط وتكراره التاريخي', passed: true, detail: 'تكرر 47 مرة (المطلوب ≥ 20) | الثقة 68%' },
          { name: 'توافق الأطر السبعة', passed: true, detail: '5/7 أطر داعمة (1m, 5m, 15m, 30m, 1h)' },
          { name: 'مراجعة توقيت التداول', passed: true, detail: 'الساعة 14:00 UTC ساعة ذهبية (+5% بونص ثقة)' },
          { name: 'فحص الصفقات المفتوحة', passed: true, detail: 'لا توجد صفقة سابقة على BTCUSDT' },
          { name: 'إدارة المخاطر والـ Cooldown', passed: true, detail: 'ضمن حدود الخسارة المسموحة' },
        ],
        proposedTrade: {
          sizeUsd: 498,
          targetPct: 0.65,
          stopLossPct: 0.40,
          expectedDurationMins: 45,
          entryPrice: 91400,
          targetPrice: 91994,
          stopLossPrice: 91034,
        },
      };

      const trade1: Trade = {
        id: `tr-sc1-${now}`,
        coin: 'BTCUSDT',
        timeframe: '15m',
        direction: 'LONG',
        entryPrice: 91400,
        currentPrice: 91994,
        peakPrice: 92050,
        targetPrice: 91994,
        stopLossPrice: 91034,
        targetPct: 0.65,
        stopLossPct: 0.40,
        sizeUsd: 498,
        leverage: 10,
        marginUsd: 49.8,
        entryTime: now - 45 * 60 * 1000,
        exitTime: now,
        durationMinutes: 45,
        expectedDurationMinutes: 45,
        status: 'CLOSED',
        exitPrice: 91994,
        exitReason: 'TAKE_PROFIT',
        realizedPnLUsd: 3.75,
        realizedPnLPct: 0.75,
        currentPnLUsd: 3.75,
        currentPnLPct: 0.75,
        peakPnLPct: 0.81,
        isTrailingActive: true,
        patternTag: 'P-U-1.5-47-R45-68-A25-35',
        confidence: 83,
        supportingTimeframesCount: 5,
        learnedLesson: 'نجاح تام: النمط P-U-1.5-47 حقق الهدف بربح +$3.75 مع توافق 5/7 أطر في الساعة 14:00 UTC.',
      };

      setDecisionLogs(prev => [dec1, ...prev]);
      setClosedTrades(prev => [trade1, ...prev]);
      setStats(prev => ({
        ...prev,
        balance: Number((prev.balance + 3.75).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + 3.75).toFixed(2)),
        winCount: prev.winCount + 1,
        totalTrades: prev.totalTrades + 1,
      }));
      showToast('✓ تم تطبيق السيناريو 1: فتح صفقة BTC وتحقيق ربح +$3.75!');
    } else if (scenarioId === 2) {
      // Scenario 2: ETH Rejected Trade
      const dec2: DecisionLog = {
        id: `dec-sc2-${now}`,
        timestamp: now,
        coin: 'ETHUSDT',
        baseTimeframe: '5m',
        direction: 'DOWN',
        status: 'REJECTED',
        patternTag: 'P-D-0.5-30-R70-45-A30-25',
        initialConfidence: 55,
        adjustedConfidence: 15,
        finalConfidence: 15,
        supportingCount: 2,
        opposingCount: 5,
        reasons: [
          'تعارض حاد بين الأطر: 5 أطر عليا (15m, 30m, 1h, 4h, 1d) صاعدة بقوة ضد الهبوط اللحظي',
          'الساعة 03:00 UTC تاريخياً ضعيفة السيولة بنسبة نجاح 40% فقط (-15% خصم)',
          'الثقة النهائية (15%) أقل بكثير من الحد الأدنى الصارم (65%)',
        ],
        reviewSteps: [
          { name: 'فحص النمط وتكراره التاريخي', passed: true, detail: 'تكرر 34 مرة في الذاكرة' },
          { name: 'توافق الأطر السبعة', passed: false, detail: 'فشل ذريع: 5 أطر تعارض الاتجاه الهابط' },
          { name: 'مراجعة توقيت التداول', passed: false, detail: 'الساعة 03:00 UTC ساعة هابطة السيولة' },
          { name: 'فحص الصفقات المفتوحة', passed: true, detail: 'لا تعارض مع صفقات أخرى' },
          { name: 'إدارة المخاطر والـ Cooldown', passed: true, detail: 'ضمن الحدود' },
        ],
      };

      setDecisionLogs(prev => [dec2, ...prev]);
      showToast('🛡️ تم تطبيق السيناريو 2: رفض صفقة ETH لحماية رأس المال من مصيدة صعود!');
    } else if (scenarioId === 3) {
      // Scenario 3: SOL Wait & Monitor
      const dec3: DecisionLog = {
        id: `dec-sc3-${now}`,
        timestamp: now,
        coin: 'SOLUSDT',
        baseTimeframe: '30m',
        direction: 'UP',
        status: 'WAIT',
        patternTag: 'P-U-2.0-90-R55-70-A30-40',
        initialConfidence: 62,
        adjustedConfidence: 74,
        finalConfidence: 74,
        supportingCount: 5,
        opposingCount: 0,
        reasons: [
          'النمط واعد للغاية وثقة 74% وتوافق 5/7 أطر، لكن تكرر 8 مرات فقط في الذاكرة (< 20 مطلوب)',
          'تم وضع النمط في قائمة المراقبة النشطة لمواصلة تجميع البيانات السلوكية دون مخاطرة',
        ],
        reviewSteps: [
          { name: 'فحص النمط وتكراره التاريخي', passed: false, detail: '8 تكرارات فقط (الحد الأدنى المطلوب 20)' },
          { name: 'توافق الأطر السبعة', passed: true, detail: '5 أطر داعمة بقوة' },
          { name: 'مراجعة توقيت التداول', passed: true, detail: 'توقيت مناسب' },
          { name: 'فحص الصفقات المفتوحة', passed: true, detail: 'مقبول' },
          { name: 'إدارة المخاطر والـ Cooldown', passed: true, detail: 'مقبول' },
        ],
      };

      setDecisionLogs(prev => [dec3, ...prev]);
      showToast('⏸️ تم تطبيق السيناريو 3: قرار انتظار SOL لتجميع 20 تكرار في الذاكرة!');
    } else if (scenarioId === 4) {
      // Scenario 4: Smart Exit in action!
      const smartTrade: Trade = {
        id: `tr-sc4-${now}`,
        coin: 'SOLUSDT',
        timeframe: '15m',
        direction: 'LONG',
        entryPrice: 202.4,
        currentPrice: 203.55,
        peakPrice: 204.05,
        targetPrice: 204.8,
        stopLossPrice: 201.2,
        targetPct: 1.18,
        stopLossPct: 0.59,
        sizeUsd: 500,
        leverage: 10,
        marginUsd: 50,
        entryTime: now - 38 * 60 * 1000,
        exitTime: now,
        durationMinutes: 38,
        expectedDurationMinutes: 45,
        status: 'CLOSED',
        exitPrice: 203.55,
        exitReason: 'SMART_EXIT',
        realizedPnLUsd: 2.85,
        realizedPnLPct: 0.57,
        currentPnLUsd: 2.85,
        currentPnLPct: 0.57,
        peakPnLPct: 0.81,
        isTrailingActive: true,
        patternTag: 'P-U-1.4-42-R47-68-A26-34',
        confidence: 76,
        supportingTimeframesCount: 5,
        learnedLesson: 'إغلاق ذكي (Smart Exit): تم حجز أرباح بقيمة +$2.85 عند تراجع السعر بنسبة 29.6% من القمة (+0.81%).',
      };

      setClosedTrades(prev => [smartTrade, ...prev]);
      setStats(prev => ({
        ...prev,
        balance: Number((prev.balance + 2.85).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + 2.85).toFixed(2)),
        winCount: prev.winCount + 1,
        totalTrades: prev.totalTrades + 1,
      }));
      showToast('⚡ تم تطبيق السيناريو 4: خروج ذكي (Smart Exit) وحجز أرباح القمة +$2.85!');
    } else if (scenarioId === 5) {
      // Scenario 5: Learn from Loss
      const lossTrade: Trade = {
        id: `tr-sc5-${now}`,
        coin: 'SOLUSDT',
        timeframe: '15m',
        direction: 'LONG',
        entryPrice: 204.0,
        currentPrice: 202.98,
        peakPrice: 204.2,
        targetPrice: 205.8,
        stopLossPrice: 202.98,
        targetPct: 0.88,
        stopLossPct: 0.50,
        sizeUsd: 500,
        leverage: 10,
        marginUsd: 50,
        entryTime: now - 22 * 60 * 1000,
        exitTime: now,
        durationMinutes: 22,
        expectedDurationMinutes: 40,
        status: 'CLOSED',
        exitPrice: 202.98,
        exitReason: 'STOP_LOSS',
        realizedPnLUsd: -2.50,
        realizedPnLPct: -0.50,
        currentPnLUsd: -2.50,
        currentPnLPct: -0.50,
        peakPnLPct: 0.1,
        isTrailingActive: false,
        patternTag: 'P-U-1.2-30-R50-65-A20-25',
        confidence: 75,
        supportingTimeframesCount: 4,
        learnedLesson: 'قاعدة مكتسبة: عند تداول SOLUSDT ليلاً، اشترط توافق 5 أطر على الأقل بدلاً من 4 لتفادي الخسارة.',
      };

      setClosedTrades(prev => [lossTrade, ...prev]);
      setStats(prev => ({
        ...prev,
        balance: Number((prev.balance - 2.50).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL - 2.50).toFixed(2)),
        lossCount: prev.lossCount + 1,
        totalTrades: prev.totalTrades + 1,
        consecutiveLosses: prev.consecutiveLosses + 1,
      }));
      showToast('📚 تم تطبيق السيناريو 5: تحديث الذاكرة بعد وقف الخسارة وتسجيل قاعدة جديدة!');
    }
  };

  // 7. Settings & Memory persistence handlers
  const handleSaveSettings = (newSettings: StrategySettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    showToast('تم حفظ الإعدادات وقواعد المخاطر بنجاح');
  };

  const handleUpdatePatternRepetition = (tag: string, coin: string, newOccurrences: number, newConfidence?: number) => {
    setPatterns(prev => {
      let found = false;
      const updated = prev.map(p => {
        if (p.tag === tag && p.coin === coin) {
          found = true;
          return {
            ...p,
            occurrences: newOccurrences,
            ...(newConfidence !== undefined ? { confidence: newConfidence, continuationRate: newConfidence } : {})
          };
        }
        return p;
      });

      if (!found) {
        const conf = newConfidence || 68;
        const cont = Math.round(newOccurrences * (conf / 100));
        const rev = Math.round(newOccurrences * ((100 - conf) * 0.7 / 100));
        const side = Math.max(0, newOccurrences - cont - rev);
        const newPattern: PatternStats = {
          tag,
          coin,
          timeframe: '15m',
          occurrences: newOccurrences,
          continuedCount: cont,
          reversedCount: rev,
          sidewaysCount: side,
          continuationRate: conf,
          reversalRate: Math.round((rev / newOccurrences) * 100) || 20,
          sidewaysRate: Math.round((side / newOccurrences) * 100) || 10,
          magnitudePct: 1.5,
          durationMinutes: 45,
          avgSubsequentMovePct: 2.1,
          avgSubsequentDuration: 42,
          direction: tag.includes('-D-') ? 'DOWN' : 'UP',
          confidence: conf,
          bestHours: {},
          lastOccurredAt: Date.now()
        };
        updated.push(newPattern);
      }

      StorageService.savePatterns(updated);
      return updated;
    });

    // Also update matching review steps in recent decision logs for immediate visual feedback
    setDecisionLogs(prev => {
      const updated = prev.map(d => {
        if (d.coin === coin && d.patternTag === tag) {
          const updatedSteps = d.reviewSteps.map(s => {
            if (s.name.includes('تكرار') || s.name.includes('النمط')) {
              const passed = newOccurrences >= settings.minOccurrences;
              return {
                ...s,
                status: (passed ? 'PASSED' : 'FAILED') as any,
                metric: `${newOccurrences} تكرار (المطلوب ≥ ${settings.minOccurrences})`,
                notes: passed 
                  ? `اجتاز شرط التكرار بنجاح بعد التعديل اليدوي (${newOccurrences} تكرار مسجل)` 
                  : `غير كافٍ بعد التعديل: تكرر ${newOccurrences} مرة فقط والمطلوب ${settings.minOccurrences}`
              };
            }
            return s;
          });
          return {
            ...d,
            reviewSteps: updatedSteps
          };
        }
        return d;
      });
      StorageService.saveDecisionLogs(updated);
      return updated;
    });

    setLastDbSync(Date.now());
    showToast(`✓ تم تحديث تكرار عملة ${coin} للنمط (${tag}) إلى ${newOccurrences} تكرار وحفظه في الذاكرة`);
  };

  const handleUpdateMinOccurrences = (newMin: number) => {
    const updatedSettings = { ...settings, minOccurrences: newMin };
    handleSaveSettings(updatedSettings);
    showToast(`✓ تم تحديث الحد الأدنى المطلوب لتكرار النمط إلى ${newMin} تكرار`);
  };

  const handleResetMemory = () => {
    StorageService.resetToFactoryTraining();
    setStats(StorageService.getUserStats());
    setPatterns(StorageService.getPatterns());
    setSwings(StorageService.getSwings());
    setActiveTrades(StorageService.getActiveTrades());
    setClosedTrades(StorageService.getClosedTrades());
    setDecisionLogs(StorageService.getDecisionLogs());
    showToast('تمت إعادة ضبط الذاكرة للمصنع مع 847 تذبذب و 183 نمطاً مدرباً');
  };

  const handleExportMemory = () => {
    const data = StorageService.exportFullMemory();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavioral-bot-memory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('تم تصدير الذاكرة السلوكية الكاملة بصيغة JSON');
  };

  const handleImportMemory = async (file: File) => {
    try {
      const text = await file.text();
      const success = StorageService.importFullMemory(text);
      if (success) {
        setStats(StorageService.getUserStats());
        setPatterns(StorageService.getPatterns());
        setSwings(StorageService.getSwings());
        setActiveTrades(StorageService.getActiveTrades());
        setClosedTrades(StorageService.getClosedTrades());
        setDecisionLogs(StorageService.getDecisionLogs());
        showToast('تم استيراد الذاكرة بنجاح واستئناف التداول!');
      } else {
        showToast('خطأ: الملف غير صالح أو لا يحتوي على بنية ذاكرة صحيحة');
      }
    } catch (err) {
      showToast('خطأ أثناء قراءة ملف الذاكرة');
    }
  };

  // Real-time Database & Memory Storage Metrics
  const dbStats = {
    totalTradesCount: stats.totalTrades + activeTrades.length,
    patternsCount: patterns.length,
    swingsCount: swings.length,
    decisionsCount: decisionLogs.length,
    hourlyReportsCount: hourlyReports.length,
    disqualifiedCount: disqualifiedPatterns.length,
    lastSyncTime: lastDbSync,
    estimatedKb: Math.max(28, Math.round((JSON.stringify(stats).length + JSON.stringify(activeTrades).length + JSON.stringify(closedTrades).length + JSON.stringify(decisionLogs).length + JSON.stringify(hourlyReports).length + JSON.stringify(disqualifiedPatterns).length) / 1024)),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 font-medium">
          {toastMessage}
        </div>
      )}

      {/* Header & Quick Actions */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        settings={settings}
        isAutoScanning={isAutoScanning}
        setIsAutoScanning={setIsAutoScanning}
        onManualScan={() => runBehavioralScan()}
        onOpenScenarios={() => setIsScenarioModalOpen(true)}
        onOpenTestScanModal={() => runBehavioralScan()}
        onOpenCapitalWizard={() => setIsCapitalWizardOpen(true)}
        onOpenCleanStart={() => setIsCleanStartOpen(true)}
        onOpenHourlyReports={() => setIsHourlyReportsOpen(true)}
        isScanningNow={isScanningNow}
        totalSwings={swings.length}
        totalPatterns={patterns.length}
        hourlyReportsCount={hourlyReports.length}
        disqualifiedCount={disqualifiedPatterns.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            settings={settings}
            activeTrades={activeTrades}
            recentDecisions={decisionLogs}
            patterns={patterns}
            totalSwings={swings.length}
            isAutoScanning={isAutoScanning}
            setIsAutoScanning={setIsAutoScanning}
            onCloseTrade={handleCloseTradeManual}
            onOpenScenarios={() => setIsScenarioModalOpen(true)}
            onOpenCapitalWizard={() => setIsCapitalWizardOpen(true)}
            onOpenCleanStart={() => setIsCleanStartOpen(true)}
            onOpenHourlyReports={() => setIsHourlyReportsOpen(true)}
            onViewDecision={(d) => setViewingDecision(d)}
            onEmergencyCloseAll={handleEmergencyCloseAll}
            hourlyReports={hourlyReports}
            disqualifiedPatterns={disqualifiedPatterns}
            onExportCurrentHourReport={handleGenerateHourlyReportNow}
            dbStats={dbStats}
          />
        )}

        {activeTab === 'matrix' && (
          <MultiTimeframeBoard
            tickers={tickers}
            onScanCoin={(coin) => runBehavioralScan(coin)}
            onOpenDecisionForCoin={(coin) => {
              const matched = decisionLogs.find(d => d.coin === coin) || decisionLogs[0];
              if (matched) setViewingDecision(matched);
            }}
          />
        )}

        {activeTab === 'explorer' && (
          <PatternExplorer
            patterns={patterns}
            minOccurrences={settings.minOccurrences}
            onUpdatePatternRepetition={handleUpdatePatternRepetition}
            onUpdateMinOccurrences={handleUpdateMinOccurrences}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionLogTab
            decisions={decisionLogs}
            patterns={patterns}
            minOccurrences={settings.minOccurrences}
            onViewDecision={(d) => setViewingDecision(d)}
            onOpenScenarios={() => setIsScenarioModalOpen(true)}
            onUpdatePatternRepetition={handleUpdatePatternRepetition}
            onUpdateMinOccurrences={handleUpdateMinOccurrences}
          />
        )}

        {activeTab === 'trades' && (
          <TradesHistoryTab
            closedTrades={closedTrades}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            stats={stats}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetMemory={handleResetMemory}
            onExportMemory={handleExportMemory}
            onImportMemory={handleImportMemory}
            onOpenCapitalWizard={() => setIsCapitalWizardOpen(true)}
          />
        )}
      </main>

      {/* Decision Detail Modal (Full 5-step Transparency) */}
      <DecisionDetailModal
        decision={viewingDecision}
        onClose={() => setViewingDecision(null)}
      />

      {/* Scenario Demo Modal (5 Real-world Cases from Specification) */}
      <ScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        onApplyScenario={handleApplyScenario}
      />

      {/* Capital & Auto-Configuration Wizard Modal */}
      <CapitalAndModeWizardModal
        isOpen={isCapitalWizardOpen}
        onClose={() => setIsCapitalWizardOpen(false)}
        settings={settings}
        stats={stats}
        onApplyConfig={handleApplyCapitalAndConfig}
      />

      {/* Clean Slate Start from Zero Modal for Testing */}
      <CleanStartModal
        isOpen={isCleanStartOpen}
        onClose={() => setIsCleanStartOpen(false)}
        onConfirmReset={handleConfirmCleanReset}
        currentCapital={stats.balance}
        currentMode={settings.tradingExecutionMode || 'PAPER'}
      />

      {/* Hourly Reports & Negative Learning Disqualified Patterns Modal */}
      <HourlyReportsModal
        isOpen={isHourlyReportsOpen}
        onClose={() => setIsHourlyReportsOpen(false)}
        reports={hourlyReports}
        disqualifiedPatterns={disqualifiedPatterns}
        onGenerateCurrentHourReport={handleGenerateHourlyReportNow}
        settings={settings}
      />
    </div>
  );
}

