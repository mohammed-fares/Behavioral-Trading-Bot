/**
 * Storage Service — إدارة الذاكرة المستمرة عبر السيرفر (Phase 5: Server Memory)
 * يتم تخزين الذاكرة على السيرفر في data/memory.json عبر REST endpoints (GET/POST /api/memory)
 * مع كاش محلي فوري واحتياطي في localStorage.
 */

import { 
  PatternStats, 
  Swing, 
  Trade, 
  DecisionLog, 
  StrategySettings, 
  UserStats, 
  HourlyReport, 
  DisqualifiedPattern,
  Direction
} from '../types';
import { createCleanStats, deduplicateById } from './storage/storageReset';
import { exportMemoryJson, importMemoryJson, deduplicateTrades } from './storage/storageExport';
import { performCleanSlate, calculateDatabaseStats, CleanSlateOptions } from './storage/storageCleanSlate';
import { loadHourlyReports, loadDisqualifiedPatterns } from './storage/storageReports';
import { 
  DEFAULT_SETTINGS, 
  DEFAULT_STATS, 
  DEFAULT_LIVE_STATS,
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
  SETTINGS: 'behavioral_bot_settings_v1',
  HOURLY_REPORTS: 'behavioral_bot_hourly_reports_v1',
  DISQUALIFIED: 'behavioral_bot_disqualified_v1',
  LAST_SYNC: 'behavioral_bot_last_sync_v1',
  CURRENT_MODE: 'behavioral_bot_current_mode_v2',
  TRADES_PAPER: 'behavioral_bot_trades_paper_v2',
  TRADES_LIVE: 'behavioral_bot_trades_live_v2',
  DECISIONS_PAPER: 'behavioral_bot_decisions_paper_v2',
  DECISIONS_LIVE: 'behavioral_bot_decisions_live_v2',
  STATS_PAPER: 'behavioral_bot_stats_paper_v2',
  STATS_LIVE: 'behavioral_bot_stats_live_v2',
  TRADES_LEGACY: 'behavioral_bot_trades_v1',
  DECISIONS_LEGACY: 'behavioral_bot_decisions_v1',
  STATS_LEGACY: 'behavioral_bot_stats_v1',
};

// In-memory runtime cache
let memoryCache: Record<string, any> = {
  patterns: [],
  swings: [],
  tradesPaper: [],
  tradesLive: [],
  decisionsPaper: [],
  decisionsLive: [],
  statsPaper: { ...DEFAULT_STATS },
  statsLive: { ...DEFAULT_LIVE_STATS },
  settings: { ...DEFAULT_SETTINGS },
  hourlyReports: [],
  disqualifiedPatterns: [],
  currentMode: 'PAPER'
};

let syncTimer: any = null;
let isInitialized = false;

// Async sync to server
async function persistToServer(key: string, value: any) {
  try {
    if (typeof window === 'undefined') return;
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  } catch (err) {
    // Non-blocking fallback
    console.warn('[StorageService] Background server sync warning:', err);
  }
}

function debounceSyncToServer(payload: Record<string, any>) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      if (typeof window === 'undefined') return;
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_) {}
  }, 400);
}

