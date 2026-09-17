/**
 * Binance API Service — جلب الأسعار والشموع الحقيقية حصراً من Binance
 * قاعدة صارمة: حظر توليد أي بيانات أو أرقام أو شموع وهمية في حال انقطاع الاتصال
 */

import { Candle, Timeframe } from '../types';

export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: number;
}

export const BinanceService = {
  /**
   * جلب الأسعار الحية الحقيقية فقط
   * في حال فشل الاتصال، لا يتم توليد أي أرقام وهمية إطلاقاً
   */
  async fetchLivePrices(): Promise<{ [symbol: string]: TickerData }> {
    const result: { [symbol: string]: TickerData } = {};
    const now = Date.now();

    // 1. محاولة جلب الأسعار عبر البروكسي الداخلي أولاً لحل قيود CORS
    try {
      const proxyRes = await fetch('/api/binance/tickers?marketType=USDT_M_FUTURES', {
        signal: AbortSignal.timeout(5000)
      });
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          for (const item of json.data) {
            const price = parseFloat(item.lastPrice || item.price || '0');
            if (price > 0) {
              result[item.symbol] = {
                symbol: item.symbol,
                price,
                change24h: parseFloat(item.priceChangePercent || '0'),
                high24h: parseFloat(item.highPrice || '0'),
                low24h: parseFloat(item.lowPrice || '0'),
                volume24h: parseFloat(item.quoteVolume || '0'),
                lastUpdated: now,
              };
            }
          }
          return result;
        }
      }
    } catch (_) {}

    // 2. محاولة جلب أسعار العقود الآجلة USDT-M مباشرة
    try {
      const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            const price = parseFloat(item.lastPrice);
            if (price > 0) {
              result[item.symbol] = {
                symbol: item.symbol,
                price,
                change24h: parseFloat(item.priceChangePercent || '0'),
                high24h: parseFloat(item.highPrice || '0'),
                low24h: parseFloat(item.lowPrice || '0'),
                volume24h: parseFloat(item.quoteVolume || '0'),
                lastUpdated: now,
              };
            }
          }
          return result;
        }
      }
    } catch (futuresErr) {
      // محاولة بديلة عبر Spot API قبل إعلان انقطاع الاتصال
    }

    // 3. محاولة بديلة عبر Binance Spot API
    try {
      const spotRes = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
        signal: AbortSignal.timeout(3000)
      });
      if (spotRes.ok) {
        const data = await spotRes.json();
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            const price = parseFloat(item.lastPrice);
            if (price > 0) {
              result[item.symbol] = {
                symbol: item.symbol,
                price,
                change24h: parseFloat(item.priceChangePercent || '0'),
                high24h: parseFloat(item.highPrice || '0'),
                low24h: parseFloat(item.lowPrice || '0'),
                volume24h: parseFloat(item.quoteVolume || '0'),
                lastUpdated: now,
              };
            }
          }
          return result;
        }
      }
    } catch (spotErr) {
      // فشل الاتصال بكلا المصدرين
    }

    // تنبيه حاسم: عدم توليد أي بيانات وهمية أو تحريك عشوائي في حال انقطاع الإنترنت!
    throw new Error('BINANCE_CONNECTION_DISCONNECTED');
  },

  getAllTickers(): Promise<{ [symbol: string]: TickerData }> {
    return this.fetchLivePrices();
  },

  getCandles(symbol: string, timeframe: Timeframe, limit: number = 220): Promise<Candle[]> {
    return this.fetchKlines(symbol, timeframe, limit);
  },

  /**
   * جلب الشموع الحقيقية فقط
   * حظر تام لتوليد شموع وهمية عند انقطاع الاتصال
   */
  async fetchKlines(symbol: string, timeframe: Timeframe, limit: number = 220): Promise<Candle[]> {
    const tfMap: { [key in Timeframe]: string } = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };

    const interval = tfMap[timeframe] || '15m';

    // 1. تجربة جلب الشموع عبر البروكسي الداخلي أولاً
    try {
      const proxyUrl = `/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&marketType=USDT_M_FUTURES`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((c: any) => ({
            timestamp: Number(c[0]),
            openTime: Number(c[0]),
            closeTime: Number(c[6]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5]),
            isClosed: Date.now() >= Number(c[6]),
            dataSource: 'REAL_MARKET'
          }));
        }
      }
    } catch (_) {}

    // 2. تجربة جلب شموع الفيوتشرز مباشرة
    try {
      const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((c: any) => ({
            timestamp: Number(c[0]),
            openTime: Number(c[0]),
            closeTime: Number(c[6]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5]),
            isClosed: Date.now() >= Number(c[6]),
            dataSource: 'REAL_MARKET'
          }));
        }
      }
    } catch (fErr) {
      // تجربة Spot API
    }

    // 3. تجربة جلب شموع Spot
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((c: any) => ({
            timestamp: Number(c[0]),
            openTime: Number(c[0]),
            closeTime: Number(c[6]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5]),
            isClosed: Date.now() >= Number(c[6]),
            dataSource: 'REAL_MARKET'
          }));
        }
      }
    } catch (sErr) {
      // فشل الاتصال
    }

    // حظر توليد أي شموع وهمية — إرجاع مصفوفة فارغة وإلقاء خطأ الانقطاع
    throw new Error(`KLINES_DISCONNECTED: فشل جلب الشموع الحقيقية لـ ${symbol} بسبب انقطاع الاتصال`);
  },

  /**
   * فحص الاتصال بالإنترنت وبخوادم بينانس
   */
  async ping(): Promise<boolean> {
    try {
      const pRes = await fetch('/api/binance/ping', { signal: AbortSignal.timeout(2500) });
      if (pRes.ok) return true;
    } catch (_) {}

    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/ping', {
        signal: AbortSignal.timeout(2000)
      });
      return res.ok;
    } catch {
      try {
        const res2 = await fetch('https://api.binance.com/api/v3/ping', {
          signal: AbortSignal.timeout(2000)
        });
        return res2.ok;
      } catch {
        return false;
      }
    }
  }
};
