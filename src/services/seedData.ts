/**
 * Behavioral Bot - Default Initial Configurations
 * Pure zero-state configurations with zero mock/fake data
 */

import { 
  PatternStats, 
  Swing, 
  Trade, 
  DecisionLog, 
  StrategySettings, 
  UserStats, 
  HourlyReport, 
  DisqualifiedPattern 
} from '../types';

export const DEFAULT_SETTINGS: StrategySettings = {
  strategyMode: 'DAY_TRADING',
  tradingExecutionMode: 'PAPER',
  marketType: 'USDT_M_FUTURES',
  apiKey: '',
  apiSecret: '',
  isApiConnected: false,
  autoTradingEnabled: true,
  autoOptimizeRisk: true,
  riskProfile: 'MODERATE',
  userDefinedCapital: 100,
  enabledTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
  minOccurrences: 3,
  minConfidence: 55,
  minSimilarityPct: 70,
  minMovementPct: 0.4,
  maxPatternAgeDays: 90,
  minSupportingFrames: 3,
  optimalSupportingFrames: 4,
  maxOpposingAllowed: 2,
  positionSizePct: 2,
  maxConcurrentTrades: 5,
  dailyLossLimitPct: 3,
  maxConsecutiveLosses: 3,
  cooldownMinutes: 15,
  stopLossPct: 1.5,
  takeProfitPct: 2.5,
  smartExitRetracementPct: 25,
  smartExitThresholdPct: 50,
  leverage: 10,
  useRealBinanceApi: false,
  simulationSpeed: 'REALTIME',
  hourlyReportAutoExport: true,
  hourlyReportIntervalMinutes: 60,
  avoidPastFailedPatterns: true,
  failedPatternCoolingHours: 24,
  maxSpreadPct: 0.08,
  maxDataAgeSeconds: 15,
};

export const DEFAULT_STATS: UserStats = {
  balance: 100,
  initialBalance: 100,
  equity: 100,
  realizedPnL: 0,
  winCount: 0,
  lossCount: 0,
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  maxDrawdownPct: 0,
  consecutiveLosses: 0,
  todayLossUsd: 0,
};

export const DEFAULT_LIVE_STATS: UserStats = {
  balance: 100,
  initialBalance: 100,
  equity: 100,
  realizedPnL: 0,
  winCount: 0,
  lossCount: 0,
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  maxDrawdownPct: 0,
  consecutiveLosses: 0,
  todayLossUsd: 0,
};

export function generateSeedPatterns(): PatternStats[] {
  return [];
}

export function generateSeedSwings(): Swing[] {
  return [];
}

export function generateSeedTrades(): Trade[] {
  return [];
}

export function generateSeedDecisions(): DecisionLog[] {
  return [];
}

export function generateSeedDisqualifiedPatterns(): DisqualifiedPattern[] {
  return [];
}

export function generateSeedHourlyReports(): HourlyReport[] {
  return [];
}
