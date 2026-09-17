import React from 'react';
import { WifiOff, RefreshCw, RotateCw } from 'lucide-react';

interface OfflineBannerProps {
  isConnectionLost: boolean;
  reconnectCount: number;
  isReconnecting: boolean;
  onManualReconnect: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isConnectionLost,
  reconnectCount,
  isReconnecting,
  onManualReconnect,
}) => {
  if (!isConnectionLost) return null;

  return (
    <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 border-b border-rose-500/70 px-4 py-3 text-white shadow-2xl relative z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-rose-500/20 border border-rose-400/50 rounded-xl shrink-0">
            <WifiOff className="w-5 h-5 text-rose-300 animate-pulse" />
          </div>
          <div className="text-right flex-1">
            <div className="text-sm font-bold flex flex-wrap items-center gap-2">
              <span>انقطع الاتصال بالإنترنت أو خوادم بينانس — تم إيقاف عمل البوت فورياً</span>
              <span className="text-[11px] bg-rose-500/30 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-md font-mono">
                حظر البيانات الوهمية نشط
              </span>
            </div>
            <p className="text-xs text-rose-200/80 mt-0.5">
              لحماية رأس المال ومنع اتخاذ قرارات خاطئة، يتوقف البوت فوراً عند انقطاع الاتصال ولا يتم توليد أو استخدام أي أرقام وهمية في الوضعين الحقيقي والتجريبي. سيتم استئناف العمل آلياً بمجرد عودة الاتصال.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
          <div className="text-xs font-mono text-amber-300 bg-black/50 px-3 py-1.5 rounded-lg border border-amber-500/30 flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>محاولة إعادة الاتصال #{reconnectCount}</span>
          </div>
          <button
            onClick={onManualReconnect}
            disabled={isReconnecting}
            className="text-xs font-bold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'جاري الفحص...' : 'إعادة المحاولة الآن'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