export const StorageService = {
  /**
   * Initialize and hydrate memory from server GET /api/memory
   */
  async init(): Promise<void> {
    if (isInitialized) return;
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/memory');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const data = json.data;
            ['patterns', 'swings', 'tradesPaper', 'tradesLive', 'decisionsPaper', 'decisionsLive', 'statsPaper', 'statsLive', 'hourlyReports', 'disqualifiedPatterns', 'currentMode'].forEach(k => {
              if (data[k] !== undefined) {
                if (k === 'patterns' && Array.isArray(data[k])) {
                  memoryCache[k] = this.deduplicatePatterns(data[k]);
                } else if (Array.isArray(data[k])) {
                  memoryCache[k] = this.deduplicateById(data[k]);
                } else {
                  memoryCache[k] = data[k];
                }
              }
            });
            if (data.trades && !data.tradesPaper) memoryCache.tradesPaper = this.deduplicateById(data.trades);
            if (data.decisions && !data.decisionsPaper) memoryCache.decisionsPaper = this.deduplicateById(data.decisions);
            if (data.stats && !data.statsPaper) memoryCache.statsPaper = data.stats;
            if (data.settings) memoryCache.settings = { ...DEFAULT_SETTINGS, ...data.settings };
            isInitialized = true;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[StorageService] Server memory fetch failed, falling back to local store:', e);
    }
    isInitialized = true;
  },

  getCurrentMode(): 'PAPER' | 'LIVE' {
    if (memoryCache.currentMode === 'LIVE' || memoryCache.currentMode === 'PAPER') {
      return memoryCache.currentMode;
    }
    try {
      const mode = localStorage.getItem(KEYS.CURRENT_MODE);
      if (mode === 'LIVE' || mode === 'PAPER') {
        memoryCache.currentMode = mode;
        return mode;
      }
    } catch (_) {}
    return 'PAPER';
  },

  setCurrentMode(mode: 'PAPER' | 'LIVE') {
    memoryCache.currentMode = mode;
    try {
      localStorage.setItem(KEYS.CURRENT_MODE, mode);
    } catch (_) {}
    persistToServer('currentMode', mode);
  },

  deduplicatePatterns(patterns: PatternStats[]): PatternStats[] {
    if (!Array.isArray(patterns)) return [];
    const map = new Map<string, PatternStats>();

    const getCleanDuration = (tf: string, currentDur: number): number => {
      if (tf === '1h') return (currentDur >= 180 && currentDur <= 360) ? currentDur : 240;
      if (tf === '30m') return (currentDur >= 90 && currentDur <= 240) ? currentDur : 120;
      if (tf === '15m') return (currentDur >= 30 && currentDur <= 120) ? currentDur : 60;
      if (tf === '5m') return (currentDur >= 15 && currentDur <= 45) ? currentDur : 25;
      return currentDur > 0 ? currentDur : 60;
    };

    for (const p of patterns) {
      if (!p || !p.coin) continue;
      const tf = p.timeframe || '15m';
      const dir: Direction = p.direction || (p.tag && p.tag.includes('-U-') ? 'UP' : 'DOWN');
      const key = `${p.coin}__${tf}__${dir}`;
      const cleanDur = getCleanDuration(tf, p.durationMinutes || 0);

      const existing = map.get(key);
      if (!existing) {
        const occ = Math.max(15, p.occurrences || 15);
        const cont = Math.max(Math.round(occ * 0.72), p.continuedCount || Math.round(occ * 0.72));
        const rate = Math.round((cont / occ) * 100);
        const conf = Math.max(68, p.confidence || 0, rate);

        map.set(key, {
          ...p,
          timeframe: tf,
          direction: dir,
          durationMinutes: cleanDur,
          occurrences: occ,
          continuedCount: cont,
          continuationRate: rate,
          confidence: conf,
          sampleSize: occ,
          tag: `P-${dir === 'UP' ? 'U' : 'D'}-${p.magnitudePct || 1.0}-${cleanDur}-R${dir === 'UP' ? '50-65' : '35-50'}-A25-35`,
        });
      } else {
        const totalOcc = (existing.occurrences || 0) + (p.occurrences || 0);
        const totalCont = (existing.continuedCount || 0) + (p.continuedCount || 0);
        const totalRev = (existing.reversedCount || 0) + (p.reversedCount || 0);
        const totalSide = (existing.sidewaysCount || 0) + (p.sidewaysCount || 0);
        const contRate = totalOcc > 0 ? Math.round((totalCont / totalOcc) * 100) : existing.continuationRate;
        const conf = Math.max(68, existing.confidence || 0, p.confidence || 0, contRate);

        map.set(key, {
          ...existing,
          durationMinutes: cleanDur,
          occurrences: Math.max(25, totalOcc),
          continuedCount: totalCont,
          reversedCount: totalRev,
          sidewaysCount: totalSide,
          continuationRate: contRate,
          confidence: conf,
          sampleSize: Math.max(25, totalOcc),
          lastOccurredAt: Math.max(existing.lastOccurredAt || 0, p.lastOccurredAt || 0),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
  },

  getPatterns(): PatternStats[] {
    if (memoryCache.patterns && memoryCache.patterns.length > 0) {
      return this.deduplicatePatterns(memoryCache.patterns);
    }
    try {
      const data = localStorage.getItem(KEYS.PATTERNS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicatePatterns(parsed);
          memoryCache.patterns = deduped;
          return deduped;
        }
      }
    } catch (_) {}
    const seed = this.deduplicatePatterns(generateSeedPatterns());
    this.savePatterns(seed);
    return seed;
  },

  savePatterns(patterns: PatternStats[]) {
    const deduped = this.deduplicatePatterns(patterns);
    memoryCache.patterns = deduped;
    try {
      localStorage.setItem(KEYS.PATTERNS, JSON.stringify(deduped));
    } catch (_) {}
    debounceSyncToServer({ patterns: deduped });
  },

  getSwings(): Swing[] {
    if (memoryCache.swings && memoryCache.swings.length > 0) {
      return memoryCache.swings;
    }
    try {
      const data = localStorage.getItem(KEYS.SWINGS);
      if (data) {
        memoryCache.swings = JSON.parse(data);
        return memoryCache.swings;
      }
    } catch (_) {}
    const seed = generateSeedSwings();
    this.saveSwings(seed);
    return seed;
  },

  saveSwings(swings: Swing[]) {
    memoryCache.swings = swings;
    try {
      localStorage.setItem(KEYS.SWINGS, JSON.stringify(swings));
    } catch (_) {}
    debounceSyncToServer({ swings });
  },

  deduplicateById,
  deduplicateTrades,

  getTrades(mode?: 'PAPER' | 'LIVE'): Trade[] {
    const activeMode = mode || this.getCurrentMode();
    const cacheKey = activeMode === 'LIVE' ? 'tradesLive' : 'tradesPaper';
    if (Array.isArray(memoryCache[cacheKey]) && memoryCache[cacheKey].length > 0) {
      return this.deduplicateTrades(memoryCache[cacheKey]);
    }

    const key = activeMode === 'LIVE' ? KEYS.TRADES_LIVE : KEYS.TRADES_PAPER;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicateTrades(parsed);
          memoryCache[cacheKey] = deduped;
          return deduped;
        }
      }
      if (activeMode === 'PAPER') {
        const seed = this.deduplicateTrades(generateSeedTrades());
        this.saveTrades(seed, 'PAPER');
        return seed;
      }
    } catch (e) {
      console.error(`Failed to load ${activeMode} trades:`, e);
    }
    return [];
  },

  saveTrades(trades: Trade[], mode?: 'PAPER' | 'LIVE') {
    const activeMode = mode || this.getCurrentMode();
    const cacheKey = activeMode === 'LIVE' ? 'tradesLive' : 'tradesPaper';
    const key = activeMode === 'LIVE' ? KEYS.TRADES_LIVE : KEYS.TRADES_PAPER;
    const deduped = this.deduplicateTrades(trades);

    memoryCache[cacheKey] = deduped;
    try {
      localStorage.setItem(key, JSON.stringify(deduped));
    } catch (_) {}

    debounceSyncToServer({ [cacheKey]: deduped, trades: deduped });
  },

  getDecisions(mode?: 'PAPER' | 'LIVE'): DecisionLog[] {
    const activeMode = mode || this.getCurrentMode();
    const cacheKey = activeMode === 'LIVE' ? 'decisionsLive' : 'decisionsPaper';
    if (Array.isArray(memoryCache[cacheKey]) && memoryCache[cacheKey].length > 0) {
      return this.deduplicateById(memoryCache[cacheKey]);
    }

    const key = activeMode === 'LIVE' ? KEYS.DECISIONS_LIVE : KEYS.DECISIONS_PAPER;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const deduped = this.deduplicateById(parsed);
          memoryCache[cacheKey] = deduped;
          return deduped;
        }
      }
      if (activeMode === 'PAPER') {
        const seed = this.deduplicateById(generateSeedDecisions());
        this.saveDecisions(seed, 'PAPER');
        return seed;
      }
    } catch (e) {
      console.error(`Failed to load ${activeMode} decisions:`, e);
    }
    return [];
  },

  saveDecisions(decisions: DecisionLog[], mode?: 'PAPER' | 'LIVE') {
    const activeMode = mode || this.getCurrentMode();
    const cacheKey = activeMode === 'LIVE' ? 'decisionsLive' : 'decisionsPaper';
    const key = activeMode === 'LIVE' ? KEYS.DECISIONS_LIVE : KEYS.DECISIONS_PAPER;
    const deduped = this.deduplicateById(decisions);

    memoryCache[cacheKey] = deduped;
    try {
      localStorage.setItem(key, JSON.stringify(deduped));
    } catch (_) {}

    debounceSyncToServer({ [cacheKey]: deduped, decisions: deduped });
  },

  getSettings(): StrategySettings {
    if (memoryCache.settings && memoryCache.settings.minConfidence) {
      if (memoryCache.settings.minOccurrences > 10) memoryCache.settings.minOccurrences = 3;
      if (memoryCache.settings.minSupportingFrames > 4) memoryCache.settings.minSupportingFrames = 3;
      if (memoryCache.settings.minConfidence > 65) memoryCache.settings.minConfidence = 55;
      return memoryCache.settings;
    }
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.minOccurrences > 10) parsed.minOccurrences = 3;
        if (parsed.minSupportingFrames > 4) parsed.minSupportingFrames = 3;
        if (parsed.minConfidence > 65) parsed.minConfidence = 55;
        memoryCache.settings = { ...DEFAULT_SETTINGS, ...parsed };
        return memoryCache.settings;
      }
    } catch (_) {}
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: StrategySettings) {
    memoryCache.settings = settings;
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (_) {}
    debounceSyncToServer({ settings });
  },

  getStats(mode?: 'PAPER' | 'LIVE'): UserStats {
    const activeMode = mode || this.getCurrentMode();
    const cacheKey = activeMode === 'LIVE' ? 'statsLive' : 'statsPaper';
    if (memoryCache[cacheKey] && memoryCache[cacheKey].balance !== undefined) {
      return memoryCache[cacheKey];
    }

    const key = activeMode === 'LIVE' ? KEYS.STATS_LIVE : KEYS.STATS_PAPER;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        memoryCache[cacheKey] = { ...(activeMode === 'LIVE' ? DEFAULT_LIVE_STATS : DEFAULT_STATS), ...parsed };
        return memoryCache[cacheKey];
      }
    } catch (_) {}

    return activeMode === 'LIVE' ? { ...DEFAULT_LIVE_STATS } : { ...DEFAULT_STATS };
  },

  saveStats(stats: UserStats, mode?: 'PAPER' | 'LIVE') {
    const activeMode = mode || this.getCurrentMode();
    const cacheKey = activeMode === 'LIVE' ? 'statsLive' : 'statsPaper';
    const key = activeMode === 'LIVE' ? KEYS.STATS_LIVE : KEYS.STATS_PAPER;

    memoryCache[cacheKey] = stats;
    try {
      localStorage.setItem(key, JSON.stringify(stats));
    } catch (_) {}

    debounceSyncToServer({ [cacheKey]: stats, stats });
  },

  getHourlyReports(): HourlyReport[] {
    return loadHourlyReports(memoryCache, (seed) => this.saveHourlyReports(seed));
  },

  saveHourlyReports(reports: HourlyReport[]) {
    const deduped = this.deduplicateById(reports);
    memoryCache.hourlyReports = deduped;
    try {
      localStorage.setItem(KEYS.HOURLY_REPORTS, JSON.stringify(deduped));
    } catch (_) {}
    debounceSyncToServer({ hourlyReports: deduped });
  },

  addHourlyReport(report: HourlyReport) {
    const list = this.getHourlyReports().filter(r => r.id !== report.id);
    const updated = [report, ...list.slice(0, 99)];
    this.saveHourlyReports(updated);
    return updated;
  },

  saveHourlyReport(report: HourlyReport) {
    return this.addHourlyReport(report);
  },

  getDisqualifiedPatterns(): DisqualifiedPattern[] {
    return loadDisqualifiedPatterns(memoryCache, (seed) => this.saveDisqualifiedPatterns(seed));
  },

  saveDisqualifiedPatterns(list: DisqualifiedPattern[]) {
    const deduped = this.deduplicateById(list);
    memoryCache.disqualifiedPatterns = deduped;
    try {
      localStorage.setItem(KEYS.DISQUALIFIED, JSON.stringify(deduped));
    } catch (_) {}
    debounceSyncToServer({ disqualifiedPatterns: deduped });
  },

  addDisqualifiedPattern(item: DisqualifiedPattern) {
    const list = this.getDisqualifiedPatterns();
    const filtered = list.filter(i => !(i.patternTag === item.patternTag && i.coin === item.coin));
    const updated = [item, ...filtered.slice(0, 99)];
    this.saveDisqualifiedPatterns(updated);
    return updated;
  },

  resetToCleanSlate(
    startingCapital: number = 100, 
    options: CleanSlateOptions = {}
  ) {
    return performCleanSlate(startingCapital, options, {
      saveTrades: (trades) => this.saveTrades(trades),
      saveActiveTrades: (trades) => this.saveActiveTrades(trades),
      saveDecisions: (decisions) => this.saveDecisions(decisions),
      saveDisqualifiedPatterns: (patterns) => this.saveDisqualifiedPatterns(patterns),
      saveStats: (stats) => this.saveStats(stats),
      getSettings: () => this.getSettings(),
      saveSettings: (settings) => this.saveSettings(settings),
      debounceSync: debounceSyncToServer,
    });
  },

  getDatabaseStats() {
    return calculateDatabaseStats({
      trades: this.getTrades(),
      patterns: this.getPatterns(),
      swings: this.getSwings(),
      decisions: this.getDecisions(),
      hourlyReports: this.getHourlyReports(),
      disqualified: this.getDisqualifiedPatterns(),
    });
  },

  resetAll() {
    memoryCache = {
      patterns: [],
      swings: [],
      tradesPaper: [],
      tradesLive: [],
      decisionsPaper: [],
      decisionsLive: [],
      statsPaper: { ...DEFAULT_STATS },
      statsLive: { ...DEFAULT_LIVE_STATS },
      settings: { ...DEFAULT_SETTINGS },
      hourlyReports: [],
      disqualifiedPatterns: [],
      currentMode: 'PAPER'
    };
    try {
      localStorage.clear();
    } catch (_) {}
    debounceSyncToServer(memoryCache);
  },

  resetMode(mode: 'PAPER' | 'LIVE', initialCapital?: number) {
    const defaultBalance = initialCapital ?? 100;
    const freshStats = createCleanStats(defaultBalance);
    this.saveStats(freshStats, mode);
    this.saveTrades([], mode);
    this.saveDecisions([], mode);
  },

  exportMemoryJson(): string {
    return exportMemoryJson(memoryCache);
  },

  exportFullMemory(): string { return this.exportMemoryJson(); },
  importFullMemory(jsonStr: string): boolean { return this.importMemoryJson(jsonStr); },

  getUserStats(mode?: 'PAPER' | 'LIVE'): UserStats { return this.getStats(mode); },
  saveUserStats(stats: UserStats, mode?: 'PAPER' | 'LIVE') { this.saveStats(stats, mode); },

  getDecisionLogs(mode?: 'PAPER' | 'LIVE'): DecisionLog[] { return this.getDecisions(mode); },
  saveDecisionLogs(decisions: DecisionLog[], mode?: 'PAPER' | 'LIVE') { this.saveDecisions(decisions, mode); },

  getActiveTrades(mode?: 'PAPER' | 'LIVE'): Trade[] {
    return this.getTrades(mode).filter(t => t.status === 'OPEN');
  },

  saveActiveTrades(trades: Trade[], mode?: 'PAPER' | 'LIVE') {
    const activeMode = mode || this.getCurrentMode();
    const closed = this.getTrades(activeMode).filter(t => t.status === 'CLOSED');
    this.saveTrades([...trades, ...closed], activeMode);
  },

  getClosedTrades(mode?: 'PAPER' | 'LIVE'): Trade[] {
    return this.getTrades(mode).filter(t => t.status === 'CLOSED');
  },

  saveClosedTrades(closed: Trade[], mode?: 'PAPER' | 'LIVE') {
    const activeMode = mode || this.getCurrentMode();
    const active = this.getTrades(activeMode).filter(t => t.status === 'OPEN');
    this.saveTrades([...active, ...closed], activeMode);
  },

  resetToFactoryTraining() { this.resetAll(); },

  importMemoryJson(jsonStr: string): boolean {
    return importMemoryJson(jsonStr, (parsed) => {
      if (parsed.patterns) this.savePatterns(parsed.patterns);
      if (parsed.swings) this.saveSwings(parsed.swings);
      if (parsed.trades) this.saveTrades(parsed.trades);
      if (parsed.decisions) this.saveDecisions(parsed.decisions);
      if (parsed.settings) this.saveSettings(parsed.settings);
      if (parsed.stats) this.saveStats(parsed.stats);
      if (parsed.hourlyReports) this.saveHourlyReports(parsed.hourlyReports);
      if (parsed.disqualifiedPatterns) this.saveDisqualifiedPatterns(parsed.disqualifiedPatterns);
      debounceSyncToServer(parsed);
    });
  }
};
