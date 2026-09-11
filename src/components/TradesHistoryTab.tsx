/**
 * Trades History Tab — سجل الصفقات المغلقة والدروس المستفادة
 * يوثق كل صفقة اكتملت مع سبب الخروج (TP, SL, Smart Exit) والدروس السلوكية المكتسبة
 */

import React, { useState, useMemo } from 'react';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  ShieldAlert, 
  Sparkles, 
  BookOpen, 
  Filter, 
  CheckCircle, 
  AlertCircle
} from 'lucide-react';
import { Trade } from '../types';

interface TradesHistoryTabProps {
  closedTrades: Trade[];
}

export const TradesHistoryTab: React.FC<TradesHistoryTabProps> = ({ closedTrades }) => {
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [selectedCoin, setSelectedCoin] = useState<string>('ALL');

  const uniqueClosedTrades = useMemo(() => {
    const seen = new Set<string>();
    return closedTrades.filter(t => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [closedTrades]);

  const filtered = useMemo(() => {
    return uniqueClosedTrades.filter(t => {
      if (filterReason !== 'ALL' && t.exitReason !== filterReason) return false;
      if (selectedCoin !== 'ALL' && t.coin !== selectedCoin) return false;
      return true;
    });
  }, [uniqueClosedTrades, filterReason, selectedCoin]);

  const totalClosed = uniqueClosedTrades.length;
  const wins = uniqueClosedTrades.filter(t => (t.realizedPnLUsd || 0) > 0);
  const losses = uniqueClosedTrades.filter(t => (t.realizedPnLUsd || 0) <= 0);
  const smartExits = uniqueClosedTrades.filter(t => t.exitReason === 'SMART_EXIT');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              سجل الصفقات المكتملة وقواعد التعلم المستمر (Trades History & Lessons)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              <strong>المرحلة السابعة من دورة الحياة: التعلم والتطور.</strong> بعد إغلاق كل صفقة، يعود البوت لتحديث سجل النمط وساعات التداول واستخراج قواعد سلوكية تزيد من دقته بمرور الوقت.
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-sans">الصفقات المغلقة</span>
            <span className="text-base font-bold text-white mt-0.5 block">{totalClosed} صفقة</span>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-lg">
            <span className="text-[10px] text-emerald-400 block font-sans">الصفقات الرابحة</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">
              {wins.length} ({totalClosed > 0 ? Math.round((wins.length / totalClosed) * 100) : 0}%)
            </span>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-lg">
            <span className="text-[10px] text-amber-300 block font-sans">إغلاق ذكي (Smart Exit)</span>
            <span className="text-base font-bold text-amber-300 mt-0.5 block">
              {smartExits.length} ({totalClosed > 0 ? Math.round((smartExits.length / totalClosed) * 100) : 0}%)
            </span>
          </div>
          <div className="bg-rose-950/20 border border-rose-500/30 p-3 rounded-lg">
            <span className="text-[10px] text-rose-400 block font-sans">وقف الخسارة (SL)</span>
            <span className="text-base font-bold text-rose-400 mt-0.5 block">
              {losses.length} ({totalClosed > 0 ? Math.round((losses.length / totalClosed) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setFilterReason('ALL')}
          className={`px-3 py-1.5 rounded-lg border transition ${
            filterReason === 'ALL' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          الكل ({totalClosed})
        </button>
        <button
          onClick={() => setFilterReason('SMART_EXIT')}
          className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
            filterReason === 'SMART_EXIT' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Smart Exit (حجز قمة)
        </button>
        <button
          onClick={() => setFilterReason('TAKE_PROFIT')}
          className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
            filterReason === 'TAKE_PROFIT' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          تحقيق الهدف (TP)
        </button>
        <button
          onClick={() => setFilterReason('STOP_LOSS')}
          className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
            filterReason === 'STOP_LOSS' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          وقف الخسارة (SL)
        </button>
      </div>

      {/* Trades List */}
      <div className="space-y-3 font-mono">
        {filtered.map((trade) => {
          const isWin = (trade.realizedPnLUsd || 0) > 0;
          const isSmart = trade.exitReason === 'SMART_EXIT';
          const isTp = trade.exitReason === 'TAKE_PROFIT';
          const isSl = trade.exitReason === 'STOP_LOSS';

          return (
            <div 
              key={trade.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm space-y-3 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                    {trade.coin.slice(0, 3)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{trade.coin}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        trade.direction === 'LONG' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {trade.direction}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {trade.timeframe}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {trade.patternTag}
                    </span>
                  </div>
                </div>

                {/* Realized Profit */}
                <div className="text-left">
                  <div className={`text-base font-bold flex items-center justify-end gap-1 ${
                    isWin ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isWin ? '+' : ''}${trade.realizedPnLUsd?.toFixed(2)}
                  </div>
                  <div className={`text-[11px] ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? '+' : ''}{trade.realizedPnLPct}%
                  </div>
                </div>
              </div>

              {/* Price Flow & Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">سعر الدخول</span>
                  <span className="text-slate-200 font-semibold">${trade.entryPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">سعر الخروج</span>
                  <span className="text-white font-semibold">${trade.exitPrice?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">المدة المستغرقة</span>
                  <span className="text-cyan-400 font-semibold">{trade.durationMinutes} دقيقة</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">سبب الخروج</span>
                  <span className={`font-semibold ${isSmart ? 'text-amber-400' : isTp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isSmart ? 'Smart Exit (قمة)' : isTp ? 'Take Profit' : 'Stop Loss'}
                  </span>
                </div>
              </div>

              {/* Learned Lesson Badge (المرحلة 7) */}
              {trade.learnedLesson && (
                <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg flex items-start gap-2 text-xs font-sans">
                  <BookOpen className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="text-indigo-200 leading-relaxed">
                    <strong className="text-indigo-400 ml-1">الدرس السلوكي المكتسب:</strong>
                    {trade.learnedLesson}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
