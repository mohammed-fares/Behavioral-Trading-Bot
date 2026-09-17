import { UserStats, StrategySettings, Trade, PatternStats, Swing, DecisionLog, HourlyReport, DisqualifiedPattern } from '../../types';
import { createCleanStats } from './storageReset';

export interface CleanSlateOptions {
  wipeTradeHistory?: boolean;
  wipeDecisions?: boolean;
  wipeDisqualified?: boolean;
  mode?: 'PAPER' | 'LIVE';
}

export function performCleanSlate(
  startingCapital: number,
  options: CleanSlateOptions,
  storage: {
    saveTrades: (trades: Trade[]) => void;
    saveActiveTrades: (trades: Trade[]) => void;
    saveDecisions: (decisions: DecisionLog[]) => void;
    saveDisqualifiedPatterns: (patterns: DisqualifiedPattern[]) => void;
    saveStats: (stats: UserStats) => void;
    getSettings: () => StrategySettings;
    saveSettings: (settings: StrategySettings) => void;
    debounceSync: (payload: any) => void;
  }
): UserStats {
  const { wipeTradeHistory = true, wipeDecisions = true, wipeDisqualified = true, mode = 'PAPER' } = options;

  if (wipeTradeHistory) {
    storage.saveTrades([]);
  } else {
    storage.saveActiveTrades([]);
  }

  if (wipeDecisions) {
    storage.saveDecisions([]);
  }

  if (wipeDisqualified) {
    storage.saveDisqualifiedPatterns([]);
  }

  const cleanStats = createCleanStats(startingCapital);
  storage.saveStats(cleanStats);

  const curSettings = storage.getSettings();
  storage.saveSettings({
    ...curSettings,
    userDefinedCapital: startingCapital,
    tradingExecutionMode: mode,
    autoTradingEnabled: true,
  });

  storage.debounceSync({
    trades: [],
    decisions: [],
    stats: cleanStats,
    disqualifiedPatterns: []
  });

  return cleanStats;
}

export function calculateDatabaseStats(data: {
  trades: Trade[];
  patterns: PatternStats[];
  swings: Swing[];
  decisions: DecisionLog[];
  hourlyReports: HourlyReport[];
  disqualified: DisqualifiedPattern[];
}) {
  const active = data.trades.filter(t => t.status === 'OPEN');
  const closed = data.trades.filter(t => t.status === 'CLOSED');

  return {
    totalTradesCount: data.trades.length,
    activeTradesCount: active.length,
    closedTradesCount: closed.length,
    patternsCount: data.patterns.length,
    swingsCount: data.swings.length,
    decisionsCount: data.decisions.length,
    hourlyReportsCount: data.hourlyReports.length,
    disqualifiedCount: data.disqualified.length,
    lastSyncTime: Date.now(),
    estimatedKb: 12,
  };
}
