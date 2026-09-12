/**
 * Types & Interfaces for Behavioral Bot — بوت التداول السلوكي متعدد الأطر
 */

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export const TIMEFRAMES: { id: Timeframe; label: string; duration: string; usage: string; minutes: number }[] = [
  { id: '1m', label: '1m', duration: 'دقيقة واحدة', usage: 'ضوضاء عالية، Scalping', minutes: 1 },
  { id: '5m', label: '5m', duration: '5 دقائق', usage: 'حركات قصيرة سريعة', minutes: 5 },
  { id: '15m', label: '15m', duration: '15 دقيقة', usage: 'الإطار الأساسي للتحليل', minutes: 15 },
  { id: '30m', label: '30m', duration: '30 دقيقة', usage: 'اتجاه متوسط المدى', minutes: 30 },
  { id: '1h', label: '1h', duration: 'ساعة', usage: 'اتجاه يومي', minutes: 60 },
  { id: '4h', label: '4h', duration: '4 ساعات', usage: 'اتجاه عام أسبوعي', minutes: 240 },
  { id: '1d', label: '1d', duration: 'يوم', usage: 'الاتجاه الماكرو الرئيسي', minutes: 1440 },
];

export const SUPPORTED_COINS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿', basePrice: 65420 },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ', basePrice: 3450 },
  { symbol: 'SOLUSDT', name: 'Solana', icon: '◎', basePrice: 142.5 },
  { symbol: 'BNBUSDT', name: 'BNB', icon: '✦', basePrice: 585.0 },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: '₳', basePrice: 0.485 },
  { symbol: 'XRPUSDT', name: 'Ripple', icon: '✕', basePrice: 0.582 },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'Ð', basePrice: 0.124 },
  { symbol: 'AVAXUSDT', name: 'Avalanche', icon: '▲', basePrice: 28.4 },
];

export type Direction = 'UP' | 'DOWN' | 'SIDEWAYS';
export type OutcomeType = 'CONTINUED' | 'REVERSED' | 'SIDEWAYS';

export type ExecutionMode = 'PAPER' | 'LIVE' | 'SYNTHETIC' | 'BACKTEST';
export type DataSource = 'REAL_MARKET' | 'PAPER_REAL_MARKET' | 'BACKTEST' | 'SYNTHETIC' | 'DEMO_SEED' | 'STALE' | 'DATA_UNAVAILABLE';
export type MarketType = 'SPOT' | 'USDT_M_FUTURES';
export type MarketRegime = 'TREND_UP' | 'TREND_DOWN' | 'RANGE' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';

export type OrderState = 
  | 'SIGNAL'
  | 'RISK_CHECK'
  | 'ORDER_PENDING'
  | 'PARTIALLY_FILLED'
  | 'OPEN'
  | 'PROTECTED'
  | 'EXIT_PENDING'
  | 'CLOSED'
  | 'FAILED'
  | 'RECONCILIATION_REQUIRED';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
  openTime?: number;
  closeTime?: number;
  dataSource?: DataSource;
}

export interface Swing {
  id: string;
  coin: string;
  timeframe: Timeframe;
  startTime: number;
  endTime: number;
  direction: Direction;
  startPrice: number;
  endPrice: number;
  magnitudePct: number;
  durationMinutes: number;
  rsiStart: number;
  rsiEnd: number;
  adxStart: number;
  adxEnd: number;
  patternTag: string; // e.g. P-U-1.5-47-R45-68-A25-35
  outcome?: OutcomeType;
  subsequentMovePct?: number;
  subsequentDurationMinutes?: number;
}

export interface PatternStats {
  tag: string;
  coin: string;
  timeframe: Timeframe;
  direction: Direction;
  magnitudePct: number;
  durationMinutes: number;
  occurrences: number;
  continuedCount: number;
  reversedCount: number;
  sidewaysCount: number;
  continuationRate: number; // e.g. 68%
  reversalRate: number;     // e.g. 21%
  sidewaysRate: number;     // e.g. 11%
  avgSubsequentMovePct: number; // e.g. +0.8%
  avgSubsequentDuration: number; // in mins, e.g. 42
  bestHours: { [hour: number]: { count: number; winRate: number; avgProfit: number } };
  confidence: number; // 0-100%
  lastOccurredAt: number;
  dataSource?: DataSource;
  regime?: MarketRegime;
  sampleSize?: number;
  confidenceInterval?: { lower: number; upper: number };
}

