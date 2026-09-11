import React, { useState } from 'react';
import { RotateCcw, ShieldAlert, Sparkles, CheckCircle2, Play, DollarSign, X } from 'lucide-react';
import { StrategySettings } from '../types';

interface CleanStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (capital: number, mode: 'PAPER' | 'LIVE', options: { wipeTradeHistory: boolean; wipeDecisions: boolean; wipeDisqualified: boolean }) => void;
  currentCapital: number;
  currentMode: 'PAPER' | 'LIVE';
}

export const CleanStartModal: React.FC<CleanStartModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  currentCapital,
  currentMode,
}) => {
  const [capital, setCapital] = useState<number>(currentCapital || 1000);
  const [mode, setMode] = useState<'PAPER' | 'LIVE'>(currentMode || 'PAPER');
  const [wipeTradeHistory, setWipeTradeHistory] = useState<boolean>(true);
  const [wipeDecisions, setWipeDecisions] = useState<boolean>(true);
  const [wipeDisqualified, setWipeDisqualified] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmReset(capital, mode, {
      wipeTradeHistory,
      wipeDecisions,
      wipeDisqualified,
    });
    onClose();
  };

  const presetAmounts = [250, 500, 1000, 2500, 5000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-900/60 via-slate-800 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <RotateCcw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                البداية من الصفر للاختبار
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Clean Slate Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفير المحفظة والبدء بسجل ناصع البياض لاختبار البوت من الثانية صفر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Notice Box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="text-amber-300 block mb-1">ماذا يعني البدء من الصفر للاختبار؟</strong>
              سيتم إغلاق وتصفير أي صفقات مفتوحة، وإعادة تعيين الأرباح والخسائر ونسبة العائد إلى 0.0%، وتهيئة رأس مال جديد، وتحديث قاعدة البيانات فوراً.
            </div>
          </div>

          {/* Capital Setup */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>رأس مال الاختبار الابتدائي (USDT):</span>
              <span className="text-emerald-400 font-mono text-base">${capital.toLocaleString()}</span>
            </label>

            <div className="grid grid-cols-5 gap-2">
              {presetAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCapital(amt)}
                  className={`py-2 text-xs font-semibold rounded-lg transition border ${
                    capital === amt
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <div className="relative mt-2">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="10"
                step="50"
                value={capital}
                onChange={(e) => setCapital(Math.max(10, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-4 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                placeholder="أدخل مبلغ رأس المال المخصص..."
              />
            </div>
          </div>

          {/* Trading Mode */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-200">وضع التداول المفضل للاختبار:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('PAPER')}
                className={`p-3.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  mode === 'PAPER'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-300">تداول وهمي دقيق (Paper)</span>
                  {mode === 'PAPER' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">
                  أسعار حية حقيقية من بينانس بدون المخاطرة برأس مال فعلي — مثالي للاختبار الأولي.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('LIVE')}
                className={`p-3.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  mode === 'LIVE'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-300">تداول حقيقي (Live Binance)</span>
                  {mode === 'LIVE' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">
                  تنفيذ أوامر حقيقية عبر مفاتيح API في حسابك على منصة بينانس.
                </span>
              </button>
            </div>
          </div>

          {/* Clean Slate Checkboxes */}
          <div className="space-y-2.5 bg-slate-800/50 p-4 rounded-xl border border-slate-750">
            <label className="text-xs font-bold text-slate-300 block mb-2">خيارات تنظيف الذاكرة للاختبار:</label>
            
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wipeTradeHistory}
                onChange={(e) => setWipeTradeHistory(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-600 focus:ring-emerald-500"
              />
              <span>تصفير سجل الصفقات المغلقة (بدء سجل صفقات جديد من 0 صفقة)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wipeDecisions}
                onChange={(e) => setWipeDecisions(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-600 focus:ring-emerald-500"
              />
              <span>تصفير سجل القرارات السابقة (بدء تسجيل فوري للإشارات الجديدة فقط)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wipeDisqualified}
                onChange={(e) => setWipeDisqualified(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-600 focus:ring-emerald-500"
              />
              <span>تصفير قائمة الأنماط المستبعدة (بدء دورة جديدة لاكتشاف الدروس السلوكية)</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900/90 px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            إلغاء التراجع
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4 fill-white" />
            بدء الاختبار من الصفر الآن 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
