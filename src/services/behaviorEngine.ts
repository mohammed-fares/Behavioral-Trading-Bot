/**
 * Behavioral Bot Core Engine — محرك التداول السلوكي
 * ينفذ المراحل السبع: المراقبة، التحليل، الاكتشاف، القرار، التنفيذ، الإدارة الذكية، والتعلم المستمر
 */

import { 
  Timeframe, 
  Direction, 
  Candle, 
  Swing, 
  PatternStats, 
  TimeframeAlignmentResult, 
  TimeframeSignal,
  DecisionLog, 
  DecisionStepReview,
  Trade, 
  StrategySettings,
  UserStats,
  HourlyReport,
  DisqualifiedPattern,
  DataSource,
  MarketRegime,
  TIMEFRAMES 
} from '../types';
import { TechnicalRSI } from './math/rsi';
import { TechnicalADX } from './math/adx';
import { PatternSimilarity } from './learning/similarity';
import { ProbabilityCalibration } from './learning/calibration';
import { FinancialMath } from './math/financial';

export const BehaviorEngine = {
  /**
   * حساب المؤشرات الفنية الأساسية (RSI و ADX) باستخدام المعايير القياسية
   */
  calculateRSI(closes: number[], period: number = 14): number {
    return TechnicalRSI.calculate(closes, period);
  },

  calculateADX(candles: Candle[], period: number = 14): number {
    return TechnicalADX.calculate(candles, period).adx;
  },

  /**
   * كشف التذبذب الأخير وصياغة بصمة النمط (Pattern Tag)
   * الشكل: P-{Dir}-{Mag}-{Dur}-R{rsi1}-{rsi2}-A{adx1}-{adx2}
   */
  detectSwingAndPattern(
    coin: string, 
    timeframe: Timeframe, 
    candles: Candle[],
    minMovementPct: number = 0.5
  ): { swing: Swing; patternTag: string } | null {
    if (candles.length < 15) return null;

    // Look at recent swing window (last 10 to 30 candles)
    const lookback = Math.min(25, candles.length - 2);
    const window = candles.slice(-lookback);
    const startCandle = window[0];
    const endCandle = window[window.length - 1];

    const changePct = Number((((endCandle.close - startCandle.open) / startCandle.open) * 100).toFixed(1));
    const absChange = Math.abs(changePct);
    
    let direction: Direction = 'SIDEWAYS';
    if (absChange >= minMovementPct) {
      direction = changePct > 0 ? 'UP' : 'DOWN';
    } else {
      direction = 'SIDEWAYS';
    }

    // Time calculation
    const tfInfo = TIMEFRAMES.find(t => t.id === timeframe);
    const stepMins = tfInfo ? tfInfo.minutes : 15;
    const durationMinutes = window.length * stepMins;

    // RSI calculation start vs end
    const closesEarly = candles.slice(0, candles.length - Math.floor(window.length / 2)).map(c => c.close);
    const closesLate = candles.map(c => c.close);
    const rsiStart = this.calculateRSI(closesEarly);
    const rsiEnd = this.calculateRSI(closesLate);

    // ADX calculation
    const adxStart = Math.max(15, this.calculateADX(candles.slice(0, -5)));
    const adxEnd = Math.max(18, this.calculateADX(candles));

    const dirLetter = direction === 'UP' ? 'U' : direction === 'DOWN' ? 'D' : 'S';
    const patternTag = `P-${dirLetter}-${absChange}-${durationMinutes}-R${rsiStart}-${rsiEnd}-A${adxStart}-${adxEnd}`;

    const swing: Swing = {
      id: `sw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      coin,
      timeframe,
      startTime: startCandle.timestamp,
      endTime: endCandle.timestamp,
      direction,
      startPrice: startCandle.open,
      endPrice: endCandle.close,
      magnitudePct: absChange,
      durationMinutes,
      rsiStart,
      rsiEnd,
      adxStart,
      adxEnd,
      patternTag,
    };

    return { swing, patternTag };
  },

  /**
   * البحث في الذاكرة ومطابقة النمط (Memory Search)
   */
  findPatternStats(patternTag: string, memoryPatterns: PatternStats[]): PatternStats | null {
    // 1. Exact match
    const exact = memoryPatterns.find(p => p.tag === patternTag);
    if (exact) return exact;

    // 2. Fuzzy match by Direction + Magnitude range (within 0.4%) + RSI bucket
    const parts = patternTag.split('-');
    if (parts.length >= 6) {
      const dir = parts[1];
      const mag = parseFloat(parts[2]);
      const similar = memoryPatterns.find(p => {
        const pParts = p.tag.split('-');
        if (pParts.length >= 6 && pParts[1] === dir) {
          const pMag = parseFloat(pParts[2]);
          return Math.abs(pMag - mag) <= 0.4;
        }
        return false;
      });
      if (similar) return similar;
    }

    return null;
  },

  /**
   * فحص توافق الأطر السبعة (Timeframe Alignment)
   */
  evaluateTimeframeAlignment(
    coin: string,
    baseTimeframe: Timeframe,
    baseConfidence: number,
    baseDirection: Direction,
    allTimeframeSignals: { timeframe: Timeframe; direction: Direction; confidence: number; patternTag: string }[]
  ): TimeframeAlignmentResult {
    const signals: TimeframeSignal[] = [];
    let supportingCount = 0;
    let opposingCount = 0;
    let neutralCount = 0;
    let netAdjustment = 0;

    for (const tf of TIMEFRAMES) {
      const signal = allTimeframeSignals.find(s => s.timeframe === tf.id);
      const tfDir = signal ? signal.direction : 'SIDEWAYS';
      const tfConf = signal ? signal.confidence : 50;
      const tag = signal ? signal.patternTag : 'P-NEUTRAL';

      let isSupporting = false;
      let isOpposing = false;
      let isNeutral = false;
      let contributionPct = 0;

      if (tf.id === baseTimeframe) {
        isSupporting = true;
        contributionPct = 0;
      } else if (tfDir === baseDirection && tfDir !== 'SIDEWAYS') {
        isSupporting = true;
        supportingCount++;
        // Higher weight for 5m, 1h, 4h
        if (tf.id === '5m' || tf.id === '1h') contributionPct = 10;
        else contributionPct = 5;
      } else if (tfDir !== 'SIDEWAYS' && tfDir !== baseDirection) {
        isOpposing = true;
        opposingCount++;
        contributionPct = -10;
      } else {
        isNeutral = true;
        neutralCount++;
        contributionPct = 0;
      }

      netAdjustment += contributionPct;
      signals.push({
        timeframe: tf.id,
        direction: tfDir,
        confidence: tfConf,
        patternTag: tag,
        contributionPct,
        isSupporting,
        isOpposing,
        isNeutral,
      });
    }

    const adjustedConfidence = Math.max(10, Math.min(98, baseConfidence + netAdjustment));
    const isAligned = supportingCount >= 4 && opposingCount < 3;

    return {
      coin,
      baseTimeframe,
      baseConfidence,
      adjustedConfidence,
      supportingCount: supportingCount + 1, // Include base frame
      opposingCount,
      neutralCount,
      totalTimeframes: 7,
      signals,
      finalDirection: baseDirection,
      isAligned,
    };
  },

  /**
   * مراجعة القرار الشاملة (Decision Review Lifecycle Phase 4)
   */
  makeDecision(
    coin: string,
    baseTimeframe: Timeframe,
    pattern: PatternStats | null,
    patternTag: string,
    alignment: TimeframeAlignmentResult,
    currentPrice: number,
    activeTrades: Trade[],
    closedTrades: Trade[],
    settings: StrategySettings,
    stats: UserStats,
    disqualifiedPatterns: DisqualifiedPattern[] = [],
    dataSource: DataSource = 'REAL_MARKET',
    currentRegime: MarketRegime = 'RANGE'
  ): DecisionLog {
    const now = Date.now();
    const currentUtcHour = new Date(now).getUTCHours();
    const reasons: string[] = [];
    const reviewSteps: DecisionStepReview[] = [];

    // Step 1: Pattern Criteria & Multi-Dimensional Similarity Review
    let patternPassed = false;
    let initialConfidence = 50;
    let similarity = pattern ? PatternSimilarity.calculateSimilarity(patternTag, pattern, currentRegime) : undefined;

    if (pattern) {
      initialConfidence = pattern.confidence || Math.round(pattern.continuationRate);
      const occPassed = pattern.occurrences >= settings.minOccurrences;
      const confPassed = initialConfidence >= settings.minConfidence;
      const simPassed = !similarity || similarity.score >= (settings.minSimilarityPct || 75);
      patternPassed = occPassed && confPassed && simPassed;

      reviewSteps.push({
        name: 'فحص النمط وتكراره التاريخي',
        passed: occPassed && confPassed,
        detail: `تكرر ${pattern.occurrences} مرة (المطلوب ≥ ${settings.minOccurrences}) | الثقة الأولية: ${initialConfidence}% (المطلوب ≥ ${settings.minConfidence}%)`,
        metric: `${pattern.occurrences} تكرار`,
        threshold: `≥ ${settings.minOccurrences}`,
      });

      if (similarity) {
        reviewSteps.push({
          name: 'المطابقة السلوكية المتعددة الأبعاد (Pattern Similarity)',
          passed: simPassed,
          detail: `درجة التشابه: ${similarity.score}% (المطلوب ≥ ${settings.minSimilarityPct || 75}%) | تطابق النظام: ${similarity.regimeMatch ? 'نعم' : 'لا'}`,
          metric: `${similarity.score}%`,
          threshold: `≥ ${settings.minSimilarityPct || 75}%`
        });
        if (!simPassed) reasons.push(`درجة تشابه النمط (${similarity.score}%) أقل من الحد الأدنى (${settings.minSimilarityPct || 75}%)`);
      }

      if (!occPassed) reasons.push(`عدد التكرارات في الذاكرة (${pattern.occurrences}) أقل من الحد الأدنى (${settings.minOccurrences})`);
      if (!confPassed) reasons.push(`الثقة الأولية (${initialConfidence}%) أقل من الحد الأدنى (${settings.minConfidence}%)`);
    } else {
      reviewSteps.push({
        name: 'فحص النمط في الذاكرة',
        passed: false,
        detail: `النمط ${patternTag} جديد ولم يسجل في الذاكرة بعد (0 تكرارات)`,
        threshold: `≥ ${settings.minOccurrences}`,
      });
      reasons.push('نمط جديد تماماً يحتاج لبناء ذاكرة تاريخية قبل التداول');
    }

    // Step 1.5: Anti-Repetition Rule (منع تكرار الأخطاء والاستراتيجيات الخاسرة)
    let antiRepetitionPassed = true;
    let matchingDisqualified: DisqualifiedPattern | undefined = undefined;

    if (settings.avoidPastFailedPatterns !== false && disqualifiedPatterns.length > 0) {
      matchingDisqualified = disqualifiedPatterns.find(dp => 
        dp.patternTag === patternTag && dp.coin === coin && (now < dp.coolingUntil)
      );

      if (matchingDisqualified) {
        antiRepetitionPassed = false;
        reviewSteps.push({
          name: 'التعلم السلوكي ومنع تكرار الخطأ',
          passed: false,
          detail: `حظر فوري: النمط تسبب في خسارة سابقة بقيمة -$${matchingDisqualified.lossUsd.toFixed(2)} (${matchingDisqualified.reason}). تم استبعاده لعدم تكرار الخطأ!`,
          metric: 'محظور سلوكياً',
          threshold: 'تجنب تكرار الأخطاء',
        });
        reasons.unshift(`منع تكرار الخطأ: استبعاد النمط ${patternTag} على ${coin}. الدرس المستفاد: ${matchingDisqualified.lesson}`);
      } else {
        reviewSteps.push({
          name: 'فحص تكرار الأخطاء السابقة',
          passed: true,
          detail: 'النمط غير مدرج في قائمة الاستبعاد ولم يسبق تسجيل خطأ مماثل غير معالج',
        });
      }
    }

    // Step 2: Timeframe Alignment Review
    const alignmentPassed = alignment.supportingCount >= settings.minSupportingFrames && alignment.opposingCount <= settings.maxOpposingAllowed;
    reviewSteps.push({
      name: 'توافق الأطر السبعة',
      passed: alignmentPassed,
      detail: `${alignment.supportingCount}/7 أطر داعمة | ${alignment.opposingCount} أطر معارضة (الحد الأقصى المسموح للمعارضة: ${settings.maxOpposingAllowed})`,
      metric: `${alignment.supportingCount}/7 داعمة`,
      threshold: `≥ ${settings.minSupportingFrames}/7`,
    });
    if (!alignmentPassed) {
      if (alignment.opposingCount > settings.maxOpposingAllowed) {
        reasons.push(`تعارض شديد: ${alignment.opposingCount} أطر تعارض الاتجاه`);
      } else {
        reasons.push(`توافق الأطر (${alignment.supportingCount}/7) أقل من المطلوب (${settings.minSupportingFrames}/7)`);
      }
    }

    // Step 3: Time of Day / Hour Review
    let hourBonus = 0;
    let hourPassed = true;
    if (pattern && pattern.bestHours && pattern.bestHours[currentUtcHour]) {
      const hStat = pattern.bestHours[currentUtcHour];
      if (hStat.winRate >= 70) {
        hourBonus = 5;
        reviewSteps.push({
          name: 'مراجعة توقيت التداول (ساعة الذروة)',
          passed: true,
          detail: `الساعة ${currentUtcHour}:00 UTC ساعة ذهبية بنسبة فوز ${hStat.winRate}% (+5% بونص ثقة)`,
          metric: `${hStat.winRate}% WinRate`,
        });
      } else if (hStat.winRate < 45) {
        hourBonus = -15;
        hourPassed = false;
        reviewSteps.push({
          name: 'مراجعة توقيت التداول (ساعة هابطة)',
          passed: false,
          detail: `الساعة ${currentUtcHour}:00 UTC ساعة ضعيفة تاريخياً بنسبة نجاح ${hStat.winRate}% فقط`,
          metric: `${hStat.winRate}%`,
        });
        reasons.push(`الساعة ${currentUtcHour}:00 UTC غير ملائمة للتداول تاريخياً`);
      } else {
        reviewSteps.push({
          name: 'مراجعة توقيت التداول',
          passed: true,
          detail: `الساعة ${currentUtcHour}:00 UTC مقبولة بنسبة فوز ${hStat.winRate}%`,
        });
      }
    } else {
      reviewSteps.push({
        name: 'مراجعة توقيت التداول',
        passed: true,
        detail: `الساعة ${currentUtcHour}:00 UTC مقبولة ولا توجد قيود زمنية مانعة`,
      });
    }

    // Step 4: Open Trades Conflict & Limits
    const sameCoinTrade = activeTrades.find(t => t.coin === coin && t.status === 'OPEN');
    const tradeLimitPassed = activeTrades.filter(t => t.status === 'OPEN').length < settings.maxConcurrentTrades;
    const tradesPassed = !sameCoinTrade && tradeLimitPassed;

    reviewSteps.push({
      name: 'فحص الصفقات المفتوحة والتعارض',
      passed: tradesPassed,
      detail: sameCoinTrade 
        ? `توجد صفقة نشطة مسبقاً على ${coin}` 
        : `عدد الصفقات النشطة: ${activeTrades.length}/${settings.maxConcurrentTrades}`,
      threshold: `أقصى حد: ${settings.maxConcurrentTrades}`,
    });
    if (sameCoinTrade) reasons.push(`توجد صفقة مفتوحة بالفعل على عملة ${coin}`);
    if (!tradeLimitPassed) reasons.push(`تم بلوغ الحد الأقصى للصفقات المتزامنة (${settings.maxConcurrentTrades})`);

    // Step 5: Risk & Cooldown Review
    const dailyLimitPassed = Math.abs(stats.todayLossUsd) < (stats.initialBalance * (settings.dailyLossLimitPct / 100));
    const consecLossesPassed = stats.consecutiveLosses < settings.maxConsecutiveLosses;
    
    // Check 30-min cooldown for this coin
    const lastCoinTrade = closedTrades.filter(t => t.coin === coin).sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0))[0];
    const isCooldown = lastCoinTrade && lastCoinTrade.exitTime && (now - lastCoinTrade.exitTime < 30 * 60 * 1000);

    const riskPassed = dailyLimitPassed && consecLossesPassed && !isCooldown;
    reviewSteps.push({
      name: 'إدارة المخاطر والـ Cooldown',
      passed: riskPassed,
      detail: isCooldown 
        ? `العملة في فترة Cooldown (أقل من 30 دقيقة من آخر صفقة)`
        : `الخسائر المتتالية: ${stats.consecutiveLosses}/${settings.maxConsecutiveLosses} | الخسارة اليومية ضمن الحد`,
    });
    if (isCooldown) reasons.push(`العملة في فترة راحة Cooldown مؤقتة`);
    if (!dailyLimitPassed) reasons.push(`تم الوصول للحد الأقصى للخسارة اليومية (${settings.dailyLossLimitPct}%)`);
    if (!consecLossesPassed) reasons.push(`تم الوصول للحد الأقصى للخسائر المتتالية (${settings.maxConsecutiveLosses})`);

    // Final Confidence Calculation
    const finalConfidence = Math.max(10, Math.min(99, alignment.adjustedConfidence + hourBonus));

    // Decision Status Determination
    let status: 'APPROVED' | 'REJECTED' | 'WAIT' = 'REJECTED';

    if (patternPassed && alignmentPassed && hourPassed && tradesPassed && riskPassed && antiRepetitionPassed && finalConfidence >= settings.minConfidence) {
      status = 'APPROVED';
      reasons.unshift(`المعايير مكتملة بنجاح: ثقة نهائية ${finalConfidence}% مع توافق ${alignment.supportingCount}/7 أطر`);
    } else if (!antiRepetitionPassed) {
      status = 'REJECTED';
      // reason already added in anti-repetition step
    } else if (pattern && pattern.occurrences < settings.minOccurrences && pattern.occurrences >= 5 && alignment.supportingCount >= 4) {
      status = 'WAIT';
      reasons.unshift(`النمط واعد لكنه نادر (${pattern.occurrences} تكرار < ${settings.minOccurrences} مطلوب). تم وضعه في قائمة المراقبة النشطة`);
    } else {
      status = 'REJECTED';
      if (reasons.length === 0) reasons.push('لم يتم استيفاء شروط الدخول الصارمة');
    }

    // Proposed trade parameters (Phase 5: Execution formula)
    let proposedTrade = undefined;
    if (status === 'APPROVED' || status === 'WAIT') {
      const avgMove = pattern ? pattern.avgSubsequentMovePct : 1.0;
      const avgDur = pattern ? pattern.avgSubsequentDuration : 45;
      const targetPct = Number((avgMove * 0.8).toFixed(2));
      const stopLossPct = Number((avgMove * 0.5).toFixed(2));

      const maxPerTradeUsd = (stats.balance * (settings.positionSizePct / 100)) * settings.leverage;
      const alignmentFactor = alignment.supportingCount / 7;
      const sizeUsd = Math.round((finalConfidence / 100) * maxPerTradeUsd * alignmentFactor * 1.2);

      const isLong = alignment.finalDirection === 'UP';
      const targetPrice = isLong 
        ? currentPrice * (1 + targetPct / 100)
        : currentPrice * (1 - targetPct / 100);
      const stopLossPrice = isLong
        ? currentPrice * (1 - stopLossPct / 100)
        : currentPrice * (1 + stopLossPct / 100);

      proposedTrade = {
        sizeUsd: Math.max(25, sizeUsd),
        targetPct,
        stopLossPct,
        expectedDurationMins: avgDur,
        entryPrice: currentPrice,
        targetPrice: Number(targetPrice.toFixed(coin.includes('DOGE') ? 4 : 2)),
        stopLossPrice: Number(stopLossPrice.toFixed(coin.includes('DOGE') ? 4 : 2)),
      };
    }

    const calibratedConfidence = ProbabilityCalibration.calibrate(
      finalConfidence,
      pattern ? pattern.occurrences : 0,
      pattern ? pattern.continuedCount : 0
    );

    return {
      id: `dec-${now}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      coin,
      baseTimeframe,
      direction: alignment.finalDirection,
      status,
      patternTag,
      initialConfidence,
      adjustedConfidence: alignment.adjustedConfidence,
      finalConfidence,
      calibratedConfidence,
      similarity,
      dataSource,
      marketRegime: currentRegime,
      supportingCount: alignment.supportingCount,
      opposingCount: alignment.opposingCount,
      reasons,
      reviewSteps,
      proposedTrade,
    };
  },

  /**
   * إدارة الصفقة الذكية (Phase 6: Management & Smart Exit)
   */
  evaluateTradeManagement(
    trade: Trade,
    currentPrice: number,
    settings: StrategySettings
  ): { updatedTrade: Trade; shouldClose: boolean; reason?: string } {
    const isLong = trade.direction === 'LONG';
    const qty = trade.quantity || (trade.sizeUsd / trade.entryPrice);
    const grossPnLUsd = FinancialMath.calcPnL(trade.direction, trade.entryPrice, currentPrice, qty);
    const feesPaid = trade.feesPaidUsd || 0;
    const currentPnLUsd = FinancialMath.round(grossPnLUsd - feesPaid, 2);
    const currentPnLPct = FinancialMath.calcReturnPct(currentPnLUsd, trade.marginUsd || (trade.sizeUsd / trade.leverage));
    
    const peakPrice = isLong ? Math.max(trade.peakPrice, currentPrice) : Math.min(trade.peakPrice, currentPrice);
    const peakPnLPct = Math.max(trade.peakPnLPct, currentPnLPct);

    const now = Date.now();
    const durationMinutes = Math.round((now - trade.entryTime) / 60000);

    // Smart Exit Check:
    // When profit reaches 50% of target, activate trailing stop
    const targetThresholdPct = trade.targetPct * (settings.smartExitThresholdPct / 100);
    const isTrailingActive = trade.isTrailingActive || peakPnLPct >= targetThresholdPct;

    let trailingStopPrice = trade.trailingStopPrice;
    if (isTrailingActive && !trailingStopPrice) {
      trailingStopPrice = trade.entryPrice;
    }

    let shouldClose = false;
    let exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SMART_EXIT' | 'TIMEOUT' | undefined = undefined;

    // 1. Take Profit hit
    if (currentPnLPct >= trade.targetPct) {
      shouldClose = true;
      exitReason = 'TAKE_PROFIT';
    }
    // 2. Stop Loss hit
    else if (currentPnLPct <= -trade.stopLossPct) {
      shouldClose = true;
      exitReason = 'STOP_LOSS';
    }
    // 3. Smart Exit: Retracement >= 25% from peak after hitting trailing threshold
    else if (isTrailingActive && peakPnLPct > 0.5) {
      const pullbackPct = ((peakPnLPct - currentPnLPct) / peakPnLPct) * 100;
      if (pullbackPct >= settings.smartExitRetracementPct) {
        shouldClose = true;
        exitReason = 'SMART_EXIT';
      }
    }
    // 4. Timeout: exceeded expected duration * 1.6
    else if (durationMinutes > trade.expectedDurationMinutes * 1.6 && currentPnLPct > 0.2) {
      shouldClose = true;
      exitReason = 'TIMEOUT';
    }

    const updatedTrade: Trade = {
      ...trade,
      currentPrice,
      peakPrice,
      peakPnLPct,
      currentPnLUsd,
      currentPnLPct,
      isTrailingActive,
      trailingStopPrice,
      durationMinutes,
      status: shouldClose ? 'CLOSED' : 'OPEN',
      exitPrice: shouldClose ? currentPrice : undefined,
      exitTime: shouldClose ? now : undefined,
      exitReason: shouldClose ? exitReason : undefined,
      realizedPnLUsd: shouldClose ? currentPnLUsd : undefined,
      realizedPnLPct: shouldClose ? currentPnLPct : undefined,
    };

    return {
      updatedTrade,
      shouldClose,
      reason: exitReason,
    };
  },

  /**
   * التعلم المستمر بعد إغلاق الصفقة (Phase 7: Learning)
   */
  learnFromClosedTrade(
    closedTrade: Trade,
    patterns: PatternStats[]
  ): { updatedPatterns: PatternStats[]; learnedLesson: string } {
    const isWin = (closedTrade.realizedPnLUsd || 0) > 0;
    const currentHour = new Date(closedTrade.entryTime).getUTCHours();
    let learnedLesson = '';

    const updatedPatterns = patterns.map(p => {
      if (p.tag === closedTrade.patternTag && p.coin === closedTrade.coin) {
        const newOcc = p.occurrences + 1;
        const newCont = isWin ? p.continuedCount + 1 : p.continuedCount;
        const newRev = !isWin ? p.reversedCount + 1 : p.reversedCount;
        const newContRate = Number(((newCont / newOcc) * 100).toFixed(1));
        const newRevRate = Number(((newRev / newOcc) * 100).toFixed(1));
        const newConf = isWin ? Math.min(95, p.confidence + 1) : Math.max(20, p.confidence - 1);

        // Update hour stats
        const currentHourStats = p.bestHours[currentHour] || { count: 0, winRate: 50, avgProfit: 0 };
        const newHourCount = currentHourStats.count + 1;
        const newHourWins = isWin ? (currentHourStats.count * (currentHourStats.winRate / 100)) + 1 : (currentHourStats.count * (currentHourStats.winRate / 100));
        const newHourWinRate = Number(((newHourWins / newHourCount) * 100).toFixed(1));

        return {
          ...p,
          occurrences: newOcc,
          continuedCount: newCont,
          reversedCount: newRev,
          continuationRate: newContRate,
          reversalRate: newRevRate,
          confidence: newConf,
          lastOccurredAt: Date.now(),
          bestHours: {
            ...p.bestHours,
            [currentHour]: {
              count: newHourCount,
              winRate: newHourWinRate,
              avgProfit: Number(((currentHourStats.avgProfit + (closedTrade.realizedPnLPct || 0)) / 2).toFixed(2)),
            },
          },
        };
      }
      return p;
    });

    if (isWin) {
      if (closedTrade.exitReason === 'SMART_EXIT') {
        learnedLesson = `إغلاق ذكي (Smart Exit): تم حجز أرباح بقيمة +$${closedTrade.realizedPnLUsd} (${closedTrade.realizedPnLPct}%) عند التراجع من القمة (${closedTrade.peakPnLPct}%).`;
      } else {
        learnedLesson = `نجاح تام: النمط ${closedTrade.patternTag} حقق الهدف بنسبة +$${closedTrade.realizedPnLUsd} مع توافق ${closedTrade.supportingTimeframesCount}/7 أطر في الساعة ${currentHour}:00 UTC.`;
      }
    } else {
      learnedLesson = `درس مستفاد: خسارة -$${Math.abs(closedTrade.realizedPnLUsd || 0)} في الساعة ${currentHour}:00 UTC. تم خفض ثقة النمط وزيادة اشتراط التوافق الصارم مستقبلاً.`;
    }

    return { updatedPatterns, learnedLesson };
  }
};
