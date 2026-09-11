/**
 * Storage Service — إدارة الذاكرة المحلية المستمرة في المتصفح
 * بدون الحاجة لخوادم خارجية: كل شيء يُحفظ محلياً في localStorage مع خيار التصدير والاستيراد
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
import { 
  DEFAULT_SETTINGS, 
  DEFAULT_STATS, 
  generateSeedPatterns, 
  generateSeedSwings, 
  generateSeedTrades, 
  generateSeedDecisions,
  generateSeedHourlyReports,
  generateSeedDisqualifiedPatterns 
} from './seedData';

const KEYS = {
  PATTERNS: 'behavioral_bot_patterns_v1',
  SWINGS: 'behavioral_bot_swings_v1',
  TRADES: 'behavioral_bot_trades_v1',
  DECISIONS: 'behavioral_bot_decisions_v1',
  SETTINGS: 'behavioral_bot_settings_v1',
  STATS: 'behavioral_bot_stats_v1',
  HOURLY_REPORTS: 'behavioral_bot_hourly_reports_v1',
  DISQUALIFIED: 'behavioral_bot_disqualified_v1',
  LAST_SYNC: 'behavioral_bot_last_sync_v1',
};

export const StorageService = {
  getPatterns(): PatternStats[] {
    try {
      const data = localStorage.getItem(KEYS.PATTERNS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load patterns from storage:', e);
    }
    const seed = generateSeedPatterns();
    this.savePatterns(seed);
    return seed;
  },

  savePatterns(patterns: PatternStats[]) {
    try {
      localStorage.setItem(KEYS.PATTERNS, JSON.stringify(patterns));
    } catch (e) {
      console.error('Failed to save patterns to storage:', e);
    }
  },

  getSwings(): Swing[] {
    try {
      const data = localStorage.getItem(KEYS.SWINGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load swings from storage:', e);
    }
    const seed = generateSeedSwings();
    this.saveSwings(seed);
    return seed;
  },

  saveSwings(swings: Swing[]) {
    try {
      localStorage.setItem(KEYS.SWINGS, JSON.stringify(swings));
    } catch (e) {
      console.error('Failed to save swings to storage:', e);
    }
  },

  deduplicateById<T extends { id?: string }>(items: T[]): T[] {
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
  },

  deduplicateTrades(trades: Trade[]): Trade[] {
    const seen = new Set<string>();
    const result: Trade[] = [];
    for (const trade of trades) {
      if (!trade || !trade.id) continue;
      if (!seen.has(trade.id)) {
        seen.add(trade.id);
        result.push(trade);
      }
    }
    return result;
  },

  getTrades(): Trade[] {
    try {
      const data = localStorage.getItem(KEYS.TRADES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicateTrades(parsed);
          if (deduped.length !== parsed.length) {
            this.saveTrades(deduped);
          }
          return deduped;
        }
      }
    } catch (e) {
      console.error('Failed to load trades from storage:', e);
    }
    const seed = this.deduplicateTrades(generateSeedTrades());
    this.saveTrades(seed);
    return seed;
  },

  saveTrades(trades: Trade[]) {
    try {
      const deduped = this.deduplicateTrades(trades);
      localStorage.setItem(KEYS.TRADES, JSON.stringify(deduped));
    } catch (e) {
      console.error('Failed to save trades to storage:', e);
    }
  },

  getDecisions(): DecisionLog[] {
    try {
      const data = localStorage.getItem(KEYS.DECISIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicateById(parsed);
          if (deduped.length !== parsed.length) {
            this.saveDecisions(deduped);
          }
          return deduped;
        }
      }
    } catch (e) {
      console.error('Failed to load decisions from storage:', e);
    }
    const seed = this.deduplicateById(generateSeedDecisions());
    this.saveDecisions(seed);
    return seed;
  },

  saveDecisions(decisions: DecisionLog[]) {
    try {
      const deduped = this.deduplicateById(decisions);
      localStorage.setItem(KEYS.DECISIONS, JSON.stringify(deduped));
    } catch (e) {
      console.error('Failed to save decisions to storage:', e);
    }
  },

  getSettings(): StrategySettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: StrategySettings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  getStats(): UserStats {
    try {
      const data = localStorage.getItem(KEYS.STATS);
      if (data) return { ...DEFAULT_STATS, ...JSON.parse(data) };
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
    return DEFAULT_STATS;
  },

  saveStats(stats: UserStats) {
    try {
      localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  },

  getHourlyReports(): HourlyReport[] {
    try {
      const data = localStorage.getItem(KEYS.HOURLY_REPORTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicateById(parsed);
          if (deduped.length !== parsed.length) {
            this.saveHourlyReports(deduped);
          }
          return deduped;
        }
      }
    } catch (e) {
      console.error('Failed to load hourly reports from storage:', e);
    }
    const seed = this.deduplicateById(generateSeedHourlyReports());
    this.saveHourlyReports(seed);
    return seed;
  },

  saveHourlyReports(reports: HourlyReport[]) {
    try {
      const deduped = this.deduplicateById(reports);
      localStorage.setItem(KEYS.HOURLY_REPORTS, JSON.stringify(deduped));
      localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
    } catch (e) {
      console.error('Failed to save hourly reports to storage:', e);
    }
  },

  addHourlyReport(report: HourlyReport) {
    const list = this.getHourlyReports().filter(r => r.id !== report.id);
    const updated = [report, ...list.slice(0, 99)]; // retain last 100 reports
    this.saveHourlyReports(updated);
    return updated;
  },

  saveHourlyReport(report: HourlyReport) {
    return this.addHourlyReport(report);
  },

  getDisqualifiedPatterns(): DisqualifiedPattern[] {
    try {
      const data = localStorage.getItem(KEYS.DISQUALIFIED);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicateById(parsed);
          if (deduped.length !== parsed.length) {
            this.saveDisqualifiedPatterns(deduped);
          }
          return deduped;
        }
      }
    } catch (e) {
      console.error('Failed to load disqualified patterns from storage:', e);
    }
    const seed = this.deduplicateById(generateSeedDisqualifiedPatterns());
    this.saveDisqualifiedPatterns(seed);
    return seed;
  },

  saveDisqualifiedPatterns(list: DisqualifiedPattern[]) {
    try {
      const deduped = this.deduplicateById(list);
      localStorage.setItem(KEYS.DISQUALIFIED, JSON.stringify(deduped));
      localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
    } catch (e) {
      console.error('Failed to save disqualified patterns to storage:', e);
    }
  },

  addDisqualifiedPattern(item: DisqualifiedPattern) {
    const list = this.getDisqualifiedPatterns();
    // remove existing item for same patternTag & coin if any, then prepend
    const filtered = list.filter(i => !(i.patternTag === item.patternTag && i.coin === item.coin));
    const updated = [item, ...filtered.slice(0, 99)];
    this.saveDisqualifiedPatterns(updated);
    return updated;
  },

  /**
   * البداية من الصفر للاختبار (Clean Test Slate)
   * يتيح للمستخدم تصفير كافة الصفقات والقرارات والبدء برأس مال نظيف 100%
   */
  resetToCleanSlate(
    startingCapital: number = 1000, 
    options: { wipeTradeHistory?: boolean; wipeDecisions?: boolean; wipeDisqualified?: boolean; mode?: 'PAPER' | 'LIVE' } = {}
  ) {
    const { wipeTradeHistory = true, wipeDecisions = true, wipeDisqualified = true, mode = 'PAPER' } = options;

    // Reset trades
    if (wipeTradeHistory) {
      this.saveTrades([]);
    } else {
      this.saveActiveTrades([]);
    }

    // Reset decisions
    if (wipeDecisions) {
      this.saveDecisions([]);
    }

    // Reset disqualified patterns
    if (wipeDisqualified) {
      this.saveDisqualifiedPatterns([]);
    }

    // Clean Stats
    const cleanStats: UserStats = {
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
    this.saveStats(cleanStats);

    // Update settings with user defined capital and execution mode
    const curSettings = this.getSettings();
    this.saveSettings({
      ...curSettings,
      userDefinedCapital: startingCapital,
      tradingExecutionMode: mode,
      autoTradingEnabled: true,
    });

    localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
    return cleanStats;
  },

  /**
   * إحصائيات قاعدة البيانات والتخزين المحلي
   */
  getDatabaseStats() {
    const trades = this.getTrades();
    const active = trades.filter(t => t.status === 'OPEN');
    const closed = trades.filter(t => t.status === 'CLOSED');
    const patterns = this.getPatterns();
    const swings = this.getSwings();
    const decisions = this.getDecisions();
    const hourlyReports = this.getHourlyReports();
    const disqualified = this.getDisqualifiedPatterns();
    const lastSync = Number(localStorage.getItem(KEYS.LAST_SYNC) || Date.now());

    // Approximate size in localStorage
    let totalChars = 0;
    Object.values(KEYS).forEach(k => {
      const item = localStorage.getItem(k);
      if (item) totalChars += item.length;
    });
    const estimatedKb = Math.round((totalChars * 2) / 1024);

    return {
      totalTradesCount: trades.length,
      activeTradesCount: active.length,
      closedTradesCount: closed.length,
      patternsCount: patterns.length,
      swingsCount: swings.length,
      decisionsCount: decisions.length,
      hourlyReportsCount: hourlyReports.length,
      disqualifiedCount: disqualified.length,
      lastSyncTime: lastSync,
      estimatedKb,
    };
  },

  resetAll() {
    localStorage.removeItem(KEYS.PATTERNS);
    localStorage.removeItem(KEYS.SWINGS);
    localStorage.removeItem(KEYS.TRADES);
    localStorage.removeItem(KEYS.DECISIONS);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.STATS);
    localStorage.removeItem(KEYS.HOURLY_REPORTS);
    localStorage.removeItem(KEYS.DISQUALIFIED);
    localStorage.removeItem(KEYS.LAST_SYNC);
  },

  exportMemoryJson(): string {
    const memory = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      patterns: this.getPatterns(),
      swings: this.getSwings(),
      trades: this.getTrades(),
      decisions: this.getDecisions(),
      settings: this.getSettings(),
      stats: this.getStats(),
      hourlyReports: this.getHourlyReports(),
      disqualifiedPatterns: this.getDisqualifiedPatterns(),
      databaseStats: this.getDatabaseStats(),
    };
    return JSON.stringify(memory, null, 2);
  },

  exportFullMemory(): string {
    return this.exportMemoryJson();
  },

  importFullMemory(jsonStr: string): boolean {
    return this.importMemoryJson(jsonStr);
  },

  getUserStats(): UserStats {
    return this.getStats();
  },

  saveUserStats(stats: UserStats) {
    this.saveStats(stats);
  },

  getDecisionLogs(): DecisionLog[] {
    return this.getDecisions();
  },

  saveDecisionLogs(decisions: DecisionLog[]) {
    this.saveDecisions(decisions);
  },

  getActiveTrades(): Trade[] {
    return this.deduplicateTrades(this.getTrades().filter(t => t.status === 'OPEN'));
  },

  saveActiveTrades(trades: Trade[]) {
    const activeDeduped = this.deduplicateTrades(trades);
    const activeIds = new Set(activeDeduped.map(t => t.id));
    const closed = this.getTrades().filter(t => t.status === 'CLOSED' && !activeIds.has(t.id));
    this.saveTrades([...activeDeduped, ...closed]);
    localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
  },

  getClosedTrades(): Trade[] {
    return this.deduplicateTrades(this.getTrades().filter(t => t.status === 'CLOSED'));
  },

  saveClosedTrades(closed: Trade[]) {
    const closedDeduped = this.deduplicateTrades(closed);
    const closedIds = new Set(closedDeduped.map(t => t.id));
    const active = this.getTrades().filter(t => t.status === 'OPEN' && !closedIds.has(t.id));
    this.saveTrades([...active, ...closedDeduped]);
    localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
  },

  resetToFactoryTraining() {
    this.resetAll();
    const patterns = generateSeedPatterns();
    const swings = generateSeedSwings();
    const trades = generateSeedTrades();
    const decisions = generateSeedDecisions();
    const reports = generateSeedHourlyReports();
    const disqualified = generateSeedDisqualifiedPatterns();
    this.savePatterns(patterns);
    this.saveSwings(swings);
    this.saveTrades(trades);
    this.saveDecisions(decisions);
    this.saveSettings(DEFAULT_SETTINGS);
    this.saveStats(DEFAULT_STATS);
    this.saveHourlyReports(reports);
    this.saveDisqualifiedPatterns(disqualified);
    localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
  },

  importMemoryJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.patterns) this.savePatterns(parsed.patterns);
      if (parsed.swings) this.saveSwings(parsed.swings);
      if (parsed.trades) this.saveTrades(parsed.trades);
      if (parsed.decisions) this.saveDecisions(parsed.decisions);
      if (parsed.settings) this.saveSettings(parsed.settings);
      if (parsed.stats) this.saveStats(parsed.stats);
      if (parsed.hourlyReports) this.saveHourlyReports(parsed.hourlyReports);
      if (parsed.disqualifiedPatterns) this.saveDisqualifiedPatterns(parsed.disqualifiedPatterns);
      localStorage.setItem(KEYS.LAST_SYNC, String(Date.now()));
      return true;
    } catch (e) {
      console.error('Failed to import memory JSON:', e);
      return false;
    }
  }
};
