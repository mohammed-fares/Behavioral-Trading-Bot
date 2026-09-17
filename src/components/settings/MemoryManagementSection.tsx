import React, { useState } from 'react';
import { Brain, Download, Upload, RotateCcw } from 'lucide-react';

interface MemoryManagementSectionProps {
  onExportMemory: () => void;
  onImportMemory: (file: File) => void;
  onResetMemory: () => void;
}

export const MemoryManagementSection: React.FC<MemoryManagementSectionProps> = ({
  onExportMemory,
  onImportMemory,
  onResetMemory,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportMemory(e.target.files[0]);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Brain className="w-4 h-4 text-emerald-400" />
        5. إدارة الذاكرة المحلية المستمرة (Local Storage Persistence)
      </h3>
      <p className="text-xs text-slate-400">
        تطبيقاً للمبدأ الرابع: الذاكرة دائمة في المتصفح ولا تعتمد على أي خوادم خارجية. يمكنك تصدير الذاكرة كملف JSON أو استيرادها في أي متصفح آخر.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onExportMemory}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg transition"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          تصدير الذاكرة بالكامل (JSON)
        </button>

        <label className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg transition cursor-pointer">
          <Upload className="w-4 h-4 text-cyan-400" />
          استيراد ذاكرة سابقة
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        </label>

        <div className="mr-auto">
          {showResetConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400">هل أنت متأكد من مسح الذاكرة؟</span>
              <button
                type="button"
                onClick={() => {
                  onResetMemory();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-md"
              >
                نعم، إعادة ضبط المصنع
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-rose-500/20 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              إعادة ضبط الذاكرة للمصنع
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