export interface SimilarityBreakdown {
  score: number; // 0 - 100%
  directionMatch: boolean;
  magnitudeDiffPct: number;
  durationDiffMins: number;
  rsiDiff: number;
  adxDiff: number;
  regimeMatch: boolean;
  isEligible: boolean;
}

export interface CalibratedConfidence {
  decisionScore: number;       // raw multi-factor score (0-100)
  historicalWinRate: number;   // from memory occurrences
  calibratedProbability: number; // Platt / Brier calibrated win probability (0-1)
  brierScore?: number;
  sampleSize: number;
  isReliable: boolean;
}

export interface OrderRecord {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
  price: number;
  quantity: number;
  orderedQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  averageFillPrice: number;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  time: number;
  stopOrderId?: string;
  takeProfitOrderId?: string;
  commission: number;
  commissionAsset?: string;
  errorMessage?: string;
  isSimulated: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  component: 'MARKET_DATA' | 'STRATEGY' | 'RISK_ENGINE' | 'ORDER_MANAGER' | 'RECONCILIATION' | 'LEARNING' | 'SYSTEM';
  event: string;
  symbol?: string;
  orderId?: string;
  tradeId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface TimeframeSignal {
  timeframe: Timeframe;
  direction: Direction;
  confidence: number;
  patternTag: string;
  contributionPct: number; // e.g. +5%, +10%, 0%, -10%
  isSupporting: boolean;
  isOpposing: boolean;
  isNeutral: boolean;
}

export interface TimeframeAlignmentResult {
  coin: string;
  baseTimeframe: Timeframe;
  baseConfidence: number;
  adjustedConfidence: number;
  supportingCount: number;
  opposingCount: number;
  neutralCount: number;
  totalTimeframes: number;
  signals: TimeframeSignal[];
  finalDirection: Direction;
  isAligned: boolean; // >= threshold
}

export type DecisionStatus = 'APPROVED' | 'REJECTED' | 'WAIT';

export interface DecisionStepReview {
  name: string;
  passed: boolean;
  detail: string;
  metric?: string;
  threshold?: string;
}

export interface DecisionLog {
  id: string;
  timestamp: number;
  coin: string;
  baseTimeframe: Timeframe;
  direction: Direction;
  status: DecisionStatus;
  patternTag: string;
  initialConfidence: number;
  adjustedConfidence: number;
  finalConfidence: number;
  calibratedConfidence?: CalibratedConfidence;
  similarity?: SimilarityBreakdown;
  dataSource?: DataSource;
  marketRegime?: MarketRegime;
  supportingCount: number;
  opposingCount: number;
  reasons: string[];
  reviewSteps: DecisionStepReview[];
  proposedTrade?: {
    sizeUsd: number;
    targetPct: number;
    stopLossPct: number;
    expectedDurationMins: number;
    entryPrice: number;
    targetPrice: number;
    stopLossPrice: number;
  };
  lessonLearned?: string;
}

export type ExitReason = 'TAKE_PROFIT' | 'STOP_LOSS' | 'SMART_EXIT' | 'PATTERN_CHANGE' | 'TIMEOUT' | 'MANUAL' | 'EMERGENCY_STOP' | 'RECONCILIATION_SYNC';

export interface Trade {
  id: string;
  coin: string;
  direction: 'LONG' | 'SHORT';
  timeframe: Timeframe;
  entryPrice: number;
  currentPrice: number;
  sizeUsd: number;
  quantity?: number;
  leverage: number;
  marginUsd: number;
  targetPrice: number;
  targetPct: number;
  stopLossPrice: number;
  stopLossPct: number;
  patternTag: string;
  confidence: number;
  supportingTimeframesCount: number;
  entryTime: number;
  expectedDurationMinutes: number;
  
  // Execution & Tracking
  dataSource?: DataSource;
  marketType?: MarketType;
  orderState?: OrderState;
  orderId?: string;
  clientOrderId?: string;
  stopOrderId?: string;
  takeProfitOrderId?: string;
  fillPrice?: number;
  feesPaidUsd?: number;
  slippageUsd?: number;
  liquidationPrice?: number;
  
  peakPrice: number;
  peakPnLPct: number;
  currentPnLUsd: number;
  currentPnLPct: number;
  isTrailingActive: boolean;
  trailingStopPrice?: number;
  status: 'OPEN' | 'CLOSED';
  
