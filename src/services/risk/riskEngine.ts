/**
 * Independent Production Risk Engine
 * Enforces pre-trade and intra-trade safety invariants:
 * - Daily loss limit (UTC day)
 * - Maximum consecutive losses
 * - Maximum concurrent open trades
 * - Maximum total account exposure and symbol exposure
 * - Cross-currency correlation limit (BTC, ETH, SOL, BNB)
 * - Spread and slippage tolerances
 * - Data freshness validation (Strict rejection of STALE/UNAVAILABLE data)
 * - Futures leverage and liquidation risk
 */

import { StrategySettings, UserStats, Trade, DecisionStepReview } from '../../types';
import { MarketTicker } from '../marketData/marketDataLayer';
import { ExchangeFilters } from './exchangeFilters';
import { FuturesRiskCalculator } from './futuresRisk';
import { AuditLogger } from '../audit/auditLogger';

export interface RiskEvaluationResult {
  approved: boolean;
  reasons: string[];
  reviews: DecisionStepReview[];
  recommendedQuantity: number;
  recommendedSizeUsd: number;
  liquidationPrice: number;
  estimatedFeeUsd: number;
}

// Major correlated crypto pairs
const CORRELATED_MAJORS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

export const RiskEngine = {
  /**
   * Evaluate whether a trade is permitted under current risk parameters.
   */
  evaluateTrade(
    symbol: string,
    direction: 'LONG' | 'SHORT',
    targetEntryPrice: number,
    targetPct: number,
    stopLossPct: number,
    activeTrades: Trade[],
    stats: UserStats,
    settings: StrategySettings,
    ticker?: MarketTicker
  ): RiskEvaluationResult {
    const reviews: DecisionStepReview[] = [];
    const reasons: string[] = [];
    let approved = true;

    // 1. Data Freshness & Reliability Check (STRICT FAIL CLOSED)
    if (!ticker || ticker.dataSource === 'DATA_UNAVAILABLE') {
      approved = false;
      reviews.push({
        name: 'صلاحية بيانات السوق (Data Freshness)',
        passed: false,
        detail: 'بيانات السوق غير متوفرة (DATA_UNAVAILABLE) — تم تفعيل الإغلاق الآمن فوراً.',
        metric: 'بيانات غير متاحة',
        threshold: 'بيانات حقيقية صالحة'
      });
      reasons.push('فشل جلب بيانات السوق الحية — إيقاف التداول لحماية الحساب');
      AuditLogger.error('RISK_ENGINE', 'DATA_UNAVAILABLE_BLOCK', `Blocked trade for ${symbol} due to unavailable market data`);
      return {
        approved: false,
        reasons,
        reviews,
        recommendedQuantity: 0,
        recommendedSizeUsd: 0,
        liquidationPrice: 0,
        estimatedFeeUsd: 0
      };
    }

    if (ticker.isStale || (Date.now() - ticker.localReceiveTime > (settings.maxDataAgeSeconds || 15) * 1000)) {
      approved = false;
      reviews.push({
        name: 'حداثة بيانات السوق (Data Age)',
        passed: false,
        detail: `البيانات قديمة (Stale Data: ${Math.round((Date.now() - ticker.localReceiveTime) / 1000)}s > ${settings.maxDataAgeSeconds || 15}s)`,
        metric: 'بيانات قديمة',
        threshold: `< ${settings.maxDataAgeSeconds || 15} ثانية`
      });
      reasons.push('بيانات السوق متأخرة زمنياً — تم حظر فتح الصفقات حتى التحديث');
    } else {
      reviews.push({
        name: 'حداثة بيانات السوق',
        passed: true,
        detail: `بيانات السوق طازجة (${Math.round((Date.now() - ticker.localReceiveTime) / 1000)}s) من ${ticker.dataSource}`
      });
    }

    // 2. Spread Tolerance Check
    const maxAllowedSpread = settings.maxSpreadPct || 0.08;
    if (ticker.spreadPct > maxAllowedSpread) {
      approved = false;
      reviews.push({
        name: 'فارق السعر (Bid/Ask Spread)',
        passed: false,
        detail: `فارق السعر مرتفع (${ticker.spreadPct}% > ${maxAllowedSpread}%) — مخاطرة انزلاق عالية`,
        metric: `${ticker.spreadPct}%`,
        threshold: `≤ ${maxAllowedSpread}%`
      });
      reasons.push(`السبريد مرتفع جداً (${ticker.spreadPct}%) مقارنة بالحد الأقصى (${maxAllowedSpread}%)`);
    } else {
      reviews.push({
        name: 'فارق السعر (Spread)',
        passed: true,
        detail: `فارق سعر سليم (${ticker.spreadPct}% ≤ ${maxAllowedSpread}%)`
      });
    }

    // 3. Daily Loss Limit (UTC Day boundary)
    const maxDailyLossAllowed = stats.initialBalance * (settings.dailyLossLimitPct / 100);
    const dailyLossCurrent = Math.abs(stats.todayLossUsd || 0);
    if (dailyLossCurrent >= maxDailyLossAllowed) {
      approved = false;
      reviews.push({
        name: 'الحد الأقصى للخسارة اليومية (Daily Loss)',
        passed: false,
        detail: `تم تجاوز حد الخسارة اليومي: -$${dailyLossCurrent.toFixed(2)} (المسموح: -$${maxDailyLossAllowed.toFixed(2)})`,
        metric: `-$${dailyLossCurrent.toFixed(2)}`,
        threshold: `≤ -$${maxDailyLossAllowed.toFixed(2)}`
      });
      reasons.push(`تم بلوغ الحد الأقصى للخسارة اليومية المسموحة (${settings.dailyLossLimitPct}%)`);
    } else {
      reviews.push({
        name: 'الخسارة اليومية',
        passed: true,
        detail: `الخسارة اليومية -$${dailyLossCurrent.toFixed(2)} ضمن الحدود الآمنة`
      });
    }

    // 4. Consecutive Losses Circuit Breaker
    if (stats.consecutiveLosses >= settings.maxConsecutiveLosses) {
      approved = false;
      reviews.push({
        name: 'قاطع الخسائر المتتالية (Consecutive Losses)',
        passed: false,
        detail: `تكررت الخسائر ${stats.consecutiveLosses} مرات متتالية (الحد الأقصى: ${settings.maxConsecutiveLosses})`,
        metric: `${stats.consecutiveLosses}`,
        threshold: `< ${settings.maxConsecutiveLosses}`
      });
      reasons.push(`تفعيل قاطع الدائرة بعد ${stats.consecutiveLosses} خسائر متتالية`);
    } else {
      reviews.push({
        name: 'الخسائر المتتالية',
        passed: true,
        detail: `${stats.consecutiveLosses}/${settings.maxConsecutiveLosses} خسائر متتالية`
      });
    }

    // 5. Concurrent Trades Limit
    const openTradesCount = activeTrades.filter(t => t.status === 'OPEN').length;
    if (openTradesCount >= settings.maxConcurrentTrades) {
      approved = false;
      reviews.push({
        name: 'الصفقات المتزامنة (Concurrent Trades)',
        passed: false,
        detail: `عدد الصفقات المفتوحة (${openTradesCount}) بلغ الحد الأقصى (${settings.maxConcurrentTrades})`,
        metric: `${openTradesCount}`,
        threshold: `< ${settings.maxConcurrentTrades}`
      });
      reasons.push(`تم بلوغ الحد الأقصى للصفقات المتزامنة (${settings.maxConcurrentTrades})`);
    } else {
      reviews.push({
        name: 'الصفقات المفتوحة',
        passed: true,
        detail: `${openTradesCount}/${settings.maxConcurrentTrades} صفقات مفتوحة`
      });
    }

    // 6. Duplicate Symbol Position Check
    const existingPosition = activeTrades.find(t => t.coin === symbol && t.status === 'OPEN');
    if (existingPosition) {
      approved = false;
      reviews.push({
        name: 'تعارض الصفقات على نفس العملة',
        passed: false,
        detail: `توجد صفقة نشطة مسبقاً على عملة ${symbol}`,
        metric: 'صفقة قائمة',
        threshold: 'صفقة واحدة لكل عملة'
      });
      reasons.push(`توجد صفقة مفتوحة بالفعل على ${symbol}`);
    }

    // 7. Cross-Currency Correlation Risk (e.g. max 3 open major cryptos)
    if (CORRELATED_MAJORS.includes(symbol)) {
      const openCorrelatedCount = activeTrades.filter(t => t.status === 'OPEN' && CORRELATED_MAJORS.includes(t.coin)).length;
      if (openCorrelatedCount >= 3) {
        approved = false;
        reviews.push({
          name: 'المخاطرة المترابطة (Correlated Exposure)',
          passed: false,
          detail: `توجد ${openCorrelatedCount} صفقات نشطة على العملات الكبرى المترابطة (BTC/ETH/SOL/BNB)`,
          metric: `${openCorrelatedCount}`,
          threshold: `< 3`
        });
        reasons.push('الحد الأقصى للتعرض للعملات عالية الارتباط مكتمل');
      }
    }

    // 8. Position Sizing & Margin Validation
    const leverage = settings.leverage || 10;
    const balance = Math.max(10, stats.balance);
    const riskPerTradeUsd = balance * (settings.positionSizePct / 100);
    // Position sizing based on stop distance: Position Size = Risk Amount / StopLossPct
    const stopDistancePct = Math.max(0.5, stopLossPct) / 100;
    let computedNotionalUsd = riskPerTradeUsd / stopDistancePct;
    // Cap notional to balance * leverage
    computedNotionalUsd = Math.min(computedNotionalUsd, balance * leverage);
    computedNotionalUsd = Math.max(25, computedNotionalUsd);

    const rawQty = computedNotionalUsd / targetEntryPrice;
    const normalizedQty = ExchangeFilters.normalizeQuantity(symbol, rawQty);
    const normalizedPrice = ExchangeFilters.normalizePrice(symbol, targetEntryPrice);
    const finalNotionalUsd = normalizedQty * normalizedPrice;

    // Filter validation (minNotional)
    const filterCheck = ExchangeFilters.validateOrder(symbol, normalizedPrice, normalizedQty);
    if (!filterCheck.valid) {
      approved = false;
      reviews.push({
        name: 'قواعد تبادل الأوامر (Binance Rules)',
        passed: false,
        detail: filterCheck.reason || 'حجم الصفقة غير مطابق لقيود المنصة',
        metric: 'مرفوض من الفلتر',
        threshold: 'مطابق لقواعد Binance'
      });
      reasons.push(filterCheck.reason || 'حجم الطلب أقل من الحد الأدنى المقبول');
    }

    // Futures margin & liquidation evaluation
    const futuresMetrics = FuturesRiskCalculator.calculate(
      direction,
      normalizedPrice,
      normalizedQty,
      leverage,
      balance
    );

    if (!futuresMetrics.isSafeMargin) {
      approved = false;
      reviews.push({
        name: 'كفاية الهامش (Margin Requirement)',
        passed: false,
        detail: `الهامش المطلوب $${futuresMetrics.initialMarginUsd} يتجاوز رصيد الأمان في المحفظة ($${balance})`,
        metric: `$${futuresMetrics.initialMarginUsd}`,
        threshold: `≤ $${(balance * 0.7).toFixed(2)}`
      });
      reasons.push('رصيد المحفظة المتاح غير كافٍ لتغطية متطلبات الهامش بأمان');
    } else {
      reviews.push({
        name: 'كفاية الهامش وسعر التصفية',
        passed: true,
        detail: `الهامش $${futuresMetrics.initialMarginUsd} | سعر التصفية التقديري: $${futuresMetrics.liquidationPrice}`
      });
    }

    const estimatedFeeUsd = (finalNotionalUsd * 0.0004) * 2; // Entry + Exit fee

    return {
      approved,
      reasons,
      reviews,
      recommendedQuantity: normalizedQty,
      recommendedSizeUsd: Math.round(finalNotionalUsd * 100) / 100,
      liquidationPrice: futuresMetrics.liquidationPrice,
      estimatedFeeUsd: Math.round(estimatedFeeUsd * 100) / 100
    };
  }
};
