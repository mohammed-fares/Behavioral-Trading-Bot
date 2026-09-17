import { useState, useEffect, useCallback } from 'react';
import { BinanceService, TickerData } from '../services/binance';
import { AuditLogger } from '../services/audit/auditLogger';

interface UseConnectionMonitorProps {
  onConnectionRestored: (liveTickers: { [symbol: string]: TickerData }) => void;
  showToast: (msg: string) => void;
}

export function useConnectionMonitor({ onConnectionRestored, showToast }: UseConnectionMonitorProps) {
  const [isConnectionLost, setIsConnectionLost] = useState<boolean>(false);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  const handleManualReconnect = useCallback(async () => {
    setIsReconnecting(true);
    try {
      const pingOk = await BinanceService.ping();
      if (pingOk) {
        const live = await BinanceService.getAllTickers();
        if (live && Object.keys(live).length > 0) {
          onConnectionRestored(live);
          setIsConnectionLost(false);
          setReconnectCount(0);
          AuditLogger.info('SYSTEM', 'CONNECTION_RESTORED', 'تمت استعادة الاتصال بخوادم بينانس بنجاح واستئناف عمليات البوت بالبيانات الحقيقية.');
          showToast('🟢 تمت استعادة الاتصال بنجاح واستئناف عمل البوت بالبيانات الحية!');
          setIsReconnecting(false);
          return true;
        }
      }
    } catch {
      // still failing
    }
    setReconnectCount(prev => prev + 1);
    setIsReconnecting(false);
    return false;
  }, [onConnectionRestored, showToast]);

  useEffect(() => {
    const handleOffline = () => {
      setIsConnectionLost(true);
      AuditLogger.critical('SYSTEM', 'INTERNET_OFFLINE', 'تم استشعار انقطاع اتصال الإنترنت — تم إيقاف عمل البوت فورياً لحظر توليد أو استخدام أي أرقام وهمية.');
      showToast('⚠️ انقطع اتصال الإنترنت! تم إيقاف عمل البوت ومحرك القرارات فورياً.');
    };

    const handleOnline = async () => {
      AuditLogger.info('SYSTEM', 'INTERNET_ONLINE', 'عادت شبكة الإنترنت. جاري التحقق من خوادم بينانس واستئناف العمل...');
      handleManualReconnect();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [handleManualReconnect, showToast]);

  useEffect(() => {
    if (!isConnectionLost) return;

    const retryInterval = setInterval(async () => {
      setReconnectCount(prev => prev + 1);
      try {
        const pingOk = await BinanceService.ping();
        if (pingOk) {
          const live = await BinanceService.getAllTickers();
          if (live && Object.keys(live).length > 0) {
            onConnectionRestored(live);
            setIsConnectionLost(false);
            setReconnectCount(0);
            AuditLogger.info('SYSTEM', 'CONNECTION_RESTORED', 'تمت إعادة الاتصال تلقائياً بنجاح واستئناف عمل البوت بالبيانات الحية.');
            showToast('🟢 تمت استعادة الاتصال تلقائياً واستئناف عمل البوت بالبيانات الحية!');
          }
        }
      } catch {
        // still disconnected
      }
    }, 3500);

    return () => clearInterval(retryInterval);
  }, [isConnectionLost, onConnectionRestored, showToast]);

  return {
    isConnectionLost,
    setIsConnectionLost,
    reconnectCount,
    setReconnectCount,
    isReconnecting,
    handleManualReconnect,
  };
}
