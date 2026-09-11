/**
 * EditRepetitionModal — نافذة تعديل التكرار للعملات والأنماط
 * تتيح للمستخدم التحكم المباشر في عدد تكرارات النمط ونسبة ثقته والحد الأدنى المطلوب للتداول
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  RotateCcw, 
  Save,
  Layers,
  Clock
} from 'lucide-react';

interface EditRepetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: string;
  patternTag: string;
  currentOccurrences: number;
  currentConfidence: number;
  minOccurrences: number;
  onSave: (coin: string, patternTag: string, newOccurrences: number, newConfidence: number) => void;
  onUpdateMinOccurrences?: (newMin: number) => void;
}

export const EditRepetitionModal: React.FC<EditRepetitionModalProps> = ({
  isOpen,
  onClose,
  coin,
  patternTag,
  currentOccurrences,
  currentConfidence,
  minOccurrences,
  onSave,
  onUpdateMinOccurrences,
}) => {
  const [occurrences, setOccurrences] = useState<number>(currentOccurrences || 20);
  const [confidence, setConfidence] = useState<number>(currentConfidence || 65);
  const [minReq, setMinReq] = useState<number>(minOccurrences || 20);

  useEffect(() => {
    if (isOpen) {
      setOccurrences(currentOccurrences || 20);
      setConfidence(currentConfidence || 65);
      setMinReq(minOccurrences || 20);
    }
  }, [isOpen, currentOccurrences, currentConfidence, minOccurrences]);

  if (!isOpen) return null;

  const passesRequirement = occurrences >= minReq;

  const handleSave = () => {
    onSave(coin, patternTag, Math.max(1, occurrences), Math.min(99, Math.max(10, confidence)));
    if (onUpdateMinOccurrences && minReq !== minOccurrences) {
      onUpdateMinOccurrences(minReq);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                تعديل التكرار للعملة في الذاكرة
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  {coin}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                {patternTag}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5 text-xs font-sans">
          {/* Status Indicator */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            passesRequirement 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              {passesRequirement ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>
                {passesRequirement 
                  ? `يجتاز شرط التكرار الإحصائي (تكرر ${occurrences} مرة ≥ ${minReq} مطلوب)`
                  : `أقل من الحد الأدنى المطلوب (${occurrences} < ${minReq} تكرار)`}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-white font-bold">
              {passesRequirement ? 'مقبول إحصائياً ✓' : 'انتظار ⏸'}
            </span>
          </div>

          {/* Occurrences Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white text-xs">
                عدد التكرارات المسجلة في الذاكرة (Occurrences)
              </label>
              <span className="font-mono text-cyan-400 font-bold text-sm">
                {occurrences} تكرار
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOccurrences(prev => Math.max(1, prev - 5))}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono font-bold transition"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setOccurrences(prev => Math.max(1, prev - 1))}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono font-bold transition"
              >
                -1
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={occurrences}
                onChange={(e) => setOccurrences(Number(e.target.value) || 1)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-center font-bold text-sm focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setOccurrences(prev => prev + 1)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono font-bold transition"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setOccurrences(prev => prev + 5)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono font-bold transition"
              >
                +5
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500">خيارات سريعة:</span>
              {[8, 15, 20, 25, 35, 48, 65].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOccurrences(preset)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                    occurrences === preset
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white text-xs">
                نسبة الثقة والاستمرار التاريخية (Confidence %)
              </label>
              <span className={`font-mono font-bold text-sm ${confidence >= 65 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="95"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>ضعيف (20%)</span>
              <span>حد القبول الموصى به (65%)</span>
              <span>مرتفع جداً (95%)</span>
            </div>
          </div>

          {/* System Min Occurrences Threshold */}
          {onUpdateMinOccurrences && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-slate-300 text-xs block">
                    الحد الأدنى العام للتكرار في النظام (System Min Occurrences)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    العدد الأدنى الذي يطلبه البوت في سجل القرارات لفتح الصفقات
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={minReq}
                    onChange={(e) => setMinReq(Number(e.target.value) || 5)}
                    className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-center text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 text-xs">تكرار</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
            💡 <strong>تأثير التعديل:</strong> عند حفظ التكرار، سيتم تحديث هذا النمط في الذاكرة المحلية فوراً، وإعادة حساب عدد مرات الاستمرار والانعكاس تلقائياً، وتطبيقه على نتائج فحص القرارات السلوكية للعملة.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-md transition"
          >
            <Save className="w-3.5 h-3.5" />
            حفظ وتحديث الذاكرة
          </button>
        </div>
      </div>
    </div>
  );
};
