import { HourlyReport, DisqualifiedPattern } from '../../types';
import { generateSeedHourlyReports, generateSeedDisqualifiedPatterns } from '../seedData';
import { deduplicateById } from './storageReset';

export const KEYS_REPORTS = {
  HOURLY_REPORTS: 'behavioral_bot_hourly_reports_v1',
  DISQUALIFIED: 'behavioral_bot_disqualified_v1',
};

export function loadHourlyReports(
  memoryCache: Record<string, any>,
  onPersist: (reports: HourlyReport[]) => void
): HourlyReport[] {
  if (memoryCache.hourlyReports && memoryCache.hourlyReports.length > 0) {
    return memoryCache.hourlyReports;
  }
  try {
    const data = localStorage.getItem(KEYS_REPORTS.HOURLY_REPORTS);
    if (data) {
      memoryCache.hourlyReports = deduplicateById(JSON.parse(data));
      return memoryCache.hourlyReports;
    }
  } catch (_) {}
  const seed = deduplicateById(generateSeedHourlyReports());
  onPersist(seed);
  return seed;
}

export function loadDisqualifiedPatterns(
  memoryCache: Record<string, any>,
  onPersist: (patterns: DisqualifiedPattern[]) => void
): DisqualifiedPattern[] {
  if (memoryCache.disqualifiedPatterns && memoryCache.disqualifiedPatterns.length > 0) {
    return memoryCache.disqualifiedPatterns;
  }
  try {
    const data = localStorage.getItem(KEYS_REPORTS.DISQUALIFIED);
    if (data) {
      memoryCache.disqualifiedPatterns = deduplicateById(JSON.parse(data));
      return memoryCache.disqualifiedPatterns;
    }
  } catch (_) {}
  const seed = deduplicateById(generateSeedDisqualifiedPatterns());
  onPersist(seed);
  return seed;
}
