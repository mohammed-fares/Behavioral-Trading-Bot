/**
 * Backtest & Walk-Forward Validation Suite
 * Sequentially tests the 7-phase behavioral model on historical data with:
 * - Zero Lookahead Bias
 * - Real commissions, slippage, and spread modeling
 * - In-Sample (Train) vs Out-of-Sample (Test) Walk-Forward split
 * - Benchmarking against Buy & Hold
 * - Full metrics: Sharpe, Sortino, Profit Factor, Expectancy, Max Drawdown
 */

import React, { useState } from 'react';
import { Play, TrendingUp, ShieldAlert, Award, Activity, RefreshCw, BarChart2 } from 'lucide-react';
import { StrategySettings, Timeframe, BacktestResult, SUPPORTED_COINS, TIMEFRAMES } from '../types';
import { BacktestEngine } from '../services/backtest/backtestEngine';
import { MarketDataLayer } from '../services/marketData/marketDataLayer';

interface BacktestTabProps {
  settings: StrategySettings;
}

export const BacktestTab: React.FC<BacktestTabProps> = ({ settings }) => {
  const [selectedCoin, setSelectedCoin] = useState<string>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [leverage, setLeverage] = useState<number>(settings.leverage || 10);
  const [takerFeePct, setTakerFeePct] = useState<number>(0.04);
  const [slippagePct, setSlippagePct] = useState<number>(0.02);
  const [trainRatio, setTrainRatio] = useState<number>(0.7);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<{
    inSample?: BacktestResult;
    outOfSample?: BacktestResult;
    totalResult?: BacktestResult;
  } | null>(null);

  const runBacktest = async () => {
    setIsRunning(true);
    try {
      // Fetch historical candles for backtesting
      const candles = await MarketDataLayer.fetchCandles(
        selectedCoin,
        selectedTimeframe,
        200,
        settings.marketType || 'USDT_M_FUTURES',
        'BACKTEST'
      );

      const res = BacktestEngine.run(candles, settings, {
        symbol: selectedCoin,
        timeframe: selectedTimeframe,
        initialCapitalUsd: initialCapital,
        leverage,
        takerFeeRate: takerFeePct / 100,
        slippagePct,
        trainRatio
      });

      setResults(res);
    } catch (e) {
      console.error('Backtest error', e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Config Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
              منظومة الاختبار الرجعي والتحقق الأمامي (Backtesting & Walk-Forward)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              محاكاة تاريخية دقيقة خالية تماماً من التحيز المستقبلي (No Lookahead Bias) مع احتساب العمولات، الانزلاق السعري، وتوزيع التدريب والاختبار
            </p>
          </div>
          <button
            id="run-backtest-btn"
            onClick={runBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-900/30"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                تشغيل الاختبار الرجعي
              </>
            )}
          </button>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">العملة</label>
            <select
              id="backtest-coin-select"
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            >
              {SUPPORTED_COINS.map(c => (
                <option key={c.symbol} value={c.symbol}>{c.symbol} ({c.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">الإطار الزمني</label>
            <select
              id="backtest-tf-select"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as Timeframe)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            >
              {TIMEFRAMES.map(tf => (
                <option key={tf.id} value={tf.id}>{tf.label} ({tf.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">رأس المال الابتدائي ($)</label>
            <input
              id="backtest-capital-input"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Math.max(10, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">الرافعة المالية</label>
            <select
              id="backtest-leverage-select"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            >
              <option value="1">1x (بدون رافعة / Spot)</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
              <option value="15">15x</option>
              <option value="20">20x</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">عمولة التيكر (Taker Fee %)</label>
            <input
              id="backtest-fee-input"
              type="number"
              step="0.01"
              value={takerFeePct}
              onChange={(e) => setTakerFeePct(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">الانزلاق السعري (Slippage %)</label>
            <input
              id="backtest-slippage-input"
              type="number"
              step="0.01"
              value={slippagePct}
              onChange={(e) => setSlippagePct(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results Display */}
      {results && results.totalResult && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">العائد الإجمالي (Total Return)</span>
              <span className={`text-xl font-bold mt-1 block ${results.totalResult.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {results.totalResult.totalReturnPct >= 0 ? '+' : ''}{results.totalResult.totalReturnPct}%
              </span>
              <span className="text-xs text-slate-500 mt-1 block">مقابل الشراء والاحتفاظ: {results.totalResult.buyAndHoldReturnPct}%</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">نسبة الفوز (Win Rate)</span>
              <span className="text-xl font-bold text-white mt-1 block">
                {results.totalResult.winRatePct}%
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                {results.totalResult.winningTrades} فوز / {results.totalResult.losingTrades} خسارة
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">أقصى تراجع (Max Drawdown)</span>
              <span className="text-xl font-bold text-rose-400 mt-1 block">
                -{results.totalResult.maxDrawdownPct}%
              </span>
              <span className="text-xs text-slate-500 mt-1 block">مخاطرة الهبوط القصوى</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">معامل الربح (Profit Factor)</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">
                {results.totalResult.profitFactor}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">إجمالي الربح ÷ الخسارة</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">معدل شارب (Sharpe Ratio)</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {results.totalResult.sharpeRatio}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">سورتينو: {results.totalResult.sortinoRatio}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block">العمولة والانزلاق</span>
              <span className="text-xl font-bold text-slate-300 mt-1 block">
                ${results.totalResult.totalFeesUsd}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">انزلاق مدفوع: ${results.totalResult.slippagePaidUsd}</span>
            </div>
          </div>

          {/* Walk-Forward Train vs Test Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  عينة التدريب الأولية (In-Sample: 70%)
                </h3>
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  {results.inSample?.totalTrades} صفقات
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-xs text-slate-400 block">العائد</span>
                  <span className="font-bold text-emerald-400">{results.inSample?.totalReturnPct}%</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-xs text-slate-400 block">نسبة الفوز</span>
                  <span className="font-bold text-white">{results.inSample?.winRatePct}%</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-xs text-slate-400 block">أقصى تراجع</span>
                  <span className="font-bold text-rose-400">-{results.inSample?.maxDrawdownPct}%</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  عينة التحقق الأمامي (Out-of-Sample: 30%)
                </h3>
                <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                  {results.outOfSample?.totalTrades} صفقات
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-xs text-slate-400 block">العائد</span>
                  <span className="font-bold text-cyan-400">{results.outOfSample?.totalReturnPct}%</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-xs text-slate-400 block">نسبة الفوز</span>
                  <span className="font-bold text-white">{results.outOfSample?.winRatePct}%</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-xs text-slate-400 block">أقصى تراجع</span>
                  <span className="font-bold text-rose-400">-{results.outOfSample?.maxDrawdownPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Execution Log Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              سجل صفقات الاختبار الرجعي المنفذة ({results.totalResult.trades.length} صفقة)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="text-xs text-slate-400 bg-slate-950/80 border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">الاتجاه</th>
                    <th className="p-3">سعر الدخول</th>
                    <th className="p-3">سعر الخروج</th>
                    <th className="p-3">الربح الصافي ($)</th>
                    <th className="p-3">العائد (%)</th>
                    <th className="p-3">سبب الخروج</th>
                    <th className="p-3">المدة (دقيقة)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {results.totalResult.trades.slice(-20).reverse().map((t, idx) => (
                    <tr key={t.id || idx} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.direction === 'LONG' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {t.direction === 'LONG' ? 'شراء (LONG)' : 'بيع (SHORT)'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">${t.entryPrice.toLocaleString()}</td>
                      <td className="p-3 font-mono">${(t.exitPrice || 0).toLocaleString()}</td>
                      <td className={`p-3 font-mono font-semibold ${(t.realizedPnLUsd || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(t.realizedPnLUsd || 0) >= 0 ? '+' : ''}${(t.realizedPnLUsd || 0).toFixed(2)}
                      </td>
                      <td className={`p-3 font-mono ${(t.realizedPnLPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(t.realizedPnLPct || 0) >= 0 ? '+' : ''}{(t.realizedPnLPct || 0).toFixed(2)}%
                      </td>
                      <td className="p-3 text-xs text-slate-300">{t.exitReason}</td>
                      <td className="p-3 text-xs text-slate-400">{t.durationMinutes} د</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
