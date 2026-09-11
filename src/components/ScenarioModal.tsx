/**
 * Scenario Modal — مشغل السيناريوهات الخمسة الواقعية
 * يتيح للمستخدم استعراض السيناريوهات الخمسة الموضحة في وثيقة المشروع وتشغيلها في حالة البوت الحية
 */

import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ShieldCheck, 
  BookOpen, 
  ArrowRight,
  Play
} from 'lucide-react';
import { Trade, DecisionLog, StrategySettings, UserStats } from '../types';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScenario: (scenarioId: number) => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  onApplyScenario,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<number>(1);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 1,
      title: 'السيناريو 1: قرار فتح صفقة كاملة (BTCUSDT 15m)',
      badge: 'فتح صفقة ناجحة',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      description: 'كشف نمط صاعد، توافق 4/7 أطر، ساعة ذروة 14:00 UTC، ثقة 83%، وتحقيق ربح +$3.75.',
      details: {
        coin: 'BTCUSDT',
        timeframe: '15m',
        patternTag: 'P-U-1.5-47-R45-68-A25-35',
        step1: 'كشف التذبذب: صعود +1.5% خلال 47 دقيقة مع RSI من 45 إلى 68 و ADX 35.',
        step2: 'تحليل الذاكرة: النمط تكرر 47 مرة في تاريخ العملة. استمر 68% من المرات بمتوسط حركة +0.81%.',
        step3: 'توافق الأطر السبعة: 1m (+5%)، 5m (+10%)، 30m (+5%)، 1h (+5%)، 4h (0%)، 1d (-10%) => الثقة النهائية: 83%.',
        step4: 'توقيت اليوم: الساعة 14:00 UTC ساعة تداول نشطة بنسبة نجاح 78% للنمط (+5% بونص).',
        step5: 'النتيجة والتنفيذ: فتح صفقة شراء بقيمة $498 بهدف +0.65% ووقف خسارة -0.40%. حققت الهدف بربح صافي +$3.75.',
      },
    },
    {
      id: 2,
      title: 'السيناريو 2: قرار رفض صفقة (ETHUSDT 5m)',
      badge: 'رفض وقائي ذكي',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      description: 'كشف نمط هابط على 5m، لكن 5 أطر عليا صاعدة، وتوقيت سيء، هبوط الثقة لـ 15% وتفادي مصيدة!',
      details: {
        coin: 'ETHUSDT',
        timeframe: '5m',
        patternTag: 'P-D-0.5-30-R70-45-A30-25',
        step1: 'كشف التذبذب: هبوط لحظي -0.5% على إطار 5 دقائق خلال 30 دقيقة.',
        step2: 'تحليل الذاكرة: النمط تكرر 34 مرة في الذاكرة بنسبة استمرار 55%.',
        step3: 'فحص توافق الأطر: الأطر الأكبر (15m, 30m, 1h, 4h, 1d) كلها صاعدة بقوة! تعارض 5 أطر يخصم -50%.',
        step4: 'توقيت اليوم: الساعة 03:00 UTC تاريخياً ساعة سيولة ضعيفة ونسبة نجاح 40% فقط (-15% خصم).',
        step5: 'القرار النهائي: ثقة نهائية 15% فقط. قرار: رفض فوري لحماية رأس المال من الشورت الوهمي.',
      },
    },
    {
      id: 3,
      title: 'السيناريو 3: قرار انتظار ومراقبة (SOLUSDT 30m)',
      badge: 'انتظار وتجميع ذاكرة',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'النمط واعد وثقة 62% وتوافق 5/7 أطر، لكن تكرر 8 مرات فقط < 20 مطلوب -> انتظار دون تسرع.',
      details: {
        coin: 'SOLUSDT',
        timeframe: '30m',
        patternTag: 'P-U-2.0-90-R55-70-A30-40',
        step1: 'كشف التذبذب: صعود قوي +2.0% خلال 90 دقيقة مع مؤشرات قوية.',
        step2: 'تحليل الذاكرة: النمط مسجل في الذاكرة لكن تكرر 8 مرات فقط (أقل من الحد الأدنى الصارم 20).',
        step3: 'توافق الأطر: 5 أطر من أصل 7 تدعم الصعود (توافق إيجابي).',
        step4: 'القرار الحكيم: بدلاً من المخاطرة بنمط قليل البيانات، قرار: انتظار ومراقبة وتحديث العداد تلقائياً.',
        step5: 'الأثر: حفظ رأس المال والالتزام بالانضباط العلمي للمشروع.',
      },
    },
    {
      id: 4,
      title: 'السيناريو 4: قرار Smart Exit (حجز الأرباح عند القمة)',
      badge: 'خروج ذكي قبل الانعكاس',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      description: 'صفقة رابحة بلغت قمة +0.81%، وعند ارتداد السعر 29.6% من القمة، تم إغلاقها فوراً وحجز +$2.85!',
      details: {
        coin: 'BTCUSDT',
        timeframe: '15m',
        patternTag: 'P-U-1.5-47-R45-68-A25-35',
        step1: 'الصفقة نشطة بربح +0.40% (تجاوز 50% من الهدف)، تم تفعيل Trailing Stop تلقائياً.',
        step2: 'استمر السعر بالصعود حتى حقق قمة ربح +0.81% (ربح عائم +$4.05).',
        step3: 'بدأ السعر بالتراجع إلى +0.57%.',
        step4: 'نسبة التراجع من القمة = (0.81 - 0.57) / 0.81 = 29.6% (تجاوزت حد الـ 25%).',
        step5: 'إجراء Smart Exit الفوري: إغلاق الصفقة بسعر السوق وحجز أرباح بقيمة +$2.85 بدلاً من خسارتها.',
      },
    },
    {
      id: 5,
      title: 'السيناريو 5: قرار التعلم بعد الخسارة (Post-Trade Learning)',
      badge: 'تحديث الذاكرة وقاعدة جديدة',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      description: 'صفقة ضربت وقف الخسارة (-$2.50)، يقوم البوت فوراً بتحديث إحصائيات النمط في الذاكرة وتسجيل قاعدة مكتسبة.',
      details: {
        coin: 'SOLUSDT',
        timeframe: '15m',
        patternTag: 'P-U-1.2-30-R50-65-A20-25',
        step1: 'الصفقة دخلت شراء، لكن تحرك السوق ضد الاتجاه وضرب وقف الخسارة (-0.50% / -$2.50).',
        step2: 'تحديث الذاكرة فوراً: زيادة التكرارات (48 -> 49)، وزيادة عداد الانعكاس (12 -> 13).',
        step3: 'خفض نسبة الثقة للنمط من 75% إلى 73% للتداول المستقبلي.',
        step4: 'تحديث إحصائيات الساعة 21:00 UTC لتسجيل انخفاض نسبة النجاح في هذا التوقيت.',
        step5: 'القاعدة المكتسبة: "عند تداول SOLUSDT ليلاً، اشترط توافق 5 أطر على الأقل بدلاً من 4".',
      },
    },
  ];

  const current = scenarios.find(s => s.id === selectedScenario) || scenarios[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Zap className="w-5 h-5 fill-amber-200 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                مشغل السيناريوهات الـ 5 الواقعية للبوت السلوكي
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                حالات عملية حقيقية توضح الفلسفة الكاملة لاتخاذ القرار وحماية الأرباح والتعلم
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenario Selectors (1 to 5) */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedScenario === sc.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>سيناريو {sc.id}</span>
            </button>
          ))}
        </div>

        {/* Scenario Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white font-sans">{current.title}</h4>
              <p className="text-xs text-slate-400 font-sans mt-0.5">{current.description}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border font-sans ${current.badgeColor}`}>
              {current.badge}
            </span>
          </div>

          {/* Details Steps */}
          <div className="space-y-3 font-sans">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-mono">1. كشف النمط والتذبذب:</span>
              <div className="text-slate-200 text-xs mt-0.5 leading-relaxed">{current.details.step1}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-cyan-400 block font-mono">2. تحليل الذاكرة التاريخية:</span>
              <div className="text-slate-200 text-xs mt-0.5 leading-relaxed">{current.details.step2}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-indigo-400 block font-mono">3. فحص توافق الأطر السبعة:</span>
              <div className="text-slate-200 text-xs mt-0.5 leading-relaxed">{current.details.step3}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-amber-400 block font-mono">4. مراجعة توقيت اليوم والسيولة:</span>
              <div className="text-slate-200 text-xs mt-0.5 leading-relaxed">{current.details.step4}</div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block font-mono">5. الإجراء والنتيجة النهائية:</span>
              <div className="text-emerald-200 text-xs mt-0.5 leading-relaxed font-semibold">{current.details.step5}</div>
            </div>
          </div>
        </div>

        {/* Footer with Apply Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            يمكنك محاكاة هذا السيناريو وتطبيقه في الذاكرة الحية للبوت فوراً
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              إغلاق
            </button>
            <button
              onClick={() => {
                onApplyScenario(current.id);
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>تطبيق هذا السيناريو في البوت الآن</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
