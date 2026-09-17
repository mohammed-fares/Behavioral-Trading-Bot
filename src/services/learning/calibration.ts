/**
 * Probability Calibration & Statistical Confidence Engine
 * Distinguishes Decision Score, Historical Win Rate, and Calibrated Win Probability.
 * Implements Wilson Score Interval to prevent overfitting on small samples.
 */

import { CalibratedConfidence } from '../../types';

export function wilsonScore(wins: number, total: number, confidence: number = 0.95): number {
  if (total === 0) return 0;
  const z = confidence === 0.99 ? 2.576 : 1.96; // default 95% confidence
  const phat = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = phat + (z * z) / (2 * total);
  const spread = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
  return Math.max(0, Math.min(100, ((center - spread) / denominator) * 100));
}

export const ProbabilityCalibration = {
  /**
   * Calculates Wilson Score lower and upper bounds for a proportion (win rate).
   * z = 1.96 for 95% confidence interval.
   */
  calculateWilsonInterval(successes: number, total: number, z: number = 1.96): { lower: number; upper: number } {
    if (total <= 0) return { lower: 0, upper: 0 };
    const p = successes / total;
    const denominator = 1 + (z * z) / total;
    const centreAdjusted = p + (z * z) / (2 * total);
    const rad = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);

    const lower = Math.max(0, (centreAdjusted - rad) / denominator);
    const upper = Math.min(1, (centreAdjusted + rad) / denominator);

    return {
      lower: Math.round(lower * 1000) / 10,
      upper: Math.round(upper * 1000) / 10
    };
  },

  /**
   * Calibrates raw decision score and historical frequency into honest probability metrics.
   */
  calibrate(
    rawDecisionScore: number,
    occurrences: number,
    wins: number
  ): CalibratedConfidence {
    const historicalWinRate = occurrences > 0 ? (wins / occurrences) * 100 : 50;

    // Reliability requires minimum N >= 20
    const isReliable = occurrences >= 20;

    // Empirical shrinkage towards prior mean (50%) when sample size is small
    // Laplace smoothing / shrinkage factor: alpha = N / (N + 15)
    const shrinkage = occurrences / (occurrences + 15);
    const shrunkenWinRate = shrinkage * (historicalWinRate / 100) + (1 - shrinkage) * 0.50;

    // Decision score contribution (60% shrunken empirical win rate + 40% decision score)
    const calibratedProb = (shrunkenWinRate * 0.65) + ((rawDecisionScore / 100) * 0.35);

    // Brier score approximation: (prob - outcome)^2
    // For general calibration estimate:
    const brierEstimate = Math.round(Math.pow(calibratedProb - (historicalWinRate / 100), 2) * 1000) / 1000;

    return {
      decisionScore: Math.round(rawDecisionScore),
      historicalWinRate: Math.round(historicalWinRate * 10) / 10,
      calibratedProbability: Math.round(Math.min(0.95, Math.max(0.1, calibratedProb)) * 100) / 100,
      brierScore: brierEstimate,
      sampleSize: occurrences,
      isReliable
    };
  }
};
