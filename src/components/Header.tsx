/**
 * Header Component — شريط الرأس والتحكم السريع
 */

import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCw, 
  Sliders, 
  Brain, 
  Sparkles, 
  Layers, 
  Compass, 
  FileText, 
  History, 
  BarChart3, 
  Activity,
  Zap,
  HelpCircle,
  Wallet,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { UserStats, StrategySettings } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: UserStats;
  settings: StrategySettings;
  isAutoScanning: boolean;
  setIsAutoScanning: React.Dispatch<React.SetStateAction<boolean>>;
  onManualScan: () => void;
  onOpenScenarios: () => void;
  onOpenTestScanModal: () => void;
  onOpenCapitalWizard: () => void;
  onOpenCleanStart: () => void;
  onOpenHourlyReports: () => void;
  isScanningNow: boolean;
  totalSwings: number;
  totalPatterns: number;
  hourlyReportsCount?: number;
  disqualifiedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  settings,
  isAutoScanning,
  setIsAutoScanning,
  onManualScan,
  onOpenScenarios,
  onOpenTestScanModal,
  onOpenCapitalWizard,
  onOpenCleanStart,
  onOpenHourlyReports,
  isScanningNow,
  totalSwings,
  totalPatterns,
  hourlyReportsCount = 0,
  disqualifiedCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: Activity },
    { id: 'matrix', label: 'الأطر المتعددة (7D)', icon: Layers },
    { id: 'explorer', label: 'مستكشف الأنماط', icon: Compass },
    { id: 'decisions', label: 'سجل القرارات', icon: FileText },
    { id: 'trades', label: 'سجل الصفقات', icon: History },
    { id: 'analytics', label: 'الإحصائيات السلوكية', icon: BarChart3 },
    { id: 'settings', label: 'الإعدادات والمخاطر', icon: Sliders },
  ];

  const profitPct = (((stats.balance - stats.initialBalance) / stats.initialBalance) * 100).toFixed(2);
  const isProfitable = stats.balance >= stats.initialBalance;
  const isLive = settings.tradingExecutionMode === 'LIVE';

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner: Brand and Global Live Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Concept */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/10">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Behavioral Bot
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                  7-TF Memory
                </span>
              </h1>
              {/* Ready status pill */}
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                جاهز للعمل المباشر والوهمي
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              بوت التداول السلوكي متعدد الأطر — يتعلم من التاريخ ويتخذ قراراته عند توافق 5+ أطر
            </p>
          </div>
        </div>

        {/* Live Metrics Pill Group */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
          {/* Capital & Mode Switcher Quick Button */}
          <button
            onClick={onOpenCapitalWizard}
            title="تحديد رأس المال واختيار التداول الحقيقي أو الوهمي"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
              isLive 
                ? 'bg-rose-950/40 border-rose-500/50 hover:bg-rose-900/50 text-rose-200' 
                : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 text-slate-200'
            }`}
          >
            <Wallet className={`w-4 h-4 ${isLive ? 'text-rose-400' : 'text-amber-400'}`} />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium leading-none">
                رأس المال: <span className="font-mono text-white font-bold">${stats.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-[10px] font-bold mt-0.5 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className={isLive ? 'text-rose-300' : 'text-emerald-400'}>
                  {isLive ? 'وضع حقيقي (Live)' : 'وضع وهمي (Paper)'}
                </span>
              </div>
            </div>
          </button>

          {/* Balance & PnL */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 hidden md:flex items-center gap-3">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">الأرباح/الخسائر</div>
              <div className={`text-xs font-bold font-mono flex items-center gap-0.5 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfitable ? '+' : ''}{profitPct}% (${(stats.balance - stats.initialBalance).toFixed(2)})
              </div>
            </div>
          </div>

          {/* Behavioral Memory Stats */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 hidden xl:flex items-center gap-3">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">ذاكرة التذبذبات</div>
              <div className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {totalSwings.toLocaleString()}
              </div>
            </div>
            <div className="border-r border-slate-800 pr-3">
              <div className="text-[10px] text-slate-400 font-medium">الأنماط المسجلة</div>
              <div className="text-sm font-bold text-cyan-400 font-mono">
                {totalPatterns} نمط
              </div>
            </div>
          </div>

          {/* Controls: Clean Start, Hourly Reports, Scan, Power Button */}
          <div className="flex items-center gap-2">
            {/* Clean Start Button */}
            <button
              onClick={onOpenCleanStart}
              title="البداية من الصفر للاختبار وتصفير الصفقات السابقة"
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/40 transition"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">البداية من الصفر</span>
            </button>

            {/* Hourly Reports Button */}
            <button
              onClick={onOpenHourlyReports}
              title="عرض وتصدير تقارير الأداء الساعية والأنماط المستبعدة"
              className="flex items-center gap-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-200 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-indigo-500/40 transition"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">تقارير كل ساعة</span>
              {hourlyReportsCount > 0 && (
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1 rounded-full font-mono">
                  {hourlyReportsCount}
                </span>
              )}
            </button>

            {/* Manual Scan */}
            <button
              onClick={onManualScan}
              disabled={isScanningNow}
              title="مسح دوري للعملات عبر الأطر السبعة الآن"
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <Cpu className={`w-3.5 h-3.5 text-emerald-400 ${isScanningNow ? 'animate-spin' : ''}`} />
              <span>مسح فوري</span>
            </button>

            {/* Stop Bot / Resume Bot Power Button */}
            <button
              onClick={() => setIsAutoScanning(prev => !prev)}
              title={isAutoScanning ? "توقيف البوت عن العمل مؤقتاً" : "تشغيل واستئناف عمل البوت"}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm transition ${
                isAutoScanning 
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 hover:bg-rose-500/25' 
                  : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
              }`}
            >
              {isAutoScanning ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>توقيف البوت</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                  <span>تشغيل البوت</span>
                </>
              )}
            </button>

            {/* Scenarios Button */}
            <button
              onClick={onOpenScenarios}
              className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>السيناريوهات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-reverse space-x-1 sm:space-x-2 overflow-x-auto border-t border-slate-800/60 pt-1 pb-0.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
