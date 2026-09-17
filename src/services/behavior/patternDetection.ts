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
  minMovementPct: number = 0.5
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

  const dirLetter = direction === 'UP' ? 'U' : direction === 'DOWN' ? 'D' : 'S';
  const patternTag = `P-${dirLetter}-${absChange}-${durationMinutes}-R${rsiStart}-${rsiEnd}-A${adxStart}-${adxEnd}`;

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

export function findPatternStats(patternTag: string, memoryPatterns: PatternStats[]): PatternStats | null {
  // 1. Exact match
  const exact = memoryPatterns.find(p => p.tag === patternTag);
  if (exact) return exact;

  // 2. Fuzzy match by Direction + Magnitude range (within 0.4%) + RSI bucket
  const parts = patternTag.split('-');
  if (parts.length >= 6) {
    const dir = parts[1];
    const mag = parseFloat(parts[2]);
    const similar = memoryPatterns.find(p => {
      const pParts = p.tag.split('-');
      if (pParts.length >= 6 && pParts[1] === dir) {
        const pMag = parseFloat(pParts[2]);
        return Math.abs(pMag - mag) <= 0.4;
      }
      return false;
    });
    if (similar) return similar;
  }

  return null;
}
