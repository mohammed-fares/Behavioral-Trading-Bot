import { 
  Timeframe, 
  Direction, 
  Candle, 
  Swing, 
  PatternStats, 
  TIMEFRAMES 
} from '../../types';
import { TechnicalRSI } from '../math/rsi';
import { TechnicalADX } from '../math/adx';

/**
 * Quantize magnitude to clean behavioral buckets matching historical miner
 */
export function bucketMagnitude(pct: number): number {
  if (pct < 0.8) return 0.5;
  if (pct < 1.3) return 1.0;
  if (pct < 1.8) return 1.5;
  if (pct < 2.3) return 2.0;
  if (pct < 2.8) return 2.5;
  if (pct < 3.5) return 3.0;
  if (pct < 4.5) return 4.0;
  return 5.0;
}

/**
 * Quantize duration in minutes matching historical miner
 */
export function bucketDuration(mins: number): number {
  if (mins <= 20) return 15;
  if (mins <= 35) return 30;
  if (mins <= 50) return 45;
  if (mins <= 75) return 60;
  if (mins <= 105) return 90;
  if (mins <= 150) return 120;
  if (mins <= 210) return 180;
  if (mins <= 300) return 240;
  if (mins <= 420) return 360;
  if (mins <= 800) return 720;
  return 1440;
}

/**
 * Quantize RSI to range bucket matching historical miner
 */
export function bucketRSI(rsiStart: number, rsiEnd: number): string {
  const round10 = (v: number) => Math.max(10, Math.min(90, Math.round(v / 10) * 10));
  const s = round10(rsiStart);
  const e = round10(rsiEnd);
  return `R${Math.min(s, e)}-${Math.max(s, e)}`;
}

/**
 * Quantize ADX to range bucket matching historical miner
 */
export function bucketADX(adxStart: number, adxEnd: number): string {
  const round10 = (v: number) => Math.max(10, Math.min(60, Math.round(v / 10) * 10));
  const s = round10(adxStart);
  const e = round10(adxEnd);
  return `A${Math.min(s, e)}-${Math.max(s, e)}`;
}

export function calculateRSI(closes: number[], period: number = 14): number {
  if (!closes || closes.length === 0) return 50;
  const windowCloses = closes.length > period + 1 ? closes.slice(-(period + 1)) : closes;
  return TechnicalRSI.calculate(windowCloses, period);
}

export function calculateADX(candles: Candle[], period: number = 14): number {
  if (!candles || candles.length === 0) return 25;
  const minLen = period * 2;
  const windowCandles = candles.length > minLen ? candles.slice(-minLen) : candles;
  return TechnicalADX.calculate(windowCandles, period).adx;
}

export function hasVolumeConfirmation(candles: Candle[], multiplier: number = 1.5): boolean {
  if (!candles || candles.length < 20) return false;
  const recentCandles = candles.slice(-20);
  const avgVolume = recentCandles.reduce((s, c) => s + c.volume, 0) / 20;
  const lastVolume = candles[candles.length - 1].volume;
  return lastVolume > avgVolume * multiplier;
}

export function detectSwingAndPattern(
  coin: string, 
  timeframe: Timeframe, 
  candles: Candle[],
  minMovementPct: number = 0.4
): { swing: Swing; patternTag: string } | null {
  if (candles.length < 15) return null;

  // Look at recent swing window (last 10 to 30 candles)
  const lookback = Math.min(25, candles.length - 2);
  const window = candles.slice(-lookback);
  const startCandle = window[0];
  const endCandle = window[window.length - 1];

  const changePct = Number((((endCandle.close - startCandle.open) / startCandle.open) * 100).toFixed(1));
  const absChange = Math.abs(changePct);
  
  let direction: Direction = 'SIDEWAYS';
  if (absChange >= minMovementPct) {
    direction = changePct > 0 ? 'UP' : 'DOWN';
  } else {
    direction = 'SIDEWAYS';
  }

  // Time calculation
  const tfInfo = TIMEFRAMES.find(t => t.id === timeframe);
  const stepMins = tfInfo ? tfInfo.minutes : 15;
  const durationMinutes = window.length * stepMins;

  // RSI calculation start vs end over 14 candles
  const midIdx = Math.max(15, candles.length - Math.floor(window.length / 2));
  const closesEarly = candles.slice(0, midIdx).map(c => c.close);
  const closesLate = candles.map(c => c.close);
  const rsiStart = calculateRSI(closesEarly, 14);
  const rsiEnd = calculateRSI(closesLate, 14);

  // ADX calculation over 14 candles
  const adxStart = calculateADX(candles.slice(0, -14), 14);
  const adxEnd = calculateADX(candles, 14);

  // Quantized behavioral tag matching historical pattern miner
  const bMag = bucketMagnitude(absChange);
  const bDur = bucketDuration(durationMinutes);
  const bRSI = bucketRSI(rsiStart, rsiEnd);
  const bADX = bucketADX(adxStart, adxEnd);
  const dirLetter = direction === 'UP' ? 'U' : direction === 'DOWN' ? 'D' : 'S';
  const patternTag = `P-${dirLetter}-${bMag}-${bDur}-${bRSI}-${bADX}`;

  const swing: Swing = {
    id: `sw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    coin,
    timeframe,
    startTime: startCandle.timestamp,
    endTime: endCandle.timestamp,
    direction,
    startPrice: startCandle.open,
    endPrice: endCandle.close,
    magnitudePct: absChange,
    durationMinutes,
    rsiStart,
    rsiEnd,
    adxStart,
    adxEnd,
    patternTag,
  };

  return { swing, patternTag };
}

export function findPatternStats(patternTag: string, memoryPatterns: PatternStats[], targetCoin?: string): PatternStats | null {
  if (!memoryPatterns || memoryPatterns.length === 0) return null;

  // 1. Exact match with same coin priority
  if (targetCoin) {
    const exactCoin = memoryPatterns.find(p => p.tag === patternTag && p.coin === targetCoin);
    if (exactCoin) return exactCoin;
  }
  const exact = memoryPatterns.find(p => p.tag === patternTag);
  if (exact) return exact;

  // 2. Multi-dimensional fuzzy match
  const parts = patternTag.split('-');
  if (parts.length >= 4) {
    const dir = parts[1];
    const mag = parseFloat(parts[2]) || 1.0;
    const dur = parseFloat(parts[3]) || 60;

    // Filter by same direction first
    const poolWithCoin = targetCoin ? memoryPatterns.filter(p => p.coin === targetCoin && p.tag.split('-')[1] === dir) : [];
    const pool = poolWithCoin.length > 0 ? poolWithCoin : memoryPatterns.filter(p => p.tag.split('-')[1] === dir);

    if (pool.length > 0) {
      // Find candidate with lowest distance in magnitude and duration
      const sorted = [...pool].sort((a, b) => {
        const aParts = a.tag.split('-');
        const bParts = b.tag.split('-');
        const aMag = parseFloat(aParts[2]) || 1.0;
        const bMag = parseFloat(bParts[2]) || 1.0;
        const aDur = parseFloat(aParts[3]) || 60;
        const bDur = parseFloat(bParts[3]) || 60;

        const distA = Math.abs(aMag - mag) * 2 + Math.abs(aDur - dur) / 60;
        const distB = Math.abs(bMag - mag) * 2 + Math.abs(bDur - dur) / 60;
        return distA - distB;
      });

      const best = sorted[0];
      const bestMag = parseFloat(best.tag.split('-')[2]) || 1.0;
      if (Math.abs(bestMag - mag) <= 1.5) {
        return best;
      }
    }
  }

  return null;
}
