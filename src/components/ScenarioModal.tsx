import React from 'react';
import { X, Play, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (id: number) => void;
}

const SCENARIOS = [
  {
    id: 1,
    title: 'سيناريو 1: صفقة رابحة على BTCUSDT',
    desc: 'اكتشاف نمط صاعد بـ 5 أطر متوافقة في ساعة سيولة ذهبية، دخول صفقة رابحة بنجاح +$3.75.',
    badge: 'رابحة +0.65%',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 2,
    title: 'سيناريو 2: صفقة خاسرة وتفعيل وقف الخسارة الصارم',
    desc: 'دخول صفقة ثم انعكاس السوق، تفعيل إيقاف الخسارة بدقة وإضافة النتيجة للذاكرة السلوكية.',
    badge: 'خاسرة -0.40%',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  },
  {
    id: 3,
    title: 'سيناريو 3: رفض القرار لعدم كفاية تكرار النمط',
    desc: 'اكتشاف حركة سعرية ولكن النمط تكرر 12 مرة فقط (أقل من الحد الأدنى 20)، يتم حجب القرار لحماية الرصيد.',
    badge: 'مرفوضة (تكرار ضعيف)',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  {
    id: 4,
    title: 'سيناريو 4: رفض القرار لتضارب الأطر الزمنية',
    desc: '3 أطر صاعدة مقابل 4 هابطة، رفض القرار فورا وفقا لمبدأ التوافق الصارم للأطر السبعة.',
    badge: 'مرفوضة (تضارب الأطر)',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
  }
];

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl font-sans">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">محاكي السيناريوهات التعليمية الحية</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            اختر أحد السيناريوهات لاختبار كيفية اتخاذ البوت للقرارات وشفافية المراجعة الخماسية والتعلم الذاتي:
          </p>

          <div className="space-y-2.5">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                onClick={() => {
                  onSelectScenario(sc.id);
                  onClose();
                }}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                      {sc.title}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {sc.desc}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center text-slate-300 transition shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
