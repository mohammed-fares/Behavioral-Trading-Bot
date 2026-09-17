import React from 'react';
import { Sparkles } from 'lucide-react';

export interface CalculatedParameters {
  positionPct: number;
  lev: number;
  minConf: number;
  minFrames: number;
  dailyLossPct: number;
  maxConcurrent: number;
  marginPerTrade: number;
  sizeUsdPerTrade: number;
  dailyRiskStopUsd: number;
  tpPct: number;
  slPct: number;
}

interface WizardCalculatedPreviewProps {
  capital: number;
  calculated: CalculatedParameters;
}

export const WizardCalculatedPreview: React.FC<WizardCalculatedPreviewProps> = ({
  capital,
  calculated,
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
      <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between font-sans">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          النتائج التلقائية المحسوبة لرأس مال ${capital.toLocaleString()}:
        </span>
        <span className="text-[10px] text-emerald-400 font-mono">حساب رياضي دقيق</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400">هامش الصفقة الواحدة</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            ${calculated.marginPerTrade} ({calculated.positionPct}%)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400">حجم العقد بالرافعة</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">
            ${calculated.sizeUsdPerTrade} ({calculated.lev}x)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400">أقصى حد خسارة يومي</div>
          <div className="text-sm font-bold text-rose-400 mt-0.5">
            -${calculated.dailyRiskStopUsd} ({calculated.dailyLossPct}%)
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-400">الصفقات المتزامنة</div>
          <div className="text-sm font-bold text-amber-400 mt-0.5">
            {calculated.maxConcurrent} صفقات كحد أقصى
          </div>
        </div>
      </div>
    </div>
  );
};
