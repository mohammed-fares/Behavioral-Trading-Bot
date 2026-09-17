import React, { useCallback } from 'react';
import { StorageService } from '../services/storage';
import { StrategySettings, PatternStats, UserStats, Swing, Trade, DecisionLog } from '../types';

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

  return {
    handleSaveSettings,
    handleUpdatePatternRepetition,
    handleUpdateMinOccurrences,
    handleResetMemory,
    handleExportMemory,
    handleImportMemory,
  };
}
