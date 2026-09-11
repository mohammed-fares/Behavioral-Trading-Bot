/**
 * Decision Log Tab — سجل القرارات والشفافية الكاملة
 * يوثق كل قرار اتخذه البوت مع الأسباب الرياضية وتفاصيل الفحص
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Filter, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Layers,
  HelpCircle,
  Sliders,
  Check,
  RefreshCw
} from 'lucide-react';
import { DecisionLog, DecisionStatus, PatternStats, SUPPORTED_COINS } from '../types';
import { EditRepetitionModal } from './EditRepetitionModal';

interface DecisionLogTabProps {
  decisions: DecisionLog[];
  patterns?: PatternStats[];
  minOccurrences?: number;
  onViewDecision: (decision: DecisionLog) => void;
  onOpenScenarios: () => void;
  onUpdatePatternRepetition?: (tag: string, coin: string, newOccurrences: number, newConfidence?: number) => void;
  onUpdateMinOccurrences?: (newMin: number) => void;
}

export const DecisionLogTab: React.FC<DecisionLogTabProps> = ({
  decisions,
  patterns = [],
  minOccurrences = 20,
  onViewDecision,
  onOpenScenarios,
  onUpdatePatternRepetition,
  onUpdateMinOccurrences,
}) => {
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | 'ALL'>('ALL');
  const [selectedCoin, setSelectedCoin] = useState<string>('ALL');
  const [showUniqueCoinsOnly, setShowUniqueCoinsOnly] = useState<boolean>(false);
  const [editingModal, setEditingModal] = useState<{
    isOpen: boolean;
    coin: string;
    patternTag: string;
    occurrences: number;
    confidence: number;
  } | null>(null);

  // Currency count in decisions
  const coinDecisionsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of SUPPORTED_COINS) {
      counts[c.symbol] = 0;
    }
    for (const d of decisions) {
      counts[d.coin] = (counts[d.coin] || 0) + 1;
    }
    return counts;
  }, [decisions]);

  // Deduplicate decisions by coin (keeps only the latest decision per coin)
  const uniqueCoinsList = useMemo(() => {
    const map = new Map<string, DecisionLog>();
    const sorted = [...decisions].sort((a, b) => b.timestamp - a.timestamp);
    for (const d of sorted) {
      if (!map.has(d.coin)) {
        map.set(d.coin, d);
      }
    }
    return Array.from(map.values());
  }, [decisions]);

  const displayedList = showUniqueCoinsOnly ? uniqueCoinsList : decisions;

  const filtered = useMemo(() => {
    return displayedList.filter(d => {
      if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
      if (selectedCoin !== 'ALL' && d.coin !== selectedCoin) return false;
      return true;
    });
  }, [displayedList, filterStatus, selectedCoin]);

  const total = decisions.length;
  const approvedCount = decisions.filter(d => d.status === 'APPROVED').length;
  const rejectedCount = decisions.filter(d => d.status === 'REJECTED').length;
  const waitCount = decisions.filter(d => d.status === 'WAIT').length;

  const handleOpenEditRepetition = (dec: DecisionLog, e: React.MouseEvent) => {
    e.stopPropagation();
    const pat = patterns.find(p => p.coin === dec.coin && p.tag === dec.patternTag);
    // Parse occurrences from review step if pattern not directly in memory
    let occ = pat?.occurrences || 20;
    const occStep = dec.reviewSteps.find(s => s.name.includes('تكرار') || s.name.includes('النمط'));
    if (occStep && occStep.metric && occStep.metric.includes('تكرار')) {
      const parsed = parseInt(occStep.metric);
      if (!isNaN(parsed) && parsed > 0) occ = parsed;
    }

    setEditingModal({
      isOpen: true,
      coin: dec.coin,
      patternTag: dec.patternTag,
      occurrences: occ,
      confidence: pat?.confidence || dec.initialConfidence || 65,
    });
  };

  const handleSaveRepetition = (coin: string, tag: string, newOccurrences: number, newConfidence: number) => {
    if (onUpdatePatternRepetition) {
      onUpdatePatternRepetition(tag, coin, newOccurrences, newConfidence);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Philosophy */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              سجل القرارات والشفافية الصارمة (Decision Transparency Log)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              <strong>المبدأ الخامس: الشفافية أساس الثقة.</strong> البوت لا يشتري لمجرد مؤشر لحظي، بل يشرح خطوة بخطوة: لماذا هذا النمط؟ كم تكرر؟ كم إطار يدعمه؟ وما سبب القبول أو الرفض أو الانتظار؟
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenScenarios}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
            >
              عرض أمثلة السيناريوهات (1-5)
            </button>
          </div>
        </div>

        {/* Realistic Distribution Strip (from prompt: Approved 15-25%, Wait 30-40%, Rejected 35-45%) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">إجمالي القرارات المفحوصة</span>
            <span className="text-base font-bold text-white mt-0.5 block">{total} قرار</span>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-lg">
            <span className="text-[10px] text-emerald-400 block font-sans">فتح صفقة (Approved)</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">
              {approvedCount} ({total > 0 ? Math.round((approvedCount / total) * 100) : 0}%)
            </span>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-lg">
            <span className="text-[10px] text-amber-300 block font-sans">انتظار ومراقبة (Wait)</span>
            <span className="text-base font-bold text-amber-300 mt-0.5 block">
              {waitCount} ({total > 0 ? Math.round((waitCount / total) * 100) : 0}%)
            </span>
          </div>
          <div className="bg-rose-950/20 border border-rose-500/30 p-3 rounded-lg">
            <span className="text-[10px] text-rose-400 block font-sans">رفض وقائي (Rejected)</span>
            <span className="text-base font-bold text-rose-400 mt-0.5 block">
              {rejectedCount} ({total > 0 ? Math.round((rejectedCount / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Anti-Repetition Toolbar */}
      <div className="space-y-3">
        {/* Row 1: Status Filters & Deduplication Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع القرارات ({displayedList.length})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                filterStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              فتح صفقة ({approvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('WAIT')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                filterStatus === 'WAIT' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              انتظار ومراقبة ({waitCount})
            </button>
            <button
              onClick={() => setFilterStatus('REJECTED')}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                filterStatus === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              مرفوض وقائياً ({rejectedCount})
            </button>
          </div>

          {/* Anti-Repetition Toggle */}
          <button
            onClick={() => setShowUniqueCoinsOnly(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition shadow-sm ${
              showUniqueCoinsOnly
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 ring-1 ring-cyan-500/30 font-bold'
                : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${showUniqueCoinsOnly ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span>
              {showUniqueCoinsOnly ? '✓ أحدث قرار لكل عملة (تم منع التكرار)' : 'منع تكرار العملات (أحدث قرار لكل عملة)'}
            </span>
          </button>
        </div>

        {/* Row 2: Currency Filter Chips (All 8 supported pairs) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 ml-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-sans font-medium">فلترة بالعملة:</span>
          </div>

          <button
            onClick={() => setSelectedCoin('ALL')}
            className={`px-2.5 py-1 rounded-md font-mono transition ${
              selectedCoin === 'ALL'
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            جميع العملات ({total})
          </button>

          {SUPPORTED_COINS.map(c => {
            const count = coinDecisionsCount[c.symbol] || 0;
            const isSelected = selectedCoin === c.symbol;
            return (
              <button
                key={c.symbol}
                onClick={() => setSelectedCoin(c.symbol)}
                className={`px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5 transition ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span>{c.symbol.replace('USDT', '')}</span>
                <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deduplication active notice */}
      {showUniqueCoinsOnly && (
        <div className="bg-cyan-950/20 border border-cyan-500/30 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              تم تفعيل إلغاء التكرار: يظهر حالياً أحدث قرار فحص لـ <strong>{filtered.length} عملات فريدة</strong> بدون تكرار نفس العملة.
            </span>
          </div>
          <button
            onClick={() => setShowUniqueCoinsOnly(false)}
            className="text-[11px] underline text-cyan-400 hover:text-cyan-200"
          >
            إظهار كافة السجلات ({total})
          </button>
        </div>
      )}

      {/* Decision Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs">
            لا توجد قرارات مطابقة لمعايير الفلترة الحالية
          </div>
        ) : (
          filtered.map((dec) => {
            const isApproved = dec.status === 'APPROVED';
            const isRejected = dec.status === 'REJECTED';
            const isWait = dec.status === 'WAIT';

            // Find matching pattern in memory to get its recorded occurrences
            const pat = patterns.find(p => p.coin === dec.coin && p.tag === dec.patternTag);
            const occ = pat?.occurrences || 20;
            const isOccLow = occ < minOccurrences;

            return (
              <div
                key={dec.id}
                onClick={() => onViewDecision(dec)}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm transition cursor-pointer space-y-3"
              >
                {/* Card Top Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm font-mono border ${
                      isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      isRejected ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}>
                      {dec.coin.slice(0, 3)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">{dec.coin}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                          dec.direction === 'UP' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {dec.direction === 'UP' ? 'LONG (صعود)' : 'SHORT (هبوط)'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          الإطار: {dec.baseTimeframe}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        {new Date(dec.timestamp).toLocaleTimeString()} UTC
                      </span>
                    </div>
                  </div>

                  {/* Status & Edit Repetition Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenEditRepetition(dec, e)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700 text-[11px] font-sans font-medium flex items-center gap-1.5 transition"
                      title="تعديل تكرار هذا النمط للعملة في الذاكرة"
                    >
                      <Sliders className="w-3 h-3 text-cyan-400" />
                      <span>تعديل التكرار ({occ})</span>
                    </button>

                    <div className="text-left font-mono hidden sm:block">
                      <span className="text-[10px] text-slate-400 block">الثقة النهائية</span>
                      <span className={`text-sm font-bold ${dec.finalConfidence >= 65 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {dec.finalConfidence}%
                      </span>
                    </div>

                    <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      isRejected ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                       isRejected ? <XCircle className="w-3.5 h-3.5" /> :
                       <Clock className="w-3.5 h-3.5" />}
                      {isApproved ? 'قرار فتح صفقة ✓' : isRejected ? 'قرار رفض الصفقة ✗' : 'قرار انتظار ومراقبة ⏸'}
                    </span>
                  </div>
                </div>

                {/* Pattern signature, Repetition Stats & Alignment */}
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">بصمة النمط:</span>
                      <span className="text-emerald-400 font-bold">{dec.patternTag}</span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-sans ${
                      isOccLow 
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' 
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {occ} تكرار {isOccLow ? `(< ${minOccurrences} مطلوب)` : '✓'}
                    </span>
                  </div>

                  <div className="text-slate-400 flex items-center gap-3 text-[11px]">
                    <span>توافق: <strong className="text-white">{dec.supportingCount}/7</strong> أطر</span>
                    <span>•</span>
                    <span>معارضة: <strong className={dec.opposingCount > 2 ? 'text-rose-400' : 'text-slate-300'}>{dec.opposingCount}</strong> أطر</span>
                  </div>
                </div>

                {/* Bullet list of main reason */}
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span className="font-semibold text-slate-200">{dec.reasons[0]}</span>
                  </div>
                  {dec.reasons[1] && (
                    <div className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                      <span className="text-slate-500">•</span>
                      <span>{dec.reasons[1]}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: View Details CTA */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    معرّف القرار: {dec.id.slice(0, 16)}...
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDecision(dec);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض التدقيق الرياضي الكامل</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Repetition Modal from Decision Log */}
      {editingModal && (
        <EditRepetitionModal
          isOpen={editingModal.isOpen}
          onClose={() => setEditingModal(null)}
          coin={editingModal.coin}
          patternTag={editingModal.patternTag}
          currentOccurrences={editingModal.occurrences}
          currentConfidence={editingModal.confidence}
          minOccurrences={minOccurrences}
          onSave={handleSaveRepetition}
          onUpdateMinOccurrences={onUpdateMinOccurrences}
        />
      )}
    </div>
  );
};
