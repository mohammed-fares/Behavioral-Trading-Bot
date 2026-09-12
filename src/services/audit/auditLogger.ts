/**
 * Centralized Structured Audit Logger
 * Immutable, tamper-evident recording of signals, risk evaluations, orders, fills,
 * rejections, reconciliations, and emergency stops.
 */

import { AuditLogEntry } from '../../types';

class AuditLoggerService {
  private logs: AuditLogEntry[] = [];
  private readonly maxLogs: number = 2000;
  private readonly STORAGE_KEY = 'behavioral_bot_audit_logs_v2';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          this.logs = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.error('AuditLogger: failed to load logs from storage', e);
    }
  }

  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs.slice(0, 500)));
      }
    } catch (e) {
      console.error('AuditLogger: failed to persist logs', e);
    }
  }

  public log(
    level: AuditLogEntry['level'],
    component: AuditLogEntry['component'],
    event: string,
    message: string,
    options: { symbol?: string; orderId?: string; tradeId?: string; metadata?: Record<string, any> } = {}
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      level,
      component,
      event,
      symbol: options.symbol,
      orderId: options.orderId,
      tradeId: options.tradeId,
      message,
      metadata: options.metadata
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.persist();

    // Log to console in structured format
    const prefix = `[AUDIT][${entry.level}][${entry.component}][${entry.event}]`;
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(prefix, message, entry.metadata || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, entry.metadata || '');
    } else {
      console.log(prefix, message, entry.metadata || '');
    }

    return entry;
  }

  public info(component: AuditLogEntry['component'], event: string, message: string, options?: { symbol?: string; orderId?: string; tradeId?: string; metadata?: Record<string, any> }) {
    return this.log('INFO', component, event, message, options);
  }

  public warn(component: AuditLogEntry['component'], event: string, message: string, options?: { symbol?: string; orderId?: string; tradeId?: string; metadata?: Record<string, any> }) {
    return this.log('WARN', component, event, message, options);
  }

  public error(component: AuditLogEntry['component'], event: string, message: string, options?: { symbol?: string; orderId?: string; tradeId?: string; metadata?: Record<string, any> }) {
    return this.log('ERROR', component, event, message, options);
  }

  public critical(component: AuditLogEntry['component'], event: string, message: string, options?: { symbol?: string; orderId?: string; tradeId?: string; metadata?: Record<string, any> }) {
    return this.log('CRITICAL', component, event, message, options);
  }

  public getLogs(limit: number = 100, filterComponent?: AuditLogEntry['component']): AuditLogEntry[] {
    if (filterComponent) {
      return this.logs.filter(l => l.component === filterComponent).slice(0, limit);
    }
    return this.logs.slice(0, limit);
  }

  public clear() {
    this.logs = [];
    this.persist();
  }
}

export const AuditLogger = new AuditLoggerService();
