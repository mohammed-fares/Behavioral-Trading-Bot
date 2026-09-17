import { describe, it, expect } from 'vitest';
import { BehaviorEngine } from '../src/services/behaviorEngine';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from '../src/services/seedData';
import { Trade, PatternStats } from '../src/types';

describe('BehaviorEngine Unit Tests', () => {
  describe('evaluateTimeframeAlignment', () => {
    it('should calculate alignment correctly when timeframes agree', () => {
      const allSignals = [
        { timeframe: '1d' as const, direction: 'UP' as const, confidence: 75, patternTag: 'P1' },
        { timeframe: '4h' as const, direction: 'UP' as const, confidence: 70, patternTag: 'P2' },
        { timeframe: '1h' as const, direction: 'UP' as const, confidence: 80, patternTag: 'P3' },
        { timeframe: '30m' as const, direction: 'UP' as const, confidence: 65, patternTag: 'P4' },
        { timeframe: '15m' as const, direction: 'UP' as const, confidence: 70, patternTag: 'P5' },
        { timeframe: '5m' as const, direction: 'UP' as const, confidence: 60, patternTag: 'P6' },
        { timeframe: '1m' as const, direction: 'SIDEWAYS' as const, confidence: 50, patternTag: 'P7' },
      ];

      const result = BehaviorEngine.evaluateTimeframeAlignment(
        'BTCUSDT',
        '15m',
        65,
        'UP',
        allSignals
      );

      expect(result.isAligned).toBe(true);
      expect(result.supportingCount).toBeGreaterThanOrEqual(5);
      expect(result.opposingCount).toBe(0);
      expect(result.adjustedConfidence).toBeGreaterThan(65);
    });

    it('should penalize opposing higher timeframes', () => {
      const allSignals = [
        { timeframe: '1d' as const, direction: 'DOWN' as const, confidence: 80, patternTag: 'P1' },
        { timeframe: '4h' as const, direction: 'DOWN' as const, confidence: 75, patternTag: 'P2' },
        { timeframe: '1h' as const, direction: 'DOWN' as const, confidence: 70, patternTag: 'P3' },
        { timeframe: '30m' as const, direction: 'UP' as const, confidence: 60, patternTag: 'P4' },
        { timeframe: '15m' as const, direction: 'UP' as const, confidence: 65, patternTag: 'P5' },
        { timeframe: '5m' as const, direction: 'UP' as const, confidence: 60, patternTag: 'P6' },
        { timeframe: '1m' as const, direction: 'UP' as const, confidence: 55, patternTag: 'P7' },
      ];

      const result = BehaviorEngine.evaluateTimeframeAlignment(
        'BTCUSDT',
        '15m',
        65,
        'UP',
        allSignals
      );

      expect(result.opposingCount).toBe(3);
      expect(result.isAligned).toBe(false); // Opposing count >= 3 blocks alignment
    });
  });

  describe('learnFromClosedTrade (Bayesian Update)', () => {
    it('should update existing pattern stats and Bayesian confidence on win', () => {
      const initialPattern: PatternStats = {
        tag: 'SWING-HIGH-REVERSAL',
        coin: 'ETHUSDT',
        timeframe: '15m',
        direction: 'DOWN',
        magnitudePct: 2.1,
        durationMinutes: 45,
        occurrences: 4,
        continuedCount: 3,
        reversedCount: 1,
        sidewaysCount: 0,
        continuationRate: 75,
        reversalRate: 25,
        sidewaysRate: 0,
        avgSubsequentMovePct: 1.5,
        avgSubsequentDuration: 30,
        confidence: 70,
        lastOccurredAt: Date.now() - 50000,
        bestHours: {},
      };

      const closedTrade: Trade = {
        id: 't-1',
        coin: 'ETHUSDT',
        timeframe: '15m',
        direction: 'SHORT',
        entryPrice: 3500,
        currentPrice: 3450,
        exitPrice: 3450,
        quantity: 0.1,
        sizeUsd: 350,
        leverage: 10,
        marginUsd: 35,
        targetPrice: 3430,
        targetPct: 2.0,
        stopLossPrice: 3550,
        stopLossPct: 1.4,
        confidence: 70,
        patternTag: 'SWING-HIGH-REVERSAL',
        supportingTimeframesCount: 5,
        peakPrice: 3500,
        peakPnLPct: 1.5,
        currentPnLUsd: 5.0,
        currentPnLPct: 1.43,
        isTrailingActive: false,
        status: 'CLOSED',
        entryTime: Date.now() - 3600000,
        exitTime: Date.now(),
        expectedDurationMinutes: 60,
        realizedPnLUsd: 5.0,
        realizedPnLPct: 1.43,
        feesPaidUsd: 0.15,
        durationMinutes: 60,
      };

      const result = BehaviorEngine.learnFromClosedTrade(closedTrade, [initialPattern]);
      expect(result.updatedPatterns.length).toBe(1);
      const updated = result.updatedPatterns[0];
      expect(updated.occurrences).toBe(5);
      expect(updated.continuedCount).toBe(4);
      expect(updated.confidence).toBeGreaterThanOrEqual(15);
      expect(result.learnedLesson).toContain('نجاح تام');
    });

    it('should initialize a new pattern with Bayesian prior when not previously recorded', () => {
      const closedTrade: Trade = {
        id: 't-2',
        coin: 'SOLUSDT',
        timeframe: '5m',
        direction: 'LONG',
        entryPrice: 150,
        currentPrice: 153,
        exitPrice: 153,
        quantity: 1,
        sizeUsd: 150,
        leverage: 5,
        marginUsd: 30,
        targetPrice: 153,
        targetPct: 2.0,
        stopLossPrice: 147,
        stopLossPct: 2.0,
        confidence: 72,
        patternTag: 'NEW-BREAKOUT-PATTERN',
        supportingTimeframesCount: 6,
        peakPrice: 153,
        peakPnLPct: 2.0,
        currentPnLUsd: 3.0,
        currentPnLPct: 2.0,
        isTrailingActive: false,
        status: 'CLOSED',
        entryTime: Date.now() - 1800000,
        exitTime: Date.now(),
        expectedDurationMinutes: 30,
        realizedPnLUsd: 3.0,
        realizedPnLPct: 2.0,
        feesPaidUsd: 0.08,
        durationMinutes: 30,
      };

      const result = BehaviorEngine.learnFromClosedTrade(closedTrade, []);
      expect(result.updatedPatterns.length).toBe(1);
      expect(result.updatedPatterns[0].tag).toBe('NEW-BREAKOUT-PATTERN');
      expect(result.updatedPatterns[0].occurrences).toBe(1);
      expect(result.updatedPatterns[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('Cooldown enforcement in makeDecision', () => {
    it('should reject a trade if coin is within settings.cooldownMinutes', () => {
      const now = Date.now();
      const recentClosedTrade: Trade = {
        id: 't-recent',
        coin: 'BTCUSDT',
        timeframe: '15m',
        direction: 'LONG',
        entryPrice: 65000,
        currentPrice: 64500,
        exitPrice: 64500,
        quantity: 0.01,
        sizeUsd: 650,
        leverage: 10,
        marginUsd: 65,
        targetPrice: 66000,
        targetPct: 1.5,
        stopLossPrice: 64500,
        stopLossPct: 0.77,
        confidence: 60,
        patternTag: 'P1',
        supportingTimeframesCount: 4,
        peakPrice: 65000,
        peakPnLPct: 0,
        currentPnLUsd: -5.0,
        currentPnLPct: -0.77,
        isTrailingActive: false,
        status: 'CLOSED',
        entryTime: now - 15 * 60 * 1000,
        exitTime: now - 5 * 60 * 1000, // closed 5 mins ago
        expectedDurationMinutes: 30,
        realizedPnLUsd: -5.0,
        realizedPnLPct: -0.77,
        feesPaidUsd: 0.2,
        durationMinutes: 10,
      };

      const alignment = BehaviorEngine.evaluateTimeframeAlignment('BTCUSDT', '15m', 70, 'UP', []);
      const decision = BehaviorEngine.makeDecision(
        'BTCUSDT',
        '15m',
        null,
        'P-TEST',
        alignment,
        65000,
        [],
        [recentClosedTrade],
        { ...DEFAULT_SETTINGS, cooldownMinutes: 15 },
        DEFAULT_STATS
      );

      expect(decision.status).toBe('REJECTED');
      expect(decision.reasons.some(r => r.includes('Cooldown'))).toBe(true);
    });
  });
});
