import React from 'react';
import { Activity, Clock, Play } from 'lucide-react';
import { Trade } from '../../types';

interface ActiveTradesSectionProps {
  uniqueActiveTrades: Trade[];
  activeTradesCount: number;
  onCloseTrade: (tradeId: string, reason: string) => void;
  onManualScan?: () => void;
}

export const ActiveTradesSection: React.FC<ActiveTradesSectionProps> = ({
  uniqueActiveTrades,
  activeTradesCount,
  onCloseTrade,
  onManualScan,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          الصفقات النشطة قيد الإدارة الذكية ({activeTradesCount})
        </h2>
        {activeTradesCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            Smart Exit مراقبة نشطة
          </span>
        )}
      </div>

      {uniqueActiveTrades.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">لا توجد صفقات نشطة حالياً</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            البوت يمسح الأطر السبعة باستمرار، ولن يفتح صفقة إلا عند تحقق شروط التوافق الصارمة (≥ 4-5 أطر داعمة وثقة ≥ 65%).
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {onManualScan && (
              <button
                onClick={onManualScan}
                className="text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                مسح الأطر السبعة واكتشاف الفرص الآن
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {uniqueActiveTrades.map((trade) => {
            const isProfit = trade.currentPnLUsd >= 0;
            return (
              <div 
                key={trade.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition space-y-4"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-sm font-mono border border-slate-700">
                      {trade.coin.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{trade.coin}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          trade.direction === 'LONG' 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {trade.direction}
                        </span>
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {trade.timeframe}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <span>النمط:</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{trade.patternTag}</span>
                      </div>
                    </div>
                  </div>

                  {/* Current PnL Badge */}
                  <div className="text-left font-mono">
                    <div className={`text-lg font-bold flex items-center justify-end gap-1 ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isProfit ? '+' : ''}${trade.currentPnLUsd.toFixed(2)}
                    </div>
                    <div className={`text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}{trade.currentPnLPct}%
                    </div>
                  </div>
                </div>

                {/* Price & Target Bar */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">سعر الدخول</span>
                    <span className="text-slate-200 font-semibold">${trade.entryPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 text-[10px] block">السعر الحالي</span>
                    <span className="text-white font-bold">${trade.currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-emerald-400 text-[10px] block">الهدف (+{trade.targetPct}%)</span>
                    <span className="text-emerald-400 font-semibold">${trade.targetPrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* Smart Exit & Trailing Status */}
                <div className="flex flex-wrap items-center justify-between text-xs bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${trade.isTrailingActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                    <span className="text-slate-300">
                      {trade.isTrailingActive ? 'Smart Exit نشط (حماية القمة)' : 'مراقبة الهدف'}
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono flex items-center gap-2">
                    <span>أعلى قمة: <strong className="text-emerald-400">+{trade.peakPnLPct}%</strong></span>
                    <span>•</span>
                    <span>الوقف: <strong className="text-rose-400">-${trade.stopLossPct}%</strong></span>
                  </div>
                </div>

                {/* Trade Action Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-400 font-mono">
                    توافق: <span className="text-emerald-400 font-bold">{trade.supportingTimeframesCount}/7</span> أطر | حجم: ${trade.sizeUsd}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCloseTrade(trade.id, 'SMART_EXIT')}
                      className="text-xs font-medium px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md transition cursor-pointer"
                    >
                      إغلاق ذكي (Smart Exit)
                    </button>
                    <button
                      onClick={() => onCloseTrade(trade.id, 'MANUAL')}
                      className="text-xs font-medium px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition cursor-pointer"
                    >
                      إغلاق فوري
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
