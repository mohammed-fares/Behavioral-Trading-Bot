/**
 * Pattern Explorer — مستكشف الأنماط والذاكرة التاريخية
 * يعرض أفضل وأسوأ الأنماط لكل إطار، تفاصيل بصمة النمط (Pattern Tag)، ونسب الاستمرار والانعكاس
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  Filter, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Clock, 
  Percent, 
  TrendingUp, 
  Layers, 
  Calendar, 
  Sparkles,
  Award,
  AlertOctagon,
  ChevronDown,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { PatternStats, Timeframe, TIMEFRAMES, SUPPORTED_COINS } from '../types';
import { EditRepetitionModal } from './EditRepetitionModal';

interface PatternExplorerProps {
  patterns: PatternStats[];
  minOccurrences?: number;
  onSelectPatternForTest?: (pattern: PatternStats) => void;
  onUpdatePatternRepetition?: (tag: string, coin: string, newOccurrences: number, newConfidence?: number) => void;
  onUpdateMinOccurrences?: (newMin: number) => void;
}

export const PatternExplorer: React.FC<PatternExplorerProps> = ({
  patterns,
  minOccurrences = 20,
  onSelectPatternForTest,
  onUpdatePatternRepetition,
  onUpdateMinOccurrences,
}) => {
  const [selectedTf, setSelectedTf] = useState<Timeframe | 'ALL'>('15m');
  const [selectedCoin, setSelectedCoin] = useState<string>('ALL');
  const [minOccFilter, setMinOccFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'TOP_10' | 'WORST_10' | 'MOST_FREQUENT' | 'ALL'>('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [activePattern, setActivePattern] = useState<PatternStats | null>(
    patterns.find(p => p.tag === 'P-U-1.5-47-R45-68-A25-35') || patterns[0] || null
  );

  // Currency summary stats (total patterns and occurrences in memory)
  const coinStats = useMemo(() => {
    const stats: Record<string, { patternsCount: number; totalOccurrences: number }> = {};
    for (const c of SUPPORTED_COINS) {
      stats[c.symbol] = { patternsCount: 0, totalOccurrences: 0 };
    }
    for (const p of patterns) {
      if (!stats[p.coin]) {
        stats[p.coin] = { patternsCount: 0, totalOccurrences: 0 };
      }
      stats[p.coin].patternsCount += 1;
      stats[p.coin].totalOccurrences += p.occurrences || 0;
    }
    return stats;
  }, [patterns]);

  // Keep activePattern up to date with any changes in patterns array
  useEffect(() => {
    if (activePattern) {
      const fresh = patterns.find(p => p.tag === activePattern.tag && p.coin === activePattern.coin);
      if (fresh) setActivePattern(fresh);
    }
  }, [patterns]);

  // Auto-sync activePattern when selectedCoin changes
  useEffect(() => {
    if (selectedCoin !== 'ALL') {
      const match = patterns.find(p => p.coin === selectedCoin);
      if (match) {
        setActivePattern(match);
      }
    }
  }, [selectedCoin, patterns]);

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    return patterns.filter(p => {
      if (selectedTf !== 'ALL' && p.timeframe !== selectedTf) return false;
      if (selectedCoin !== 'ALL' && p.coin !== selectedCoin) return false;
      if (minOccFilter !== 'ALL' && p.occurrences < minOccFilter) return false;
      if (searchQuery.trim() && !p.tag.toLowerCase().includes(searchQuery.toLowerCase()) && !p.coin.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [patterns, selectedTf, selectedCoin, minOccFilter, searchQuery]);

  // Sort based on mode
  const sortedPatterns = useMemo(() => {
    return [...filteredPatterns].sort((a, b) => {
      if (filterMode === 'TOP_10') {
        return (b.confidence || b.continuationRate) - (a.confidence || a.continuationRate);
      }
      if (filterMode === 'WORST_10') {
        return (a.confidence || a.continuationRate) - (b.confidence || b.continuationRate);
      }
      if (filterMode === 'MOST_FREQUENT') {
        return b.occurrences - a.occurrences;
      }
      return b.occurrences - a.occurrences;
    });
  }, [filteredPatterns, filterMode]);

  const displayList = filterMode === 'TOP_10' || filterMode === 'WORST_10' 
    ? sortedPatterns.slice(0, 10) 
    : sortedPatterns.slice(0, 60);

  // Pattern Tag parser for display
  const parseTag = (tag: string) => {
    const parts = tag.split('-');
    if (parts.length < 5) return null;
    return {
      direction: parts[1] === 'U' ? 'صعود (UP)' : parts[1] === 'D' ? 'هبوط (DOWN)' : 'جانبي',
      magPct: parts[2] + '%',
      duration: parts[3] + ' دقيقة',
      rsiRange: parts[4] || 'R45-68',
      adxRange: parts[5] || 'A25-35',
    };
  };

  const handleSaveRepetition = (coin: string, tag: string, newOccurrences: number, newConfidence: number) => {
    if (onUpdatePatternRepetition) {
      onUpdatePatternRepetition(tag, coin, newOccurrences, newConfidence);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              مستكشف الأنماط وتكرار العملات (Pattern & Currency Repetition Explorer)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              استكشف أكثر من {patterns.length} نمط مسجل في الذاكرة السلوكية مع إمكانية تعديل التكرار ونسب الاستمرار
            </p>
          </div>

          {/* Filter Modes */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterMode === 'ALL' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع الأنماط
            </button>
            <button
              onClick={() => setFilterMode('TOP_10')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 ${
                filterMode === 'TOP_10' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              أفضل 10
            </button>
            <button
              onClick={() => setFilterMode('WORST_10')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 ${
                filterMode === 'WORST_10' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              أسوأ 10
            </button>
            <button
              onClick={() => setFilterMode('MOST_FREQUENT')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterMode === 'MOST_FREQUENT' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              الأكثر تكراراً
            </button>
          </div>
        </div>

        {/* Currency Repetitions Bar (8 Pairs Overview) */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-sans font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              إجمالي تكرار العملات المسجلة في الذاكرة (انقر للفلترة والتعديل):
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              الحد الأدنى المطلوب للتداول: <strong className="text-cyan-400">{minOccurrences} تكرار</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {SUPPORTED_COINS.map(c => {
              const stat = coinStats[c.symbol] || { patternsCount: 0, totalOccurrences: 0 };
              const isSelected = selectedCoin === c.symbol;
              return (
                <button
                  key={c.symbol}
                  onClick={() => setSelectedCoin(isSelected ? 'ALL' : c.symbol)}
                  className={`p-2 rounded-lg border text-right transition ${
                    isSelected 
                      ? 'bg-cyan-950/40 border-cyan-500/50 ring-1 ring-cyan-500/30' 
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-xs">{c.symbol.replace('USDT', '')}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{stat.patternsCount} نمط</span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 mt-1 font-bold">
                    {stat.totalOccurrences} تكرار
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdowns & Search inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60">
          {/* Timeframe selector */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">الإطار:</span>
            <select
              value={selectedTf}
              onChange={(e) => setSelectedTf(e.target.value as any)}
              className="bg-transparent text-white focus:outline-none flex-1 font-mono cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">كل الأطر (7 Timeframes)</option>
              {TIMEFRAMES.map(tf => (
                <option key={tf.id} value={tf.id} className="bg-slate-900">
                  {tf.label} — {tf.duration} ({tf.usage})
                </option>
              ))}
            </select>
          </div>

          {/* Coin selector */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">العملة:</span>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="bg-transparent text-white focus:outline-none flex-1 font-mono cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">جميع العملات (8 Pairs)</option>
              {SUPPORTED_COINS.map(c => (
                <option key={c.symbol} value={c.symbol} className="bg-slate-900">
                  {c.symbol} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Min Occurrences Filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">شرط التكرار:</span>
            <select
              value={minOccFilter}
              onChange={(e) => setMinOccFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-transparent text-white focus:outline-none flex-1 font-mono cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">كافة التكرارات</option>
              <option value="10" className="bg-slate-900">تكرار ≥ 10 مرات</option>
              <option value="20" className="bg-slate-900">تكرار ≥ 20 (المعتمد)</option>
              <option value="35" className="bg-slate-900">تكرار ≥ 35 (عالي التكرار)</option>
            </select>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن نمط أو عملة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white focus:outline-none flex-1 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Split: Patterns List (Left/Right) & Deep Dive Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Patterns (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2 max-h-[640px] overflow-y-auto">
          <div className="text-xs text-slate-400 font-mono mb-2 flex items-center justify-between">
            <span>الأنماط المطابقة ({displayList.length})</span>
            <span>الترتيب: {filterMode === 'TOP_10' ? 'الأعلى ثقة' : filterMode === 'WORST_10' ? 'الأقل نجاحاً' : 'الأكثر تكراراً'}</span>
          </div>

          {displayList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              لا توجد أنماط مطابقة لمعايير البحث الحالية
            </div>
          ) : (
            displayList.map((p) => {
              const isSelected = activePattern?.tag === p.tag;
              const isHigh = (p.confidence || p.continuationRate) >= 65;
              const isLow = (p.confidence || p.continuationRate) < 45;

              return (
                <div
                  key={`${p.coin}-${p.timeframe}-${p.tag}`}
                  onClick={() => setActivePattern(p)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    isSelected 
                      ? 'bg-slate-800 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30' 
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p.direction === 'UP' ? 'bg-emerald-400' : p.direction === 'DOWN' ? 'bg-rose-400' : 'bg-slate-400'}`} />
                      <span className="font-bold text-white font-mono text-xs">{p.coin}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {p.timeframe}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400 text-[11px]">{p.occurrences} تكرار</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        isHigh ? 'bg-emerald-500/15 text-emerald-400' :
                        isLow ? 'bg-rose-500/15 text-rose-400' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {p.confidence || p.continuationRate}%
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-300 mt-1 truncate">
                    {p.tag}
                  </div>

                  {/* Progress Bar of Continuation vs Reversal */}
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 flex overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${p.continuationRate}%` }} 
                      title={`استمر: ${p.continuationRate}%`}
                    />
                    <div 
                      className="bg-rose-500 h-full" 
                      style={{ width: `${p.reversalRate}%` }} 
                      title={`انعكس: ${p.reversalRate}%`}
                    />
                    <div 
                      className="bg-slate-600 h-full" 
                      style={{ width: `${p.sidewaysRate}%` }} 
                      title={`جانبي: ${p.sidewaysRate}%`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Deep Dive Detail Card for Active Pattern (7 cols) */}
        <div className="lg:col-span-7">
          {activePattern ? (
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
                    onClick={() => setIsEditModalOpen(true)}
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
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-10 text-center text-slate-400 text-xs">
              حدد نمطاً من القائمة الجانبية لعرض تشريح البصمة والإحصائيات
            </div>
          )}
        </div>
      </div>

      {/* Edit Repetition Modal */}
      {activePattern && (
        <EditRepetitionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          coin={activePattern.coin}
          patternTag={activePattern.tag}
          currentOccurrences={activePattern.occurrences}
          currentConfidence={activePattern.confidence || activePattern.continuationRate}
          minOccurrences={minOccurrences}
          onSave={handleSaveRepetition}
          onUpdateMinOccurrences={onUpdateMinOccurrences}
        />
      )}
    </div>
  );
};
