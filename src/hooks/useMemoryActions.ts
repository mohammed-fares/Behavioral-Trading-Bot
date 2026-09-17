import React, { useState, useCallback } from 'react';
import { StorageService } from '../services/storage';
import { StrategySettings, PatternStats, UserStats, Swing, Trade, DecisionLog, Timeframe, SUPPORTED_COINS } from '../types';
import { mineHistoricalPatterns, mergeMinedPatterns, mineMultipleSymbols } from '../services/behavior/historicalPatternMiner';

interface UseMemoryActionsProps {
  settings: StrategySettings;
  setSettings: React.Dispatch<React.SetStateAction<StrategySettings>>;
  setPatterns: React.Dispatch<React.SetStateAction<PatternStats[]>>;
  setStats: React.Dispatch<React.SetStateAction<UserStats>>;
  setSwings: React.Dispatch<React.SetStateAction<Swing[]>>;
  setActiveTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  setClosedTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  setDecisionLogs: React.Dispatch<React.SetStateAction<DecisionLog[]>>;
  setLastDbSync: React.Dispatch<React.SetStateAction<number>>;
  showToast: (msg: string) => void;
}

export function useMemoryActions({
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
}: UseMemoryActionsProps) {
  const handleSaveSettings = useCallback((newSettings: StrategySettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    showToast('تم حفظ الإعدادات وقواعد المخاطر بنجاح');
  }, [setSettings, showToast]);

  const handleUpdatePatternRepetition = useCallback((
    tag: string,
    coin: string,
    newOccurrences: number,
    newConfidence?: number
  ) => {
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
          return { ...d, reviewSteps: updatedSteps };
        }
        return d;
      });
      StorageService.saveDecisionLogs(updated);
      return updated;
    });

    setLastDbSync(Date.now());
    showToast(`✓ تم تحديث تكرار عملة ${coin} للنمط (${tag}) إلى ${newOccurrences} تكرار وحفظه في الذاكرة`);
  }, [settings.minOccurrences, setPatterns, setDecisionLogs, setLastDbSync, showToast]);

  const handleUpdateMinOccurrences = useCallback((newMin: number) => {
    const updatedSettings = { ...settings, minOccurrences: newMin };
    handleSaveSettings(updatedSettings);
    showToast(`✓ تم تحديث الحد الأدنى المطلوب لتكرار النمط إلى ${newMin} تكرار`);
  }, [settings, handleSaveSettings, showToast]);

  const handleResetMemory = useCallback(() => {
    StorageService.resetToFactoryTraining();
    setStats(StorageService.getUserStats());
    setPatterns(StorageService.getPatterns());
    setSwings(StorageService.getSwings());
    setActiveTrades(StorageService.getActiveTrades());
    setClosedTrades(StorageService.getClosedTrades());
    setDecisionLogs(StorageService.getDecisionLogs());
    showToast('تمت إعادة ضبط الذاكرة للمصنع مع 847 تذبذب و 183 نمطاً مدرباً');
  }, [setStats, setPatterns, setSwings, setActiveTrades, setClosedTrades, setDecisionLogs, showToast]);

  const handleExportMemory = useCallback(() => {
    const data = StorageService.exportFullMemory();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavioral-bot-memory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('تم تصدير الذاكرة السلوكية الكاملة بصيغة JSON');
  }, [showToast]);

  const handleImportMemory = useCallback(async (file: File) => {
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
    } catch {
      showToast('خطأ أثناء قراءة ملف الذاكرة');
    }
  }, [setStats, setPatterns, setSwings, setActiveTrades, setClosedTrades, setDecisionLogs, showToast]);

  const [isMining, setIsMining] = useState<boolean>(false);
  const [miningStatus, setMiningStatus] = useState<string | null>(null);
  const [miningProgress, setMiningProgress] = useState<number>(0);

  const handleMineHistoricalPatterns = useCallback(async (
    symbol: string,
    timeframe: Timeframe,
    candleCount: number = 1000
  ) => {
    setIsMining(true);
    setMiningProgress(10);
    setMiningStatus(`جاري بدء تنقيب الأنماط الحقيقية لـ ${symbol} (${timeframe})...`);
    try {
      const result = await mineHistoricalPatterns({ symbol, timeframe, candleCount }, (msg) => {
        setMiningStatus(msg);
      });
      setMiningProgress(80);
      const current = StorageService.getPatterns();
      const merged = mergeMinedPatterns(current, result.patterns);
      StorageService.savePatterns(merged);
      StorageService.saveSwings((StorageService.getSwings() || []).concat(result.swings).slice(-1000));
      setPatterns(merged);
      setSwings(StorageService.getSwings());
      setMiningProgress(100);
      showToast(`تم استكشاف وحفظ ${result.patternsFound} نمطاً حقيقياً لـ ${symbol}!`);
      return result;
    } catch (err: any) {
      showToast(`فشل التنقيب: ${err.message || 'خطأ في الاتصال'}`);
      throw err;
    } finally {
      setTimeout(() => {
        setIsMining(false);
        setMiningStatus(null);
        setMiningProgress(0);
      }, 1500);
    }
  }, [setPatterns, setSwings, showToast]);

  const handleMineAllCoins = useCallback(async (
    timeframes: Timeframe[] = ['15m', '1h'],
    candlesPerBatch: number = 1000
  ) => {
    setIsMining(true);
    setMiningProgress(5);
    const symbols = SUPPORTED_COINS.map(c => c.symbol);
    try {
      const res = await mineMultipleSymbols(symbols, timeframes, candlesPerBatch, (msg, pct) => {
        setMiningStatus(msg);
        setMiningProgress(pct);
      });
      const current = StorageService.getPatterns();
      const merged = mergeMinedPatterns(current, res.patterns);
      StorageService.savePatterns(merged);
      StorageService.saveSwings((StorageService.getSwings() || []).concat(res.swings).slice(-1000));
      setPatterns(merged);
      setSwings(StorageService.getSwings());
      showToast(`اكتمل التنقيب الشامل: ${merged.length} نمطاً حقيقياً متوفراً في الذاكرة!`);
      return res;
    } catch (err: any) {
      showToast(`فشل التنقيب: ${err.message || 'خطأ غير متوقع'}`);
      throw err;
    } finally {
      setTimeout(() => {
        setIsMining(false);
        setMiningStatus(null);
        setMiningProgress(0);
      }, 1500);
    }
  }, [setPatterns, setSwings, showToast]);

  return {
    handleSaveSettings,
    handleUpdatePatternRepetition,
    handleUpdateMinOccurrences,
    handleResetMemory,
    handleExportMemory,
    handleImportMemory,
    handleMineHistoricalPatterns,
    handleMineAllCoins,
    isMining,
    miningStatus,
    miningProgress,
  };
}
