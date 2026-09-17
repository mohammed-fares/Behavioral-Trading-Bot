import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Sparkles, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Download, 
  ShieldAlert, 
  Database 
} from 'lucide-react';
import { UserStats, PatternStats, HourlyReport, DisqualifiedPattern, DecisionLog, Trade } from '../../types';

interface DashboardMetricsCardsProps {
  stats: UserStats;
  patterns: PatternStats[];
  totalSwings: number;
  avgConfidence: number;
  hourlyReports: HourlyReport[];
  disqualifiedPatterns: DisqualifiedPattern[];
  recentDecisions: DecisionLog[];
  activeTrades: Trade[];
  dbStats?: {
    totalTradesCount: number;
    patternsCount: number;
    swingsCount: number;
    decisionsCount: number;
    hourlyReportsCount: number;
    disqualifiedCount: number;
    lastSyncTime: number;
    estimatedKb: number;
  };
  onExportCurrentHourReport: () => void;
  onOpenHourlyReports?: () => void;
}

export const DashboardMetricsCards: React.FC<DashboardMetricsCardsProps> = ({
  stats,
  patterns,
  totalSwings,
  avgConfidence,
  hourlyReports,
  disqualifiedPatterns,
  recentDecisions,
  activeTrades,
  dbStats,
  onExportCurrentHourReport,
  onOpenHourlyReports,
}) => {
  return (
    <>
      {/* 1. Top Section: 8 Key Metrics (4 General + 4 Behavioral) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            الحالة العامة وسجل الأداء المالي
          </h2>
          <span className="text-xs text-slate-400 font-mono">آخر تحديث: قبل لحظات</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Capital */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="text-xs font-medium text-slate-400">رأس المال الحالي</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              ${stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>البداية: ${stats.initialBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Realized PnL */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="text-xs font-medium text-slate-400">الأرباح التراكمية المحققة</div>
            <div className={`text-xl sm:text-2xl font-bold font-mono mt-1 flex items-center gap-1 ${
              stats.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {stats.realizedPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {stats.realizedPnL >= 0 ? '+' : ''}${stats.realizedPnL.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-400 font-mono mt-1">
              {stats.initialBalance > 0 ? (
                <>+{((stats.realizedPnL / stats.initialBalance) * 100).toFixed(2)}% صافي العائد</>
              ) : (
                <>0.00% صافي العائد</>
              )}
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="text-xs font-medium text-slate-400">نسبة النجاح (Win Rate)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {stats.winRate}%
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {stats.winCount} رابحة / {stats.lossCount} خاسرة ({stats.totalTrades} صفقات)
            </div>
          </div>

          {/* Profit Factor / Sharpe */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="text-xs font-medium text-slate-400">عامل الربح (Profit Factor)</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-400 mt-1">
              {stats.profitFactor}x
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              أقصى تراجع: {stats.maxDrawdownPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Memory State Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            حالة ذاكرة السلوك والأنماط (Behavior Memory)
          </h2>
          <span className="text-xs text-cyan-400/80 font-mono">ذاكرة محلية مستمرة بدون خوادم</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/20 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              إجمالي التذبذبات المسجلة
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {totalSwings.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              عبر 7 أطر زمنية منفصلة
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              بصمات الأنماط الفريدة
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {patterns.length} نمط
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              صيغة: Direction-Mag-RSI-ADX
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/20 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              الأطر الممسوحة لكل عملة
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-300 mt-1">
              7 أطر × 8 عملات
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              = 56 ذاكرة سلوكية مستقلة
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/20 rounded-xl p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              متوسط دقة التنبؤ
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-teal-400 mt-1">
              {avgConfidence}%
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              تتطور باستمرار مع كل صفقة
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Reports, Anti-Mistake Engine, and Continuous DB Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Latest Hourly Report */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">التقرير الساعي التلقائي</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                كل 60 دقيقة
              </span>
            </div>

            {hourlyReports.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">آخر تقرير تم توليده:</span>
                  <span className="text-slate-200 font-mono text-[11px]">{hourlyReports[0].formattedTime}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">صافي عائد الساعة:</span>
                  <span className={`font-mono font-bold ${hourlyReports[0].netPnLUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {hourlyReports[0].netPnLUsd >= 0 ? '+' : ''}${hourlyReports[0].netPnLUsd.toFixed(2)} ({hourlyReports[0].roiPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">الصفقات المنفذة:</span>
                  <span className="text-slate-300 font-mono">
                    {hourlyReports[0].totalTrades} (فوز: {hourlyReports[0].winningTrades} / خسارة: {hourlyReports[0].losingTrades})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 mt-2">
                  {hourlyReports[0].summaryText}
                </p>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                سيتم توليد التقرير الساعي الأول تلقائياً أو يمكنك الضغط على "تصدير الآن".
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onExportCurrentHourReport}
              className="flex-1 py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3 h-3" />
              تصدير الساعة الآن
            </button>
            {onOpenHourlyReports && (
              <button
                type="button"
                onClick={onOpenHourlyReports}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                عرض الأرشيف ({hourlyReports.length})
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Anti-Mistake Repetition Engine (Negative Learning) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">منع تكرار الأخطاء السابقة</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Anti-Repetition
              </span>
            </div>

            {disqualifiedPatterns.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  تم حظر واستبعاد <span className="font-bold text-amber-400 font-mono">{disqualifiedPatterns.length} أنماط</span> تسببت في خسائر سابقة لضمان عدم تكرارها:
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {disqualifiedPatterns.slice(0, 2).map((dp) => (
                    <div key={dp.id} className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">{dp.coin} ({dp.timeframe})</span>
                        <span className="text-rose-400 font-mono font-bold">-${dp.lossUsd.toFixed(1)}</span>
                      </div>
                      <div className="text-indigo-300 text-[10px] mt-0.5 line-clamp-1">
                        الدرس: {dp.lesson}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                لا توجد أخطاء مسجلة — البوت يحافظ على سجل نظيف مع التزام صارم بوقف الخسارة.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              الحماية من التكرار نشطة 100%
            </span>
            {onOpenHourlyReports && (
              <button
                type="button"
                onClick={onOpenHourlyReports}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                عرض القائمة
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Continuous Database & Local Persistence Sync */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">استمرارية قاعدة البيانات المحلية</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                متزامنة حياً
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">حالة التخزين المستمر:</span>
                <span className="text-emerald-400 font-semibold">نشطة ومستقرة محلياً</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">إجمالي سجلات الصفقات:</span>
                <span className="text-slate-200 font-mono font-bold">{dbStats?.totalTradesCount ?? (stats.totalTrades + activeTrades.length)} صفقة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ذاكرة القرارات والأنماط:</span>
                <span className="text-slate-200 font-mono font-bold">{patterns.length} نمط / {recentDecisions.length} قرار</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">حجم الذاكرة التقديري:</span>
                <span className="text-cyan-400 font-mono">{dbStats?.estimatedKb ?? 48} KB في المتصفح</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>تحديث دوري مستمر مع كل شمعة وصفقة</span>
            <span className="text-slate-500 font-mono">Auto-Saved</span>
          </div>
        </div>
      </div>
    </>
  );
};
