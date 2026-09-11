/**
 * Multi-Timeframe Board — لوحة الأطر المتعددة (7 Timeframes Matrix)
 * تعرض حالة كل عملة عبر الأطر السبعة (1m, 5m, 15m, 30m, 1h, 4h, 1d) مع مقياس التوافق والإشارة النهائية
 */

import React, { useState } from 'react';
import { 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Eye,
  Info,
  ChevronLeft
} from 'lucide-react';
import { Timeframe, SUPPORTED_COINS, TIMEFRAMES, Direction } from '../types';
import { TickerData } from '../services/binance';

interface CoinMatrixState {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  timeframes: {
    [key in Timeframe]: {
      direction: Direction;
      confidence: number;
      patternTag: string;
      changePct: number;
      durationMinutes: number;
    };
  };
  supportingUpCount: number;
  supportingDownCount: number;
  neutralCount: number;
  alignmentScore: string; // e.g. "5/7 صاعد"
  finalSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' | 'CONFLICT';
  netConfidence: number;
}

interface MultiTimeframeBoardProps {
  tickers: { [symbol: string]: TickerData };
  onScanCoin: (symbol: string) => void;
  onOpenDecisionForCoin: (symbol: string) => void;
}

export const MultiTimeframeBoard: React.FC<MultiTimeframeBoardProps> = ({
  tickers,
  onScanCoin,
  onOpenDecisionForCoin,
}) => {
  const [selectedCoin, setSelectedCoin] = useState<string>('BTCUSDT');

  // Generate realistic 7-TF state for each coin based on prompt
  const getCoinMatrixData = (): CoinMatrixState[] => {
    return SUPPORTED_COINS.map((c, idx) => {
      const ticker = tickers[c.symbol] || { price: c.basePrice, change24h: 1.5 };
      const isBtc = c.symbol === 'BTCUSDT';
      const isEth = c.symbol === 'ETHUSDT';
      const isSol = c.symbol === 'SOLUSDT';

      // Specific realistic states matching the prompt scenarios:
      // BTC: 1m UP (+56%), 5m UP (+62%), 15m UP (+68%), 30m UP (+65%), 1h UP (+60%), 4h Neutral (50%), 1d DOWN (-45%)
      // Net confidence = 83%
      if (isBtc) {
        return {
          symbol: c.symbol,
          name: c.name,
          price: ticker.price,
          change24h: ticker.change24h,
          timeframes: {
            '1m':  { direction: 'UP', confidence: 56, patternTag: 'P-U-0.4-8-R48-62-A22-30', changePct: 0.4, durationMinutes: 8 },
            '5m':  { direction: 'UP', confidence: 62, patternTag: 'P-U-0.8-25-R46-64-A24-32', changePct: 0.8, durationMinutes: 25 },
            '15m': { direction: 'UP', confidence: 68, patternTag: 'P-U-1.5-47-R45-68-A25-35', changePct: 1.5, durationMinutes: 47 },
            '30m': { direction: 'UP', confidence: 65, patternTag: 'P-U-1.8-80-R48-66-A26-34', changePct: 1.8, durationMinutes: 80 },
            '1h':  { direction: 'UP', confidence: 60, patternTag: 'P-U-2.2-140-R50-65-A28-36', changePct: 2.2, durationMinutes: 140 },
            '4h':  { direction: 'SIDEWAYS', confidence: 50, patternTag: 'P-S-0.3-480-R50-52-A18-20', changePct: 0.3, durationMinutes: 480 },
            '1d':  { direction: 'DOWN', confidence: 45, patternTag: 'P-D-1.9-1440-R58-46-A30-26', changePct: -1.9, durationMinutes: 1440 },
          },
          supportingUpCount: 5,
          supportingDownCount: 1,
          neutralCount: 1,
          alignmentScore: '5/7 صاعد',
          finalSignal: 'STRONG_BUY',
          netConfidence: 83,
        };
      }

      // ETH: 1m DOWN, 5m DOWN (P-D-0.5-30), but 15m, 30m, 1h, 4h, 1d are UP! Severe conflict (Scenario 2)
      if (isEth) {
        return {
          symbol: c.symbol,
          name: c.name,
          price: ticker.price,
          change24h: ticker.change24h,
          timeframes: {
            '1m':  { direction: 'DOWN', confidence: 52, patternTag: 'P-D-0.3-10-R62-48-A26-22', changePct: -0.3, durationMinutes: 10 },
            '5m':  { direction: 'DOWN', confidence: 60, patternTag: 'P-D-0.5-30-R70-45-A30-25', changePct: -0.5, durationMinutes: 30 },
            '15m': { direction: 'UP', confidence: 65, patternTag: 'P-U-1.2-45-R45-66-A22-32', changePct: 1.2, durationMinutes: 45 },
            '30m': { direction: 'UP', confidence: 68, patternTag: 'P-U-1.6-90-R48-68-A25-34', changePct: 1.6, durationMinutes: 90 },
            '1h':  { direction: 'UP', confidence: 70, patternTag: 'P-U-2.1-150-R52-70-A28-36', changePct: 2.1, durationMinutes: 150 },
            '4h':  { direction: 'UP', confidence: 72, patternTag: 'P-U-3.4-600-R54-72-A30-38', changePct: 3.4, durationMinutes: 600 },
            '1d':  { direction: 'UP', confidence: 74, patternTag: 'P-U-4.8-1440-R55-75-A32-40', changePct: 4.8, durationMinutes: 1440 },
          },
          supportingUpCount: 5,
          supportingDownCount: 2,
          neutralCount: 0,
          alignmentScore: 'تعارض حاد (5 صاعد مقابل 2 هابط)',
          finalSignal: 'CONFLICT',
          netConfidence: 15,
        };
      }

      // SOL: 5/7 UP, promising but 30m pattern has few repetitions (Scenario 3)
      if (isSol) {
        return {
          symbol: c.symbol,
          name: c.name,
          price: ticker.price,
          change24h: ticker.change24h,
          timeframes: {
            '1m':  { direction: 'UP', confidence: 58, patternTag: 'P-U-0.5-12-R49-62-A24-30', changePct: 0.5, durationMinutes: 12 },
            '5m':  { direction: 'UP', confidence: 64, patternTag: 'P-U-1.0-28-R46-66-A25-33', changePct: 1.0, durationMinutes: 28 },
            '15m': { direction: 'UP', confidence: 66, patternTag: 'P-U-1.4-42-R47-68-A26-34', changePct: 1.4, durationMinutes: 42 },
            '30m': { direction: 'UP', confidence: 62, patternTag: 'P-U-2.0-90-R55-70-A30-40', changePct: 2.0, durationMinutes: 90 },
            '1h':  { direction: 'UP', confidence: 65, patternTag: 'P-U-2.5-160-R52-68-A28-36', changePct: 2.5, durationMinutes: 160 },
            '4h':  { direction: 'SIDEWAYS', confidence: 50, patternTag: 'P-S-0.4-520-R51-53-A20-22', changePct: 0.4, durationMinutes: 520 },
            '1d':  { direction: 'SIDEWAYS', confidence: 52, patternTag: 'P-S-0.6-1440-R49-51-A22-24', changePct: 0.6, durationMinutes: 1440 },
          },
          supportingUpCount: 5,
          supportingDownCount: 0,
          neutralCount: 2,
          alignmentScore: '5/7 صاعد (انتظار تكرار)',
          finalSignal: 'BUY',
          netConfidence: 74,
        };
      }

      // Other coins with balanced procedural signals
      const isMainlyUp = idx % 2 === 0;
      const upCount = isMainlyUp ? 5 : 2;
      const downCount = isMainlyUp ? 1 : 4;
      const neutCount = 7 - upCount - downCount;

      const tfs: any = {};
      TIMEFRAMES.forEach((tf, tIdx) => {
        let dir: Direction = 'SIDEWAYS';
        if (tIdx < upCount) dir = 'UP';
        else if (tIdx < upCount + downCount) dir = 'DOWN';
        else dir = 'SIDEWAYS';

        tfs[tf.id] = {
          direction: dir,
          confidence: dir === 'UP' ? 62 + tIdx : dir === 'DOWN' ? 58 + tIdx : 50,
          patternTag: `P-${dir === 'UP' ? 'U' : dir === 'DOWN' ? 'D' : 'S'}-1.${tIdx + 1}-${15 * (tIdx + 1)}-R45-65-A25-35`,
          changePct: dir === 'UP' ? 0.8 + tIdx * 0.2 : dir === 'DOWN' ? -(0.6 + tIdx * 0.2) : 0.1,
          durationMinutes: 15 * (tIdx + 1),
        };
      });

      return {
        symbol: c.symbol,
        name: c.name,
        price: ticker.price,
        change24h: ticker.change24h,
        timeframes: tfs,
        supportingUpCount: upCount,
        supportingDownCount: downCount,
        neutralCount: neutCount,
        alignmentScore: isMainlyUp ? `${upCount}/7 صاعد` : `${downCount}/7 هابط`,
        finalSignal: isMainlyUp ? 'BUY' : 'SELL',
        netConfidence: isMainlyUp ? 68 + idx : 35,
      };
    });
  };

  const matrixData = getCoinMatrixData();
  const activeCoinData = matrixData.find(c => c.symbol === selectedCoin) || matrixData[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Philosophy Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              مصفوفة توافق الأطر الزمنية السبعة (Multi-Timeframe Matrix)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              القاعدة الذهبية: <strong>"القرار الذي تتفق عليه 5+ أطر هو القرار الصحيح"</strong>.
              الأطر الصغيرة (1m-5m) تكشف التفاصيل والزخم، والأطر الكبيرة (1h-1d) تكشف الاتجاه الرئيسي.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onScanCoin(selectedCoin)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>مسح كل الأطر الآن</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table: 8 Coins x 7 Timeframes */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-medium font-mono">
                <th className="py-3.5 px-4">العملة والسعر</th>
                {TIMEFRAMES.map((tf) => (
                  <th key={tf.id} className="py-3.5 px-2 text-center">
                    <span className="text-slate-200 font-bold">{tf.label}</span>
                    <span className="text-[10px] text-slate-500 block font-sans">{tf.duration}</span>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-center">التوافق الصافي</th>
                <th className="py-3.5 px-4 text-center">الإشارة النهائية</th>
                <th className="py-3.5 px-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {matrixData.map((row) => {
                const isSelected = row.symbol === selectedCoin;
                const isConflict = row.finalSignal === 'CONFLICT';
                const isStrongBuy = row.finalSignal === 'STRONG_BUY';
                const isBuy = row.finalSignal === 'BUY';
                const isSell = row.finalSignal === 'SELL';

                return (
                  <tr 
                    key={row.symbol}
                    onClick={() => setSelectedCoin(row.symbol)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition ${
                      isSelected ? 'bg-slate-800/60 ring-1 ring-emerald-500/30' : ''
                    }`}
                  >
                    {/* Coin info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">
                          {row.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {row.symbol}
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>${row.price.toLocaleString()}</span>
                            <span className={row.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {row.change24h >= 0 ? '+' : ''}{row.change24h}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 7 Timeframe Bars */}
                    {TIMEFRAMES.map((tf) => {
                      const frame = row.timeframes[tf.id];
                      const isUp = frame.direction === 'UP';
                      const isDown = frame.direction === 'DOWN';
                      const isSide = frame.direction === 'SIDEWAYS';

                      return (
                        <td key={tf.id} className="py-3 px-2 text-center">
                          <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                            isUp 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : isDown 
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                              : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                          }`}>
                            <div className="flex items-center gap-0.5 font-bold text-xs">
                              {isUp && <ArrowUp className="w-3.5 h-3.5" />}
                              {isDown && <ArrowDown className="w-3.5 h-3.5" />}
                              {isSide && <Minus className="w-3.5 h-3.5" />}
                              <span>{isUp ? 'صعود' : isDown ? 'هبوط' : 'جانبي'}</span>
                            </div>
                            <span className="text-[10px] opacity-80">{frame.confidence}%</span>
                          </div>
                        </td>
                      );
                    })}

                    {/* Alignment Score */}
                    <td className="py-3 px-4 text-center">
                      <div className="font-bold text-white text-xs">{row.alignmentScore}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ثقة معدلة: <strong className={row.netConfidence >= 65 ? 'text-emerald-400' : 'text-amber-400'}>{row.netConfidence}%</strong>
                      </div>
                    </td>

                    {/* Final Signal Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isStrongBuy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' :
                        isBuy ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        isConflict ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                        isSell ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {isStrongBuy ? 'شراء قوي (83%)' :
                         isBuy ? 'شراء محتمل' :
                         isConflict ? 'تعارض حاد (رفض)' :
                         isSell ? 'بيع' : 'محايد'}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDecisionForCoin(row.symbol);
                        }}
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1 mx-auto transition"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        <span>فحص القرار</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Dive Breakdown for the Selected Coin (Like Step 3 in Scenario 1) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              آلية حساب التوافق الرياضي لـ {activeCoinData.symbol} ({activeCoinData.name})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">الإطار الأساسي: 15m</span>
        </div>

        {/* The Math Formula Card */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-3">
          <div className="text-slate-300 flex items-center justify-between">
            <span>النمط الأساسي على 15m: <strong className="text-emerald-400">{activeCoinData.timeframes['15m'].patternTag}</strong></span>
            <span>الثقة الأولية للنمط: <strong className="text-white">{activeCoinData.timeframes['15m'].confidence}%</strong></span>
          </div>

          <div className="border-t border-slate-900 pt-3">
            <div className="text-slate-400 mb-2">فحص مساهمة الأطر الستة الأخرى:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {TIMEFRAMES.filter(t => t.id !== '15m').map(tf => {
                const f = activeCoinData.timeframes[tf.id];
                const isSupp = f.direction === activeCoinData.timeframes['15m'].direction;
                const isOpp = f.direction !== 'SIDEWAYS' && !isSupp;
                const contrib = isSupp ? (tf.id === '5m' || tf.id === '1h' ? '+10%' : '+5%') : isOpp ? '-10%' : '0%';

                return (
                  <div key={tf.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">{tf.label}</span>
                    <span className={`font-bold block mt-0.5 ${isSupp ? 'text-emerald-400' : isOpp ? 'text-rose-400' : 'text-slate-400'}`}>
                      {f.direction} ({contrib})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-900 pt-3 flex flex-wrap items-center justify-between gap-3 text-slate-200">
            <div>
              معادلة الثقة المعدلة: 
              <span className="text-slate-400 mr-2">
                {activeCoinData.symbol === 'BTCUSDT' ? '68% + 5% (1m) + 10% (5m) + 5% (30m) + 5% (1h) + 0% (4h) - 10% (1d)' : 'قاعدة الترجيح المتعدد للأطر'}
              </span>
            </div>
            <div className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
              الثقة المعدلة النهائية = {activeCoinData.netConfidence}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
