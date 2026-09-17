import React from 'react';
import { 
  Server, 
  Cpu, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Clock, 
  Wallet, 
  Pause, 
  Play, 
  Power, 
  ShieldAlert, 
  Lock 
} from 'lucide-react';
import { UserStats, StrategySettings, Trade, HourlyReport } from '../../types';

interface DashboardHeaderSectionProps {
  stats: UserStats;
  settings: StrategySettings;
  activeTrades: Trade[];
  isAutoScanning: boolean;
  setIsAutoScanning: React.Dispatch<React.SetStateAction<boolean>>;
  isLive: boolean;
  isConnectionLost?: boolean;
  reconnectCount?: number;
  onManualReconnect?: () => void;
  onOpenCleanStart?: () => void;
  onOpenHourlyReports?: () => void;
  hourlyReports?: HourlyReport[];
  onOpenCapitalWizard: () => void;
  onEmergencyCloseAll?: () => void;
  onSwitchExecutionMode?: (mode: 'PAPER' | 'LIVE') => void;
}

export const DashboardHeaderSection: React.FC<DashboardHeaderSectionProps> = ({
  stats,
  settings,
  activeTrades,
  isAutoScanning,
  setIsAutoScanning,
  isLive,
  isConnectionLost,
  reconnectCount = 0,
  onManualReconnect,
  onOpenCleanStart,
  onOpenHourlyReports,
  hourlyReports = [],
  onOpenCapitalWizard,
  onEmergencyCloseAll,
  onSwitchExecutionMode,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Status & Readiness Declaration */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
            isLive 
              ? 'bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-600/20 ring-1 ring-rose-400/30'
              : 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/20 ring-1 ring-emerald-400/30'
          }`}>
            {isLive ? <Server className="w-6 h-6" /> : <Cpu className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>أمر الجاهزية والتشغيل: البوت جاهز للرفع والعمل</span>
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                isLive 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {isLive ? '🔴 تداول حقيقي (Live Binance)' : '🟢 تداول وهمي تجريبي (Paper)'}
              </span>

              {/* Connection Status Badge */}
              {isConnectionLost ? (
                <button 
                  onClick={onManualReconnect}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-500/25 text-rose-300 border border-rose-500/50 flex items-center gap-1.5 animate-pulse hover:bg-rose-500/35 transition cursor-pointer"
                  title="انقطع الاتصال - تم إيقاف البوت لمنع البيانات الوهمية (اضغط لإعادة المحاولة فوراً)"
                >
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>منقطع (البوت متوقف)</span>
                  {reconnectCount > 0 && <span className="text-[10px] bg-rose-900/60 px-1 rounded text-rose-200">#{reconnectCount}</span>}
                </button>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>بيانات Binance حية فقط (حظر الوهمي نشط)</span>
                </span>
              )}

              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoScanning && !isConnectionLost ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {isConnectionLost ? 'المحرك معلّق مؤقتاً بسبب انقطاع الاتصال' : isAutoScanning ? 'المحرك يعمل باستمرار 24/7' : 'المحرك متوقف مؤقتاً'}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isLive
                ? 'البوت متصل بحسابك الحقيقي ويقوم بمسح أطر الأنماط السبعة واتخاذ القرارات وتنفيذ الصفقات تلقائياً بضوابط إدارة المخاطر.'
                : 'البوت يعمل بأسعار Binance الحقيقية المباشرة في وضع المحاكاة الآمنة (بدون أي مخاطرة مالية) مع تسجيل الذاكرة والتعلم التراكمي.'
              }
            </p>
          </div>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Clean Start */}
          {onOpenCleanStart && (
            <button
              onClick={onOpenCleanStart}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition cursor-pointer"
              title="تصفير الصفقات وبدء اختبار جديد من الصفر"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>البداية من الصفر للاختبار</span>
            </button>
          )}

          {/* Hourly Reports */}
          {onOpenHourlyReports && (
            <button
              onClick={onOpenHourlyReports}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-500/40 text-xs font-semibold shadow-sm transition cursor-pointer"
              title="تقارير الأداء الساعية وقائمة منع تكرار الخطأ"
            >
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>تقارير الساعة ({hourlyReports.length})</span>
            </button>
          )}

          {/* Open Wizard */}
          <button
            onClick={onOpenCapitalWizard}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>تحديد رأس المال والضبط</span>
          </button>

          {/* Toggle Engine */}
          <button
            onClick={() => setIsAutoScanning(prev => !prev)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer ${
              isAutoScanning
                ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 hover:bg-rose-500/25'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
            }`}
          >
            {isAutoScanning ? (
              <>
                <Pause className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>توقيف البوت عن العمل</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>تشغيل واستئناف البوت</span>
              </>
            )}
          </button>

          {/* Emergency close all if any active trades */}
          {activeTrades.length > 0 && onEmergencyCloseAll && (
            <button
              onClick={onEmergencyCloseAll}
              title="إغلاق اضطراري لكافة الصفقات وحجز الأرباح فوراً"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-600/50 text-xs font-semibold transition cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-rose-400" />
              <span>إغلاق طوارئ ({activeTrades.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner when Bot is Stopped */}
      {!isAutoScanning && (
        <div className="mt-4 bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300">تنبيه: البوت متوقف عن العمل حالياً.</strong> لن يتم تنفيذ مسح للأطر أو فتح أو إغلاق أي صفقات جديدة حتى تضغط على "تشغيل واستئناف البوت".
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAutoScanning(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shrink-0 transition cursor-pointer"
          >
            استئناف العمل الآن
          </button>
        </div>
      )}

      {/* Mode Isolation & Separation Status Banner */}
      <div className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
        isLive 
          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLive ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{isLive ? 'النظام الحقيقي المستقل (Live Trading)' : 'النظام التجريبي المستقل (Paper Trading)'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isLive ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
              }`}>
                {isLive ? 'بيانات وأموال حقيقية' : 'بيئة تجريبية معزولة'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLive
                ? 'سجلات الصفقات، القرارات، والمحفظة منفصلة بالكامل ومحفوظة لحسابك الحقيقي على بينانس.'
                : 'الصفقات والإحصائيات هنا معزولة تماماً عن النظام الحقيقي وتستخدم محفظة تجريبية افتراضية.'}
            </p>
          </div>
        </div>

        {onSwitchExecutionMode && (
          <button
            onClick={() => onSwitchExecutionMode(isLive ? 'PAPER' : 'LIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isLive
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isLive ? 'التبديل إلى الوضع التجريبي' : 'التبديل إلى الوضع الحقيقي'}</span>
          </button>
        )}
      </div>

      {/* Quick parameters summary bar */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">رأس المال:</span>
          <span className="text-white font-bold">${stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">حجم الصفقة/هامش:</span>
          <span className="text-emerald-400 font-bold">{settings.positionSizePct}% (${((stats.balance * settings.positionSizePct) / 100).toFixed(1)})</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">الرافعة المالية:</span>
          <span className="text-cyan-400 font-bold">{settings.leverage}x ديناميكية</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">إيقاف الخسارة الذكي:</span>
          <span className="text-amber-400 font-bold">Smart Exit عند 25%</span>
        </div>
      </div>
    </div>
  );
};
