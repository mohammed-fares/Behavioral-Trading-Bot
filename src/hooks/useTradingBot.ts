import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService } from '../services/storage';
import { BinanceService, TickerData } from '../services/binance';
import { HourlyReporter } from '../services/hourlyReporter';
import { AuditLogger } from '../services/audit/auditLogger';
import { executeScenario } from '../data/scenarioGenerator';
import { useConnectionMonitor } from './useConnectionMonitor';
import { useBehavioralScanner } from './useBehavioralScanner';
import { useMemoryActions } from './useMemoryActions';
import { useTradeExecution } from './useTradeExecution';
import { 
  UserStats, 
  StrategySettings, 
  PatternStats, 
  Swing, 
  Trade, 
  DecisionLog, 
  HourlyReport,
  DisqualifiedPattern
} from '../types';

export function useTradingBot() {
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
  const [lastDbSync, setLastDbSync] = useState<number>(Date.now());

  // Modals & Feedback
  const [viewingDecision, setViewingDecision] = useState<DecisionLog | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isCapitalWizardOpen, setIsCapitalWizardOpen] = useState<boolean>(false);
  const [isCleanStartOpen, setIsCleanStartOpen] = useState<boolean>(false);
  const [isHourlyReportsOpen, setIsHourlyReportsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Initialize storage from server-side memory
  useEffect(() => {
    StorageService.init().then(() => {
      setStats(StorageService.getUserStats());
      setSettings(StorageService.getSettings());
      setPatterns(StorageService.getPatterns());
      setSwings(StorageService.getSwings());
      setActiveTrades(StorageService.getActiveTrades());
      setClosedTrades(StorageService.getClosedTrades());
      setDecisionLogs(StorageService.getDecisionLogs());
      setHourlyReports(StorageService.getHourlyReports());
      setDisqualifiedPatterns(StorageService.getDisqualifiedPatterns());
      setLastDbSync(Date.now());
    });
  }, []);

  // Connection monitoring hook
  const {
    isConnectionLost,
    setIsConnectionLost,
    reconnectCount,
    setReconnectCount,
    isReconnecting,
    handleManualReconnect,
  } = useConnectionMonitor({
    onConnectionRestored: (live) => setTickers(live),
    showToast,
  });

  // Behavioral scanning hook
  const { isScanningNow, runBehavioralScan } = useBehavioralScanner({
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
  });

  // Memory and persistence actions hook
  const {
    handleSaveSettings,
    handleUpdatePatternRepetition,
    handleUpdateMinOccurrences,
    handleResetMemory,
    handleExportMemory,
    handleImportMemory,
    handleMineHistoricalPatterns,
    handleMineAllCoins,
    isMining: isMiningPatterns,
    miningStatus,
    miningProgress,
  } = useMemoryActions({
    settings,
    setSettings,
    setPatterns,
    setStats,
    setSwings,
    setActiveTrades,
    setClosedTrades,
    setDecisionLogs,
    setLastDbSync,
    showToast,
  });

  // Trade execution and management hook
  const {
    handleCloseTradeManual,
    handleEmergencyCloseAll,
  } = useTradeExecution({
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
  });

  // Clean slate reset
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

  // Generate hourly report
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
  }, [activeTrades, closedTrades, decisionLogs, stats, settings, disqualifiedPatterns, showToast]);

  // Apply capital & smart config
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

  // 1. Live Market Prices Fetcher
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const live = await BinanceService.getAllTickers();
        if (live && Object.keys(live).length > 0) {
          setTickers(live);
          if (isConnectionLost) {
            setIsConnectionLost(false);
            setReconnectCount(0);
            AuditLogger.info('SYSTEM', 'CONNECTION_RESTORED', 'تمت استعادة الاتصال بنجاح واستئناف عمل البوت.');
            showToast('🟢 تمت استعادة الاتصال بنجاح واستئناف عمل البوت بالبيانات الحية!');
          }
        }
      } catch (err: any) {
        if (!isConnectionLost) {
          setIsConnectionLost(true);
          AuditLogger.critical('SYSTEM', 'CONNECTION_LOST', `فشل جلب الأسعار الحية من بينانس: ${err?.message || 'انقطاع الاتصال'}. تم إيقاف عمل البوت فورياً لحظر البيانات الوهمية.`);
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 4000);
    return () => clearInterval(interval);
  }, [isConnectionLost, setIsConnectionLost, setReconnectCount, showToast]);

  const scanRef = useRef(runBehavioralScan);
  scanRef.current = runBehavioralScan;

  // 2. Continuous Scan Interval
  useEffect(() => {
    if (!isAutoScanning || isConnectionLost) return;

    const timeout = setTimeout(() => {
      if (!isConnectionLost) {
        scanRef.current();
      }
    }, 1500);

    const interval = setInterval(() => {
      if (!isConnectionLost) {
        scanRef.current();
      }
    }, 16000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isAutoScanning, isConnectionLost]);

  // 3. Automated Hourly Reporting
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

  // 4. Apply Scenario
  const handleApplyScenario = (scenarioId: number) => {
    const res = executeScenario(scenarioId, stats);
    if (res.decision) {
      setDecisionLogs(prev => {
        const filtered = prev.filter(d => d.id !== res.decision!.id);
        const next = [res.decision!, ...filtered].slice(0, 100);
        StorageService.saveDecisionLogs(next);
        return next;
      });
    }
    if (res.trade) {
      setClosedTrades(prev => [res.trade!, ...prev]);
    }
    if (res.updatedStats) {
      setStats(prev => {
        const next = { ...prev, ...res.updatedStats };
        StorageService.saveUserStats(next);
        return next;
      });
    }
    showToast(res.toastMessage);
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

  return {
    stats,
    settings,
    patterns,
    swings,
    activeTrades,
    closedTrades,
    decisionLogs,
    hourlyReports,
    disqualifiedPatterns,
    tickers,
    isAutoScanning,
    setIsAutoScanning,
    isScanningNow,
    isConnectionLost,
    reconnectCount,
    isReconnecting,
    viewingDecision,
    setViewingDecision,
    isScenarioModalOpen,
    setIsScenarioModalOpen,
    isCapitalWizardOpen,
    setIsCapitalWizardOpen,
    isCleanStartOpen,
    setIsCleanStartOpen,
    isHourlyReportsOpen,
    setIsHourlyReportsOpen,
    toastMessage,
    dbStats,
    handleManualReconnect,
    handleConfirmCleanReset,
    handleGenerateHourlyReportNow,
    handleApplyCapitalAndConfig,
    handleEmergencyCloseAll,
    runBehavioralScan,
    handleCloseTradeManual,
    handleApplyScenario,
    handleSaveSettings,
    handleUpdatePatternRepetition,
    handleUpdateMinOccurrences,
    handleResetMemory,
    handleExportMemory,
    handleImportMemory,
    handleMineHistoricalPatterns,
    handleMineAllCoins,
    isMiningPatterns,
    miningStatus,
    miningProgress,
  };
}
