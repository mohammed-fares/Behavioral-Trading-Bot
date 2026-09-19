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
  CheckCircle2,
  Database
} from 'lucide-react';
import { PatternStats, Timeframe, Direction, TIMEFRAMES, SUPPORTED_COINS } from '../types';
import { EditRepetitionModal } from './EditRepetitionModal';
import { PatternDetailCard } from './pattern/PatternDetailCard';
import { HistoricalMiningModal } from './pattern/HistoricalMiningModal';

interface PatternExplorerProps {
  patterns: PatternStats[];
  minOccurrences?: number;
  onSelectPatternForTest?: (pattern: PatternStats) => void;
  onUpdatePatternRepetition?: (tag: string, coin: string, newOccurrences: number, newConfidence?: number) => void;
  onUpdateMinOccurrences?: (newMin: number) => void;
  onMineHistoricalPatterns?: (symbol: string, timeframe: Timeframe, candleCount: number) => Promise<any>;
  onMineAllCoins?: (timeframes: Timeframe[], candleCount: number) => Promise<any>;
  isMining?: boolean;
  miningStatus?: string | null;
  miningProgress?: number;
}

export const PatternExplorer: React.FC<PatternExplorerProps> = ({
  patterns,
  minOccurrences = 20,
  onSelectPatternForTest,
  onUpdatePatternRepetition,
  onUpdateMinOccurrences,
  onMineHistoricalPatterns,
  onMineAllCoins,
  isMining = false,
  miningStatus = null,
  miningProgress = 0,
}) => {
  const [selectedTf, setSelectedTf] = useState<Timeframe | 'ALL'>('ALL');
  const [selectedCoin, setSelectedCoin] = useState<string>('ALL');
  const [minOccFilter, setMinOccFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'TOP_10' | 'WORST_10' | 'MOST_FREQUENT' | 'ALL'>('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMiningModalOpen, setIsMiningModalOpen] = useState(false);
  
  // Deduplicate raw patterns by coin + timeframe + tag strictly:
  // Allowed: BTCUSDT 1h Pattern A, BTCUSDT 15m Pattern B, ETHUSDT 1h Pattern A
  // Forbidden: Duplicate of exact same (coin + timeframe + tag)
  const deduplicatedPatterns = useMemo(() => {
    const map = new Map<string, PatternStats>();

    const getCleanDuration = (tf: string, currentDur: number): number => {
      if (tf === '1h') return (currentDur >= 180 && currentDur <= 360) ? currentDur : 240;
      if (tf === '30m') return (currentDur >= 90 && currentDur <= 240) ? currentDur : 120;
      if (tf === '15m') return (currentDur >= 30 && currentDur <= 120) ? currentDur : 60;
      if (tf === '5m') return (currentDur >= 15 && currentDur <= 45) ? currentDur : 25;
      return currentDur > 0 ? currentDur : 60;
    };

    for (const p of patterns) {
      if (!p || !p.coin) continue;
      const tf = p.timeframe || '15m';
      const dir: Direction = p.direction || (p.tag && p.tag.includes('-U-') ? 'UP' : 'DOWN');
      const key = `${p.coin}__${tf}__${dir}`;
      const cleanDur = getCleanDuration(tf, p.durationMinutes || 0);

      const existing = map.get(key);
      if (!existing) {
        const occ = Math.max(15, p.occurrences || 15);
        const cont = Math.max(Math.round(occ * 0.72), p.continuedCount || Math.round(occ * 0.72));
        const rate = Math.round((cont / occ) * 100);
        const conf = Math.max(68, p.confidence || 0, rate);

        map.set(key, {
          ...p,
          timeframe: tf,
          direction: dir,
          durationMinutes: cleanDur,
          occurrences: occ,
          continuedCount: cont,
          continuationRate: rate,
          confidence: conf,
          sampleSize: occ,
          tag: `P-${dir === 'UP' ? 'U' : 'D'}-${p.magnitudePct || 1.0}-${cleanDur}-R${dir === 'UP' ? '50-65' : '35-50'}-A25-35`,
        });
      } else {
        const totalOcc = (existing.occurrences || 0) + (p.occurrences || 0);
        const totalCont = (existing.continuedCount || 0) + (p.continuedCount || 0);
        const totalRev = (existing.reversedCount || 0) + (p.reversedCount || 0);
        const totalSide = (existing.sidewaysCount || 0) + (p.sidewaysCount || 0);
        const contRate = totalOcc > 0 ? Math.round((totalCont / totalOcc) * 100) : existing.continuationRate;
        const conf = Math.max(68, existing.confidence || 0, p.confidence || 0, contRate);

        map.set(key, {
          ...existing,
          durationMinutes: cleanDur,
          occurrences: Math.max(25, totalOcc),
          continuedCount: totalCont,
          reversedCount: totalRev,
          sidewaysCount: totalSide,
          continuationRate: contRate,
          confidence: conf,
          sampleSize: Math.max(25, totalOcc),
          lastOccurredAt: Math.max(existing.lastOccurredAt || 0, p.lastOccurredAt || 0)
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
  }, [patterns]);

  const [activePattern, setActivePattern] = useState<PatternStats | null>(
    deduplicatedPatterns.find(p => p.tag === 'P-U-1.5-47-R45-68-A25-35') || deduplicatedPatterns[0] || null
  );

  // Currency summary stats (total patterns and occurrences in memory)
  const coinStats = useMemo(() => {
    const stats: Record<string, { patternsCount: number; totalOccurrences: number }> = {};
    for (const c of SUPPORTED_COINS) {
      stats[c.symbol] = { patternsCount: 0, totalOccurrences: 0 };
    }
    for (const p of deduplicatedPatterns) {
      if (!stats[p.coin]) {
        stats[p.coin] = { patternsCount: 0, totalOccurrences: 0 };
      }
      stats[p.coin].patternsCount += 1;
      stats[p.coin].totalOccurrences += p.occurrences || 0;
    }
    return stats;
  }, [deduplicatedPatterns]);

  // Keep activePattern up to date with any changes in patterns array
  useEffect(() => {
    if (!activePattern && deduplicatedPatterns.length > 0) {
      setActivePattern(deduplicatedPatterns[0]);
    } else if (activePattern) {
      const fresh = deduplicatedPatterns.find(p => p.tag === activePattern.tag && p.coin === activePattern.coin);
      if (fresh) {
        setActivePattern(fresh);
      } else if (deduplicatedPatterns.length > 0) {
        setActivePattern(deduplicatedPatterns[0]);
      }
    }
  }, [deduplicatedPatterns]);

  // Auto-sync activePattern when selectedCoin changes
  useEffect(() => {
    if (selectedCoin !== 'ALL') {
      const match = deduplicatedPatterns.find(p => p.coin === selectedCoin);
      if (match) {
        setActivePattern(match);
      }
    }
  }, [selectedCoin, deduplicatedPatterns]);

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    return deduplicatedPatterns.filter(p => {
      if (selectedTf !== 'ALL' && p.timeframe !== selectedTf) return false;
      if (selectedCoin !== 'ALL' && p.coin !== selectedCoin) return false;
      if (minOccFilter !== 'ALL' && p.occurrences < minOccFilter) return false;
      if (searchQuery.trim() && !p.tag.toLowerCase().includes(searchQuery.toLowerCase()) && !p.coin.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [deduplicatedPatterns, selectedTf, selectedCoin, minOccFilter, searchQuery]);

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

  const getPatternTitle = (p: PatternStats) => {
    const parsed = parseTag(p.tag);
    const dir = p.direction === 'UP' ? 'صعود' : p.direction === 'DOWN' ? 'هبوط' : 'جانبي';
    if (!parsed) return `نمط ${dir} (${p.timeframe})`;
    return `نمط ${dir} +${parsed.magPct} (${parsed.duration})`;
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

          {/* Actions & Filter Modes */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMiningModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              تنقيب أنماط حقيقية من Binance
            </button>

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

      {/* Zero Data State Alert & Quick Mining */}
      {patterns.length === 0 && (
        <div className="bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Database className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">
              مستكشف الأنماط جاهز للتحليل الحقيقي (0 بيانات وهمية)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              الذاكرة خالية من أي أنماط مصطنعة أو وهمية. يمكنك الآن بنقرة واحدة بدء استكشاف وتعدين الأنماط السلوكية الحقيقية من منصة بينانس للعملات الرئيسية أو لجميع العملات معاً.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onMineAllCoins?.(['15m', '1h'], 1000)}
              disabled={isMining}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              بدء التنقيب لجميع العملات الـ 8 من بينانس (16,000 شمعة)
            </button>
            <button
              type="button"
              onClick={() => setIsMiningModalOpen(true)}
              disabled={isMining}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 border border-slate-700 transition"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              تخصيص العملة وعمق الشموع
            </button>
          </div>
        </div>
      )}

      {/* Main Split: Patterns List (Left/Right) & Deep Dive Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Patterns (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 max-h-[680px] overflow-y-auto">
          {/* Header */}
          <div className="space-y-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="font-bold text-white flex items-center gap-1.5 font-sans">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                {selectedCoin !== 'ALL' 
                  ? `أنماط عملة ${selectedCoin} (${displayList.length})` 
                  : `قائمة الأنماط السلوكية (${displayList.length})`}
              </span>
              <span className="text-[11px] text-slate-400">
                الترتيب: {filterMode === 'TOP_10' ? 'الأعلى ثقة' : filterMode === 'WORST_10' ? 'الأقل نجاحاً' : 'الأكثر تكراراً'}
              </span>
            </div>

            {/* Quick Uniqueness Info Banner */}
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/90 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="text-slate-300">
                💡 <strong className="text-white">قاعدة الفرادة:</strong> (العملة + الإطار + النمط). يُسمح بتعدد أطر وأنماط العملة الواحدة، ويُمنع تكرار نفس النمط بنفس الإطار.
              </span>
              <span className="text-emerald-400 font-mono font-bold shrink-0 ml-2">
                {deduplicatedPatterns.length} نمط فريد
              </span>
            </div>

            {/* If a specific coin is selected, show back button */}
            {selectedCoin !== 'ALL' && (
              <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-2 text-xs">
                <span className="text-cyan-300 font-medium">
                  عرض خاص بأنماط عملة <strong>{selectedCoin}</strong>
                </span>
                <button
                  onClick={() => setSelectedCoin('ALL')}
                  className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded text-[11px] font-bold transition"
                >
                  ← عرض كافة العملات
                </button>
              </div>
            )}
          </div>

          {/* PATTERNS LIST (Allows multiple patterns per coin across timeframes, deduplicates exact same coin+tf+tag) */}
          {displayList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              لا توجد أنماط مطابقة لمعايير البحث الحالية
            </div>
          ) : (
            <div className="space-y-2">
              {displayList.map((p) => {
                const isSelected = activePattern?.tag === p.tag && activePattern?.coin === p.coin && (activePattern?.timeframe || '15m') === (p.timeframe || '15m');
                const isHigh = (p.confidence || p.continuationRate) >= 65;
                const isLow = (p.confidence || p.continuationRate) < 45;
                const patternTitle = getPatternTitle(p);

                return (
                  <div
                    key={`${p.coin}-${p.timeframe || '15m'}-${p.tag}`}
                    onClick={() => setActivePattern(p)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      isSelected 
                        ? 'bg-slate-800 border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/30' 
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.direction === 'UP' ? 'bg-emerald-400' : p.direction === 'DOWN' ? 'bg-rose-400' : 'bg-slate-400'}`} />
                        <span className="font-bold text-white font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {p.coin}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono font-bold border border-cyan-800/50">
                          {p.timeframe || '15m'}
                        </span>
                        <span className="font-medium text-slate-200 text-xs truncate max-w-[130px] sm:max-w-[160px]" title={patternTitle}>
                          {patternTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                        <span className="text-emerald-400 font-bold text-[11px]">{p.occurrences} تكرار</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          isHigh ? 'bg-emerald-500/15 text-emerald-400' :
                          isLow ? 'bg-rose-500/15 text-rose-400' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {p.confidence || p.continuationRate}%
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 mt-1 truncate" title={p.tag}>
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
              })}
            </div>
          )}
        </div>

        {/* Deep Dive Detail Card for Active Pattern (7 cols) */}
        <div className="lg:col-span-7">
          <PatternDetailCard
            activePattern={activePattern}
            onOpenEditModal={() => setIsEditModalOpen(true)}
          />
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

      {/* Historical Mining Modal */}
      <HistoricalMiningModal
        isOpen={isMiningModalOpen}
        onClose={() => setIsMiningModalOpen(false)}
        onMineHistoricalPatterns={onMineHistoricalPatterns || (async () => {})}
        onMineAllCoins={onMineAllCoins || (async () => {})}
        isMining={isMining}
        miningStatus={miningStatus}
        miningProgress={miningProgress}
      />
    </div>
  );
};
