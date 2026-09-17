import React from 'react';
import { Lock, RefreshCw } from 'lucide-react';

interface WizardLiveApiConfigProps {
  apiKey: string;
  apiSecret: string;
  isTestingApi: boolean;
  apiTestResult: { success: boolean; message: string } | null;
  onApiKeyChange: (val: string) => void;
  onApiSecretChange: (val: string) => void;
  onTestApi: () => void;
}

export const WizardLiveApiConfig: React.FC<WizardLiveApiConfigProps> = ({
  apiKey,
  apiSecret,
  isTestingApi,
  apiTestResult,
  onApiKeyChange,
  onApiSecretChange,
  onTestApi,
}) => {
  return (
    <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          مفاتيح الربط مع Binance Futures (API Credentials)
        </div>
        <span className="text-[10px] text-slate-500">محفوظة محلياً في متصفحك فقط ولا ترسل لأي خادم</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 block mb-1 text-[11px]">Binance API Key</label>
          <input
            type="password"
            placeholder="أدخل مفتاح API Key..."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-slate-400 block mb-1 text-[11px]">Binance API Secret</label>
          <input
            type="password"
            placeholder="أدخل مفتاح API Secret..."
            value={apiSecret}
            onChange={(e) => onApiSecretChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onTestApi}
          disabled={isTestingApi}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin text-emerald-400' : ''}`} />
          <span>فحص اتصال API بالحساب الحقيقي</span>
        </button>
        {apiTestResult && (
          <span className={`text-xs font-medium ${apiTestResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>
            {apiTestResult.message}
          </span>
        )}
      </div>
    </div>
  );
};
