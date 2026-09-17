/**
 * Settings Tab — الإعدادات، شروط الأنماط، إدارة المخاطر، وإدارة الذاكرة
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  ShieldAlert, 
  Layers, 
  Brain, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import { StrategySettings, TIMEFRAMES } from '../types';
import { MemoryManagementSection } from './settings/MemoryManagementSection';

interface SettingsTabProps {
  settings: StrategySettings;
  onSaveSettings: (newSettings: StrategySettings) => void;
  onResetMemory: () => void;
  onExportMemory: () => void;
  onImportMemory: (file: File) => void;
  onOpenCapitalWizard?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSaveSettings,
  onResetMemory,
  onExportMemory,
  onImportMemory,
  onOpenCapitalWizard,
}) => {
  const [form, setForm] = useState<StrategySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (key: keyof StrategySettings, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Header */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              إعدادات الاستراتيجية، الأطر، وضوابط المخاطر الصارمة
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              تحكم في معايير كشف الأنماط، الحد الأدنى للتوافق بين الأطر السبعة، وقواعد الحماية وإدارة رأس المال.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenCapitalWizard && (
              <button
                type="button"
                onClick={onOpenCapitalWizard}
                className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>معالج رأس المال والضبط الذاتي</span>
              </button>
            )}

            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
                <Check className="w-4 h-4" /> تم الحفظ بنجاح!
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition"
            >
              حفظ الإعدادات
            </button>
          </div>
        </div>

        {/* 0. Execution Mode: Live vs Paper */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              وضع التداول (حقيقي vs وهمي) وبيانات الربط
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
              form.tradingExecutionMode === 'LIVE'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {form.tradingExecutionMode === 'LIVE' ? '🔴 تداول حقيقي (Live Binance)' : '🟢 تداول وهمي تجريبي (Paper)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              onClick={() => handleChange('tradingExecutionMode', 'PAPER')}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                form.tradingExecutionMode === 'PAPER'
                  ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-white text-sm">🟢 الوضع الوهمي التجريبي (Paper Trading)</div>
              <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">
                تداول بأموال افتراضية متصلة بلحظة بلحظة بأسعار Binance الحقيقية — مناسب للتدريب وبناء ذاكرة الأنماط.
              </p>
            </div>

            <div
              onClick={() => handleChange('tradingExecutionMode', 'LIVE')}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                form.tradingExecutionMode === 'LIVE'
                  ? 'bg-rose-950/30 border-rose-500/60 ring-1 ring-rose-500/40'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-white text-sm">🔴 الوضع الحقيقي المباشر (Live Binance Futures)</div>
              <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">
                تنفيذ حقيقي لأوامر الشراء والبيع وحجز الأرباح على حسابك في Binance عبر مفاتيح API الخاصة بك.
              </p>
            </div>
          </div>

          {form.tradingExecutionMode === 'LIVE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Binance API Key</label>
                <input
                  type="password"
                  value={form.apiKey || ''}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="أدخل مفتاح Binance API Key..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Binance API Secret</label>
                <input
                  type="password"
                  value={form.apiSecret || ''}
                  onChange={(e) => handleChange('apiSecret', e.target.value)}
                  placeholder="أدخل مفتاح Binance API Secret..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 1. Strategy Mode & Timeframes Grid */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            1. وضع التداول والأطر الزمنية المفعلة (Timeframes)
          </h3>

          {/* Strategy Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {[
              { id: 'AUTO', name: 'تلقائي ذكي (موصى به)', desc: 'تكييف الإطار وفق أفضل توافق' },
              { id: 'SCALPING', name: 'مضاربة سريعة (1m-15m)', desc: 'التركيز على الزخم السريع' },
              { id: 'DAY_TRADING', name: 'تداول يومي (15m-1h)', desc: 'صفقات متوازنة 30-90 دقيقة' },
              { id: 'POSITION', name: 'تداول سوينغ (1h-1d)', desc: 'صفقات طويلة الأمد' },
            ].map((mode) => (
              <div
                key={mode.id}
                onClick={() => handleChange('strategyMode', mode.id)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  form.strategyMode === mode.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">{mode.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{mode.desc}</div>
              </div>
            ))}
          </div>

          {/* Timeframe Checkboxes */}
          <div className="border-t border-slate-800/80 pt-4">
            <div className="text-xs font-semibold text-slate-300 mb-2">الأطر المشمولة في فحص التوافق (7 أطر كاملة):</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs font-mono">
              {TIMEFRAMES.map((tf) => {
                const isEnabled = form.enabledTimeframes.includes(tf.id);
                return (
                  <label
                    key={tf.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                      isEnabled ? 'bg-slate-800 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange('enabledTimeframes', [...form.enabledTimeframes, tf.id]);
                        } else {
                          handleChange('enabledTimeframes', form.enabledTimeframes.filter(t => t !== tf.id));
                        }
                      }}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>{tf.label} ({tf.duration})</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Pattern Discovery Thresholds & Timeframe Alignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pattern Rules */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs font-mono">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
              <Brain className="w-4 h-4 text-cyan-400" />
              2. شروط اكتشاف النمط (Pattern Rules)
            </h3>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأدنى لتكرار النمط في الذاكرة</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={form.minOccurrences}
                  onChange={(e) => handleChange('minOccurrences', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">تكراراً تاريخياً (القيمة المثالية: 20)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأدنى للثقة التاريخية للنمط</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={form.minConfidence}
                  onChange={(e) => handleChange('minConfidence', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">% نسبة النجاح (القيمة المثالية: 65%)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأدنى لمقدار حركة التذبذب</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  max="5.0"
                  value={form.minMagnitudePct}
                  onChange={(e) => handleChange('minMagnitudePct', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">% حركة سعرية لتسجيل تذبذب (Swing)</span>
              </div>
            </div>
          </div>

          {/* Timeframe Alignment Rules */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs font-mono">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
              <Layers className="w-4 h-4 text-indigo-400" />
              3. شروط توافق الأطر السبعة (Alignment Rules)
            </h3>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأدنى للأطر الداعمة</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="7"
                  value={form.minSupportingFrames}
                  onChange={(e) => handleChange('minSupportingFrames', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">أطر داعمة على الأقل (القيمة المثالية: 4-5)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأقصى للأطر المعارضة المسموح بها</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={form.maxOpposingAllowed}
                  onChange={(e) => handleChange('maxOpposingAllowed', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">أطر معارضة (أكثر من 2 يُلغى القرار فوراً)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">نسبة تراجع القمة لتفعيل Smart Exit</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={form.smartExitRetracementPct}
                  onChange={(e) => handleChange('smartExitRetracementPct', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">% تراجع من أعلى ربح محقق لحجز الأرباح</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Strict Risk Management Rules */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs font-mono">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            4. ضوابط حماية رأس المال والمخاطر الصارمة (Risk Management)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-300 block mb-1 font-sans">حجم المركز الأقصى لكل صفقة</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={form.positionSizePct}
                  onChange={(e) => handleChange('positionSizePct', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">% من رأس المال (افتراضي: 2%)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الرافعة المالية (Leverage)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.leverage}
                  onChange={(e) => handleChange('leverage', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">x رافعة معتدلة</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأقصى للصفقات المتزامنة</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxConcurrentTrades}
                  onChange={(e) => handleChange('maxConcurrentTrades', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">صفقات كحد أقصى (افتراضي: 5)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأقصى للخسارة اليومية</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={form.dailyLossLimitPct}
                  onChange={(e) => handleChange('dailyLossLimitPct', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">% يوقف البوت عن التداول لليوم</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">الحد الأقصى للخسائر المتتالية</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={form.maxConsecutiveLosses}
                  onChange={(e) => handleChange('maxConsecutiveLosses', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">خسائر متتالية يدخل بعدها في استراحة</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-sans">فترة Cooldown للعملة</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.cooldownMinutes}
                  onChange={(e) => handleChange('cooldownMinutes', Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-400 font-sans">دقيقة راحة قبل تكرار نفس العملة</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 4. Local Memory Persistence & Export/Import */}
      <MemoryManagementSection
        onExportMemory={onExportMemory}
        onImportMemory={onImportMemory}
        onResetMemory={onResetMemory}
      />
    </div>
  );
};
