/**
 * Decision Detail Modal — نافذة مراجعة القرار الشاملة
 * تعرض الشفافية الكاملة لقرار البوت خطوة بخطوة متطابقة مع سيناريوهات المستخدم
 */

import React from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { DecisionLog } from '../types';

interface DecisionDetailModalProps {
  decision: DecisionLog | null;
  onClose: () => void;
}

export const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({
  decision,
  onClose,
}) => {
  if (!decision) return null;

  const isApproved = decision.status === 'APPROVED';
  const isRejected = decision.status === 'REJECTED';
  const isWait = decision.status === 'WAIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg ${
              isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              isRejected ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isApproved ? '✓' : isRejected ? '✗' : '⏸'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  مراجعة شاملة لقرار {decision.coin} {decision.direction}
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  isApproved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  isRejected ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                  'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}>
                  {isApproved ? 'تم فتح الصفقة' : isRejected ? 'رفض الصفقة' : 'انتظار ومراقبة'}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>الإطار: {decision.baseTimeframe}</span>
                <span>•</span>
                <span>{new Date(decision.timestamp).toUTCString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">الثقة الأولية</span>
              <span className="text-sm font-bold text-white mt-0.5 block">{decision.initialConfidence}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">توافق الأطر الداعمة</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                {decision.supportingCount}/7 أطر
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">الثقة النهائية المعدلة</span>
              <span className={`text-sm font-bold mt-0.5 block ${decision.finalConfidence >= 65 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {decision.finalConfidence}%
              </span>
            </div>
          </div>

          {/* Pattern Tag */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1 font-sans">بصمة النمط المكتشفة:</span>
            <div className="text-emerald-400 font-bold text-sm select-all">
              {decision.patternTag}
            </div>
          </div>

          {/* Review Checklist (5 Steps) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 font-sans flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              سجل تدقيق الشروط الخمسة (Strict 5-Step Evaluation)
            </h4>

            <div className="space-y-2">
              {decision.reviewSteps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    step.passed 
                      ? 'bg-emerald-950/15 border-emerald-500/20' 
                      : 'bg-rose-950/15 border-rose-500/20'
                  }`}
                >
                  <div className="mt-0.5">
                    {step.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-sans text-xs">{step.name}</span>
                      <span className={`text-[10px] font-bold ${step.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {step.passed ? 'ناجح ✓' : 'فاشل ✗'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {step.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reasons List */}
          <div className="space-y-1.5 font-sans">
            <h4 className="text-xs font-bold text-slate-300">الأسباب والمبررات الصريحة للقرار:</h4>
            <ul className="space-y-1 text-slate-300 text-xs">
              {decision.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Proposed Trade Execution Formula (if approved or wait) */}
          {decision.proposedTrade && (
            <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-xl space-y-3 font-mono">
              <div className="flex items-center justify-between font-sans">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  معايير التنفيذ المحسوبة تلقائياً:
                </span>
                <span className="text-[11px] text-emerald-400 font-bold">10x Leverage</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">حجم المركز</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">${decision.proposedTrade.sizeUsd}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">الهدف (TP)</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">+{decision.proposedTrade.targetPct}%</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">وقف الخسارة (SL)</span>
                  <span className="text-sm font-bold text-rose-400 mt-0.5 block">-{decision.proposedTrade.stopLossPct}%</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">المدة المتوقعة</span>
                  <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{decision.proposedTrade.expectedDurationMins} دقيقة</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-sans">
            القرار موثق ومخزن في سجل الشفافية الدائم
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white rounded-lg transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
