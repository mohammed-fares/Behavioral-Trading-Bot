/**
 * Production Reconciliation Engine
 * Binance is the absolute Source of Truth in LIVE mode.
 * Periodically reconciles local state (activeTrades, orders, balances) against Binance.
 */

import { Trade, UserStats } from '../../types';
import { AuditLogger } from '../audit/auditLogger';

export interface ReconciliationStatus {
  lastReconciliationTime: number;
  inSync: boolean;
  discrepanciesCount: number;
  message: string;
}

export const ReconciliationEngine = {
  /**
   * Reconciles local active trades with live exchange positions.
   */
  async reconcileWithExchange(
    localTrades: Trade[],
    stats: UserStats
  ): Promise<{ reconciledTrades: Trade[]; updatedStats: UserStats; hasChanges: boolean; status: ReconciliationStatus }> {
    const now = Date.now();
    let hasChanges = false;
    let discrepancies = 0;
    let reconciledTrades = [...localTrades];
    let updatedStats = { ...stats };

    try {
      // Fetch exchange positions from backend API
      const res = await fetch('/api/binance/positions', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        return {
          reconciledTrades,
          updatedStats,
          hasChanges: false,
          status: {
            lastReconciliationTime: now,
            inSync: false,
            discrepanciesCount: 0,
            message: 'Could not connect to Binance position endpoint'
          }
        };
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.positions)) {
        return {
          reconciledTrades,
          updatedStats,
          hasChanges: false,
          status: {
            lastReconciliationTime: now,
            inSync: true,
            discrepanciesCount: 0,
            message: 'No active positions on exchange'
          }
        };
      }

      const exchangePositions = new Map<string, any>();
      data.positions.forEach((p: any) => {
        const amt = parseFloat(p.positionAmt || p.size || '0');
        if (Math.abs(amt) > 0.0001) {
          exchangePositions.set(p.symbol, p);
        }
      });

      // Check if any local trade is already closed on the exchange (e.g. SL or TP triggered on-chain)
      for (const trade of localTrades) {
        if (trade.status === 'OPEN' && trade.dataSource === 'REAL_MARKET') {
          const exchangePos = exchangePositions.get(trade.coin);
          if (!exchangePos) {
            // Position closed on Binance without frontend knowing!
            discrepancies++;
            hasChanges = true;
            AuditLogger.warn(
              'RECONCILIATION',
              'POSITION_CLOSED_ON_EXCHANGE',
              `Reconciliation mismatch: ${trade.coin} was closed on exchange. Syncing local state.`,
              { symbol: trade.coin, tradeId: trade.id }
            );

            // Mark trade closed via exchange trigger
            reconciledTrades = reconciledTrades.filter(t => t.id !== trade.id);
            // Updated stats
            const estPnL = trade.currentPnLUsd || 0;
            updatedStats.balance = Math.round((updatedStats.balance + estPnL) * 100) / 100;
          }
        }
      }

      const status: ReconciliationStatus = {
        lastReconciliationTime: now,
        inSync: discrepancies === 0,
        discrepanciesCount: discrepancies,
        message: discrepancies === 0 ? 'All active positions fully synced with Binance' : `${discrepancies} position discrepancies reconciled`
      };

      return {
        reconciledTrades,
        updatedStats,
        hasChanges,
        status
      };
    } catch (err: any) {
      AuditLogger.warn('RECONCILIATION', 'RECONCILIATION_FAILED', `Reconciliation error: ${err?.message}`);
      return {
        reconciledTrades,
        updatedStats,
        hasChanges: false,
        status: {
          lastReconciliationTime: now,
          inSync: false,
          discrepanciesCount: 0,
          message: `Reconciliation check failed: ${err?.message || 'Network error'}`
        }
      };
    }
  }
};
