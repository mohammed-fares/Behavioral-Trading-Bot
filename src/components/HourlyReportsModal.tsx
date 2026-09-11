import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  X, 
  BookOpen, 
  Calendar,
  Sparkles,
  Database
} from 'lucide-react';
import { HourlyReport, DisqualifiedPattern, StrategySettings } from '../types';
import { HourlyReporter } from '../services/hourlyReporter';

interface HourlyReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: HourlyReport[];
  disqualifiedPatterns: DisqualifiedPattern[];
  onGenerateCurrentHourReport: () => void;
  settings: StrategySettings;
}

export const HourlyReportsModal: React.FC<HourlyReportsModalProps> = ({
  isOpen,
  onClose,
  reports,
  disqualifiedPatterns,
  onGenerateCurrentHourReport,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'blacklist'>('reports');
  const [selectedReport, setSelectedReport] = useState<HourlyReport | null>(reports[0] || null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 md:p-6 overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-950 via-slate-900 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                تقارير الأداء الساعية والتعلم السلوكي
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {settings.hourlyReportAutoExport ? 'تصدير تلقائي مفعّل' : 'تصدير يدوي'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تصدير تقرير شامل كل 60 دقيقة بكافة الصفقات والاستراتيجيات وقائمة استبعاد الأخطاء السابقة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerateCurrentHourReport}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              تصدير تقرير الساعة الآن
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            سجل التقارير الساعية ({reports.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blacklist')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'blacklist'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            الأنماط المستبعدة لمنع تكرار الخطأ ({disqualifiedPatterns.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'reports' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Reports List */}
              <div className="md:col-span-5 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  التقارير المولدة مؤخراً:
                </span>
                {reports.length === 0 ? (
                  <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-750 text-center text-slate-400 text-xs">
                    لم يتم توليد أي تقارير ساعية بعد. انقر على "تصدير تقرير الساعة الآن" لإنشاء أول تقرير فوراً.
                  </div>
                ) : (
                  reports.map((report) => {
                    const isSelected = selectedReport?.id === report.id;
                    const isWin = report.netPnLUsd >= 0;
                    return (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10'
                            : 'bg-slate-850 border-slate-750 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {report.formattedTime}
                          </span>
                          <span
                            className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                              isWin
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isWin ? '+' : ''}${report.netPnLUsd.toFixed(2)} ({isWin ? '+' : ''}{report.roiPct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>الصفقات: {report.totalTrades} (فوز: {report.winningTrades} / خسارة: {report.losingTrades})</span>
                          <span>الرصيد: ${report.capitalAtHour.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Report Details */}
              <div className="md:col-span-7 bg-slate-850 border border-slate-750 rounded-xl p-5 space-y-4">
                {selectedReport ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-750 pb-3">
                      <div>
                        <h3 className="font-bold text-base text-white flex items-center gap-2">
                          تفاصيل تقرير الساعة
                          <span className="text-xs text-slate-400 font-mono">({selectedReport.formattedTime})</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedReport.summaryText}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => HourlyReporter.downloadReport(selectedReport, 'txt')}
                          className="px-2.5 py-1.5 bg-slate-750 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                          title="تنزيل التقرير بصيغة نصية"
                        >
                          <Download className="w-3.5 h-3.5" />
                          TXT
                        </button>
                        <button
                          type="button"
                          onClick={() => HourlyReporter.downloadReport(selectedReport, 'json')}
                          className="px-2.5 py-1.5 bg-slate-750 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                          title="تنزيل كائن JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                          JSON
                        </button>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block mb-0.5">صافي العائد:</span>
                        <span className={`text-sm font-bold font-mono ${selectedReport.netPnLUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {selectedReport.netPnLUsd >= 0 ? '+' : ''}${selectedReport.netPnLUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block mb-0.5">الصفقات المنفذة:</span>
                        <span className="text-sm font-bold text-white">
                          {selectedReport.totalTrades} <span className="text-[10px] text-slate-400 font-normal">(فوز: {selectedReport.winningTrades})</span>
                        </span>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
                        <span className="text-[10px] text-slate-400 block mb-0.5">القرارات المعالجة:</span>
                        <span className="text-sm font-bold text-white">
                          {selectedReport.decisionsCount} <span className="text-[10px] text-slate-400 font-normal">(رفض: {selectedReport.rejectedCount})</span>
                        </span>
                      </div>
                    </div>

                    {/* Key Lessons Learned */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        الدروس السلوكية والاستراتيجيات المتخذة:
                      </span>
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-1.5">
                        {selectedReport.keyLessonsLearned.map((lesson, idx) => (
                          <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 font-mono mt-0.5">{idx + 1}.</span>
                            <span>{lesson}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Trades list in this hour */}
                    {selectedReport.executedTrades.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-300 block">
                          الصفقات المسجلة خلال الساعة:
                        </span>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          {selectedReport.executedTrades.map((t) => (
                            <div key={t.id} className="p-2 bg-slate-800/70 rounded-lg border border-slate-700 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{t.coin}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                  {t.direction}
                                </span>
                                <span className="text-slate-400 text-[11px]">{t.timeframe}</span>
                              </div>
                              <span className={`font-mono font-bold ${t.realizedPnLUsd && t.realizedPnLUsd > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.realizedPnLUsd !== undefined ? `${t.realizedPnLUsd >= 0 ? '+' : ''}$${t.realizedPnLUsd.toFixed(2)}` : 'مفتوحة'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    اختر تقريراً من القائمة لعرض كامل تفاصيله
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Blacklist / Anti-Repetition Tab */
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 block mb-1">
                    محرك منع تكرار الأخطاء (Anti-Repetition & Disqualification Engine)
                  </strong>
                  عندما تتعرض صفقة لخسارة بسبب كسر وقف الخسارة أو ارتداد كاذب، يقوم البوت فوراً بتسجيل النمط في قاعدة البيانات واستبعاده من التداول المستقبلي لمنع تكرار نفس الخطأ!
                </div>
              </div>

              {disqualifiedPatterns.length === 0 ? (
                <div className="p-8 bg-slate-800/40 rounded-xl border border-slate-750 text-center text-slate-400 text-xs">
                  لا توجد أنماط مستبعدة حالياً — كافة الأنماط المسجلة ذات أداء إيجابي وتاريخ نظيف.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {disqualifiedPatterns.map((dp) => (
                    <div
                      key={dp.id}
                      className="bg-slate-850 border border-slate-750 rounded-xl p-4 space-y-2 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{dp.coin}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {dp.timeframe}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono font-semibold">
                            {dp.patternTag}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          -${dp.lossUsd.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="text-slate-400">
                          <strong className="text-slate-300">سبب الاستبعاد:</strong> {dp.reason}
                        </div>
                        <div className="text-indigo-300 font-medium">
                          <strong className="text-indigo-400">الدرس المستفاد:</strong> {dp.lesson}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500 border-t border-slate-800">
                        <span>مسجل منذ: {new Date(dp.timestamp).toLocaleTimeString('ar-EG')}</span>
                        <span className="text-amber-400">محظور ومستبعد حتى إشعار آخر 🛡️</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>قاعدة البيانات متزامنة وتُحدث تلقائياً مع كل دورة مسح وصفقة</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
