import { UserStats, StrategySettings } from '../../types';

export function createCleanStats(startingCapital: number = 100): UserStats {
  return {
    balance: startingCapital,
    initialBalance: startingCapital,
    equity: startingCapital,
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
}

export function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}
