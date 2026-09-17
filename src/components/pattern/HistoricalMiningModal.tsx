import React, { useState } from 'react';
import { 
  Database, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock, 
  Activity, 
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { Timeframe, SUPPORTED_COINS } from '../../types';

interface HistoricalMiningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMineHistoricalPatterns: (symbol: string, timeframe: Timeframe, candleCount: number) => Promise<any>;
  onMineAllCoins: (timeframes: Timeframe[], candleCount: number) => Promise<any>;
  isMining: boolean;
  miningStatus: string | null;
  miningProgress: number;
}

export const HistoricalMiningModal: React.FC<HistoricalMiningModalProps> = ({
  isOpen,
  onClose,
  onMineHistoricalPatterns,
  onMineAllCoins,
  isMining,
  miningStatus,
  miningProgress,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedTf, setSelectedTf] = useState<Timeframe>('15m');
  const [candleCount, setCandleCount] = useState<number>(1000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateDaysCovered = (tf: Timeframe, count: number): string => {
    const minsMap: Record<Timeframe, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
    };
    const totalMinutes = (minsMap[tf] || 15) * count;
    const days = (totalMinutes / 1440).toFixed(1);
    if (Number(days) >= 365) {
      return `${(Number(days) / 365).toFixed(1)} سنة (${days} يوم)`;
    }
    if (Number(days) >= 30) {
      return `${(Number(days) / 30).toFixed(1)} شهر (${days} يوم)`;
    }
    return `${days} يوم`;
  };

  const handleStartMining = async () => {
    setErrorMsg(null);
    try {
      if (selectedTarget === 'ALL') {
        await onMineAllCoins([selectedTf, '1h'], candleCount);
      } else {
        await onMineHistoricalPatterns(selectedTarget, selectedTf, candleCount);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء التنقيب من بينانس');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                منقّب الأنماط التاريخية الحقيقية (Real Historical Pattern Miner)
              </h3>
              <p className="text-xs text-slate-400">
                استكشاف وتحليل الشموع التاريخية من منصة Binance بدون بيانات وهمية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isMining}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target Coins */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              العملة المستهدفة للتحليل:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTarget('ALL')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedTarget === 'ALL'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                جميع العملات (8 Pairs)
              </button>
              {SUPPORTED_COINS.slice(0, 5).map(c => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => setSelectedTarget(c.symbol)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition ${
                    selectedTarget === c.symbol
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {c.symbol}
                </button>
              ))}
            </div>
            {selectedTarget !== 'ALL' && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {SUPPORTED_COINS.slice(5).map(c => (
                  <button
                    key={c.symbol}
                    type="button"
                    onClick={() => setSelectedTarget(c.symbol)}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition ${
                      selectedTarget === c.symbol
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe & Candle Depth */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                الإطار الزمني للشموع:
              </label>
              <select
                value={selectedTf}
                onChange={(e) => setSelectedTf(e.target.value as Timeframe)}
                disabled={isMining}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="15m">15m (ربع ساعة - Day Trading)</option>
                <option value="1h">1h (ساعة واحدة - Swing)</option>
                <option value="4h">4h (أربع ساعات - Trend)</option>
                <option value="1d">1d (يومي - منذ بداية النشأة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                عمق الشموع التاريخية:
              </label>
              <select
                value={candleCount}
                onChange={(e) => setCandleCount(Number(e.target.value))}
                disabled={isMining}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={500}>500 شمعة حقيقية</option>
                <option value={1000}>1,000 شمعة حقيقية (موصى به)</option>
                <option value={2000}>2,000 شمعة تاريخية عميقة</option>
                <option value={5000}>5,000 شمعة تاريخية ممتدة</option>
              </select>
            </div>
          </div>

          {/* Historical Range Overview Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>المدى التاريخي التقديري المغطى:</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">
              {calculateDaysCovered(selectedTf, candleCount)}
            </span>
          </div>

          {/* Mining Progress Banner */}
          {isMining && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  {miningStatus || 'جاري التنقيب من بينانس...'}
                </span>
                <span className="font-mono font-bold text-emerald-400">{miningProgress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${Math.max(5, miningProgress)}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isMining}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handleStartMining}
            disabled={isMining}
            className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isMining ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جاري استخراج الأنماط...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                بدء التنقيب واستخراج الأنماط
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
