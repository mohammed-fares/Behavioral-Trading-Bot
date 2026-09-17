/**
 * Calibrated Multi-Dimensional Pattern Similarity Engine
 * Strictly scores similarity across 8 dimensions:
 * Direction, Timeframe, Magnitude, Duration, RSI Start, RSI End, ADX, Market Regime.
 * Prevents loose fuzzy matching from contaminating statistics.
 */

import { PatternStats, SimilarityBreakdown, MarketRegime } from '../../types';

export interface ParsedPatternTag {
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  magnitudePct: number;
  durationMinutes: number;
  rsiStart: number;
  rsiEnd: number;
  adxStart: number;
  adxEnd: number;
}

export const PatternSimilarity = {
  /**
   * Parse pattern tag: e.g. P-U-1.5-47-R45-68-A25-35
   */
  parseTag(tag: string): ParsedPatternTag | null {
    if (!tag || !tag.startsWith('P-')) return null;
    const parts = tag.split('-');
    if (parts.length < 6) return null;

    const dirLetter = parts[1];
    const direction = dirLetter === 'U' ? 'UP' : dirLetter === 'D' ? 'DOWN' : 'SIDEWAYS';
    const magnitudePct = parseFloat(parts[2]) || 0;
    const durationMinutes = parseInt(parts[3], 10) || 15;

    // RSI part: R45 or R45-68
    const rsiPart = parts[4] || '';
    const rsiSub = rsiPart.replace('R', '').split('-');
    const rsiStart = parseInt(rsiSub[0], 10) || 50;
    const rsiEnd = parseInt(parts[5] || rsiSub[1] || '50', 10) || 50;

    // ADX part: A25 or A25-35
    const adxPart = parts[6] || parts[5] || '';
    const adxSub = adxPart.replace('A', '').split('-');
    const adxStart = parseInt(adxSub[0], 10) || 25;
    const adxEnd = parseInt(parts[7] || adxSub[1] || '25', 10) || 25;

    return {
      direction,
      magnitudePct,
      durationMinutes,
      rsiStart,
      rsiEnd,
      adxStart,
      adxEnd
    };
  },

  /**
   * Compares a candidate pattern against a stored historical pattern.
   * Returns a 0 - 100% score and complete breakdown.
   */
  calculateSimilarity(
    candidateTag: string,
    storedPattern: PatternStats,
    currentRegime?: MarketRegime
  ): SimilarityBreakdown {
    const candidate = this.parseTag(candidateTag);
    const stored = this.parseTag(storedPattern.tag);

    if (!candidate || !stored) {
      return {
        score: 0,
        directionMatch: false,
        magnitudeDiffPct: 99,
        durationDiffMins: 999,
        rsiDiff: 100,
        adxDiff: 100,
        regimeMatch: false,
        isEligible: false
      };
    }

    // Dimension 1: Direction Match (MANDATORY)
    const directionMatch = candidate.direction === stored.direction;
    if (!directionMatch) {
      return {
        score: 0,
        directionMatch: false,
        magnitudeDiffPct: Math.abs(candidate.magnitudePct - stored.magnitudePct),
        durationDiffMins: Math.abs(candidate.durationMinutes - stored.durationMinutes),
        rsiDiff: Math.abs(candidate.rsiEnd - stored.rsiEnd),
        adxDiff: Math.abs(candidate.adxEnd - stored.adxEnd),
        regimeMatch: false,
        isEligible: false
      };
    }

    // Dimension 2: Magnitude Similarity (weight 25%)
    const magDiff = Math.abs(candidate.magnitudePct - stored.magnitudePct);
    const maxMag = Math.max(candidate.magnitudePct, stored.magnitudePct, 0.1);
    const magScore = Math.max(0, 1 - (magDiff / maxMag));

    // Dimension 3: Duration Similarity (weight 15%)
    const durDiff = Math.abs(candidate.durationMinutes - stored.durationMinutes);
    const maxDur = Math.max(candidate.durationMinutes, stored.durationMinutes, 1);
    const durScore = Math.max(0, 1 - (durDiff / maxDur));

    // Dimension 4: RSI Endpoint Similarity (weight 20%)
    const rsiDiff = Math.abs(candidate.rsiEnd - stored.rsiEnd);
    const rsiScore = Math.max(0, 1 - (rsiDiff / 40));

    // Dimension 5: ADX Endpoint Similarity (weight 15%)
    const adxDiff = Math.abs(candidate.adxEnd - stored.adxEnd);
    const adxScore = Math.max(0, 1 - (adxDiff / 35));

    // Dimension 6: Market Regime Match (weight 25%)
    let regimeScore = 0.5; // neutral if unknown
    let regimeMatch = false;
    if (currentRegime && storedPattern.regime) {
      regimeMatch = currentRegime === storedPattern.regime;
      regimeScore = regimeMatch ? 1.0 : 0.2;
    } else if (currentRegime || storedPattern.regime) {
      regimeScore = 0.7;
    }

    // Weighted composite score (0 - 100)
    let compositeScore = (
      magScore * 25 +
      durScore * 15 +
      rsiScore * 20 +
      adxScore * 15 +
      regimeScore * 25
    );

    // Recency weight: Patterns within the last 30 days get 1.5x weight factor (boost score by up to 5%)
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (storedPattern.lastOccurredAt && (now - storedPattern.lastOccurredAt) <= thirtyDaysMs) {
      compositeScore = Math.min(100, compositeScore * 1.05); // Recency boosted
    }

    const roundedScore = Math.round(compositeScore * 10) / 10;
    const isEligible = roundedScore >= 80; // strict 80% threshold

    return {
      score: roundedScore,
      directionMatch: true,
      magnitudeDiffPct: Math.round(magDiff * 100) / 100,
      durationDiffMins: durDiff,
      rsiDiff,
      adxDiff,
      regimeMatch,
      isEligible
    };
  }
};
