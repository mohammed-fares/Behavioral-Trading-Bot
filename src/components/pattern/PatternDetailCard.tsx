import React from 'react';
import { Sparkles, Sliders, Clock } from 'lucide-react';
import { PatternStats } from '../../types';

interface PatternDetailCardProps {
  activePattern: PatternStats | null;
  onOpenEditModal: () => void;
}

export const PatternDetailCard: React.FC<PatternDetailCardProps> = ({
  activePattern,
  onOpenEditModal,
}) => {
  if (!activePattern) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-10 text-center text-slate-400 text-xs">
        حدد نمطاً من القائمة الجانبية لعرض تشريح البصمة والإحصائيات
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
      {/* Pattern Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {activePattern.coin}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              الإطار: {activePattern.timeframe}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
              activePattern.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {activePattern.direction === 'UP' ? 'صعود (UP)' : 'هبوط (DOWN)'}
            </span>
          </div>
          <h3 className="text-lg font-bold font-mono text-white mt-1.5">
            {activePattern.tag}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-left font-mono">
          <button
            onClick={onOpenEditModal}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-sans font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            تعديل التكرار ({activePattern.occurrences})
          </button>

          <div>
            <span className="text-[11px] text-slate-400 block">نسبة الثقة التاريخية</span>
            <span className="text-2xl font-bold text-emerald-400">
              {activePattern.confidence || activePattern.continuationRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Anatomy of the Pattern Tag (بصمة النمط المفصلة) */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 font-mono">
        <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          تشريح بصمة النمط (Pattern Signature Analysis)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">مقدار التذبذب</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{activePattern.magnitudePct}%</span>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">مدة التذبذب</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{activePattern.durationMinutes} دقيقة</span>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">متوسط الحركة التالية</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">+{activePattern.avgSubsequentMovePct}%</span>
          </div>
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">متوسط المدة التالية</span>
            <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{activePattern.avgSubsequentDuration} دقيقة</span>
          </div>
        </div>
      </div>

      {/* Outcomes Breakdown (استمر / انعكس / تحول جانبي) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300">سجل نتائج النمط بعد انتهاء التذبذب ({activePattern.occurrences} تكرار)</span>
          <span className="text-slate-400 font-mono">
            {activePattern.continuedCount} استمر • {activePattern.reversedCount} عكس • {activePattern.sidewaysCount} جانبي
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 font-mono">
          {/* Continued */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-center">
            <span className="text-xs text-emerald-400 font-sans block">استمر بالاتجاه</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              {activePattern.continuationRate}%
            </span>
            <span className="text-[10px] text-emerald-500 block">({activePattern.continuedCount} مرة)</span>
          </div>

          {/* Reversed */}
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg text-center">
            <span className="text-xs text-rose-400 font-sans block">انعكس الاتجاه</span>
            <span className="text-lg font-bold text-rose-400 mt-0.5 block">
              {activePattern.reversalRate}%
            </span>
            <span className="text-[10px] text-rose-500 block">({activePattern.reversedCount} مرة)</span>
          </div>

          {/* Sideways */}
          <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg text-center">
            <span className="text-xs text-slate-400 font-sans block">حركة جانبية</span>
            <span className="text-lg font-bold text-slate-300 mt-0.5 block">
              {activePattern.sidewaysRate}%
            </span>
            <span className="text-[10px] text-slate-400 block">({activePattern.sidewaysCount} مرة)</span>
          </div>
        </div>
      </div>

      {/* Best Hours Distribution */}
      {activePattern.bestHours && (
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              أداء النمط حسب ساعات التداول (UTC Hours)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">بيانات تاريخية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {Object.entries(activePattern.bestHours).map(([hour, stat]: [string, any]) => (
              <div key={hour} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">الساعة {hour}:00 UTC</div>
                <div className={`text-sm font-bold mt-0.5 ${stat.winRate >= 70 ? 'text-emerald-400' : stat.winRate <= 45 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {stat.winRate}% نجاح
                </div>
                <div className="text-[10px] text-slate-500">
                  {stat.count} صفقات • ربح: {stat.avgProfit > 0 ? '+' : ''}{stat.avgProfit}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