  // Exit info
  exitPrice?: number;
  exitTime?: number;
  exitReason?: ExitReason;
  realizedPnLUsd?: number;
  realizedPnLPct?: number;
  durationMinutes?: number;
  learnedLesson?: string;
}

export interface StrategySettings {
  strategyMode: 'SCALPING' | 'DAY_TRADING' | 'POSITION' | 'AUTO';
  tradingExecutionMode: ExecutionMode;
  marketType: MarketType;
  apiKey?: string;
  apiSecret?: string;
  isApiConnected?: boolean;
  autoTradingEnabled: boolean;
  autoOptimizeRisk: boolean;
  riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  userDefinedCapital?: number;
  enabledTimeframes: Timeframe[];
  minOccurrences: number;      // e.g. 20
  minConfidence: number;       // e.g. 65%
  minSimilarityPct: number;    // e.g. 85%
  minMovementPct: number;      // e.g. 0.5%
  minMagnitudePct?: number;     // alias for minMovementPct
  maxPatternAgeDays: number;   // e.g. 90
  minSupportingFrames: number; // e.g. 4
  optimalSupportingFrames: number; // e.g. 5
  maxOpposingAllowed: number;  // e.g. 3 (4+ triggers reject)
  positionSizePct: number;     // e.g. 2% of capital
  maxConcurrentTrades: number; // e.g. 5
  dailyLossLimitPct: number;   // e.g. 3%
  maxConsecutiveLosses: number;// e.g. 3
  cooldownMinutes?: number;    // e.g. 15
  stopLossPct: number;         // e.g. 1.5%
  takeProfitPct: number;       // e.g. 2.5%
  smartExitRetracementPct: number; // e.g. 25% from peak
  smartExitThresholdPct: number;   // e.g. 50% of target reached
  leverage: number;            // e.g. 10x
  useRealBinanceApi: boolean;
  simulationSpeed: 'REALTIME' | 'FAST_5X' | 'INSTANT';

  // Hourly Auto-Reporting & Anti-Mistake Protection
  hourlyReportAutoExport: boolean;
  hourlyReportIntervalMinutes: number; // default 60 (or 5 for rapid test)
  avoidPastFailedPatterns: boolean;    // default true: strictly avoid repeating past failed strategies/patterns
  failedPatternCoolingHours?: number;  // default 24
  maxSpreadPct?: number;               // default 0.05%
  maxDataAgeSeconds?: number;          // default 15s
}

export interface BacktestResult {
  runId: string;
  symbol: string;
  timeframe: Timeframe;
  startTime: number;
  endTime: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  expectancyUsd: number;
  averageWinUsd: number;
  averageLossUsd: number;
  totalFeesUsd: number;
  slippagePaidUsd: number;
  buyAndHoldReturnPct: number;
  trades: Trade[];
}

export interface HealthStatus {
  backend: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  binanceApi: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  marketData: 'REAL_MARKET' | 'STALE' | 'SYNTHETIC' | 'UNAVAILABLE';
  riskEngine: 'OK' | 'PAUSED' | 'BLOCKED';
  orderManager: 'READY' | 'RECONCILING' | 'ERROR';
  reconciliation: 'SYNCED' | 'MISMATCH_DETECTED' | 'INACTIVE';
  lastServerTimeSync: number;
  clockSkewMs: number;
}

export interface DisqualifiedPattern {
  id: string;
  patternTag: string;
  coin: string;
  timeframe: Timeframe;
  direction: Direction;
  failedTradeId: string;
  lossUsd: number;
  reason: string;
  timestamp: number;
  coolingUntil: number; // timestamp until when this pattern is barred
  lesson: string;
}

export interface HourlyReport {
  id: string;
  hourTimestamp: number;
  formattedTime: string; // e.g. "2026-09-11 12:00:00"
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netPnLUsd: number;
  roiPct: number;
  capitalAtHour: number;
  decisionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  executedTrades: Trade[];
  keyLessonsLearned: string[];
  disqualifiedPatternsRecorded: number;
  summaryText: string;
  autoExportedAt?: number;
}

export interface UserStats {
  balance: number;
  initialBalance: number;
  equity: number;
  realizedPnL: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  consecutiveLosses: number;
  todayLossUsd: number;
}
