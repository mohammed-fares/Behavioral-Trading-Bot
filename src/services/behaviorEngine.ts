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
import { ProbabilityCalibration, wilsonScore } from './learning/calibration';
import { FinancialMath } from './math/financial';
import { detectMarketRegime } from './learning/regime';
import { getSymbolPerformance } from './marketData/marketDataLayer';
import { evaluateTradeManagement } from './behavior/tradeManagement';
import { learnFromClosedTrade } from './behavior/bayesianLearning';
import { 
  calculateRSI, 
  calculateADX, 
  hasVolumeConfirmation,
  detectSwingAndPattern, 
  findPatternStats 
} from './behavior/patternDetection';

export const BehaviorEngine = {
  /**
   * حساب المؤشرات الفنية الأساسية (RSI و ADX) باستخدام المعايير القياسية
   */
  calculateRSI,
  calculateADX,

  /**
   * كشف التذبذب الأخير وصياغة بصمة النمط (Pattern Tag)
   */
  detectSwingAndPattern,

  /**
   * البحث في الذاكرة ومطابقة النمط (Memory Search)
   */
  findPatternStats,

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

    // Institutional multi-timeframe weights: Macro frames govern overall trend bias
    const TF_WEIGHTS: Record<Timeframe, number> = {
      '1d': 10,
      '4h': 8,
      '1h': 6,
      '30m': 5,
      '15m': 4,
      '5m': 3,
      '1m': 2,
    };

    for (const tf of TIMEFRAMES) {
      const signal = allTimeframeSignals.find(s => s.timeframe === tf.id);
      const tfDir = signal ? signal.direction : 'SIDEWAYS';
      const tfConf = signal ? signal.confidence : 50;
      const tag = signal ? signal.patternTag : 'P-NEUTRAL';
      const tfWeight = TF_WEIGHTS[tf.id] || 4;

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
        contributionPct = tfWeight;
      } else if (tfDir !== 'SIDEWAYS' && tfDir !== baseDirection) {
        isOpposing = true;
        opposingCount++;
        // Opposing higher timeframes carries a stronger directional penalty
        contributionPct = -Math.round(tfWeight * 1.5);
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
    
    // Condition: 1h and 4h must agree on direction if both are directional
    const h1Signal = signals.find(s => s.timeframe === '1h');
    const h4Signal = signals.find(s => s.timeframe === '4h');
    const h1H4Conflict = !!(
      h1Signal && 
      h4Signal && 
      h1Signal.direction !== 'SIDEWAYS' && 
      h4Signal.direction !== 'SIDEWAYS' && 
      h1Signal.direction !== h4Signal.direction
    );

    const isAligned = (supportingCount + 1) >= 5 && opposingCount <= 2 && !h1H4Conflict && adjustedConfidence >= 70;

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
    currentRegime: MarketRegime = 'RANGE',
    candles?: Candle[],
    bidAsk?: { bid: number; ask: number }
  ): DecisionLog {
    const now = Date.now();
    const currentUtcHour = new Date(now).getUTCHours();
    const reasons: string[] = [];
    const reviewSteps: DecisionStepReview[] = [];

    // Filter 1: Volume Confirmation
    let volumePassed = true;
    if (candles && candles.length >= 20) {
      volumePassed = hasVolumeConfirmation(candles, 1.5);
      reviewSteps.push({
        name: 'فحص تأكيد الحجم (Volume Confirmation)',
        passed: volumePassed,
        detail: volumePassed 
          ? 'حجم الشمعة الأخيرة أعلى من 1.5x متوسط الـ 20 شمعة السابقة'
          : 'حجم الشمعة الأخيرة أقل من 1.5x متوسط الـ 20 شمعة السابقة (NO_VOLUME_CONFIRMATION)',
        threshold: '> 1.5x المتوسط'
      });
      if (!volumePassed) reasons.push('عدم وجود تأكيد كافٍ من حجم التداول (NO_VOLUME_CONFIRMATION)');
    }

    // Filter 2: RSI Zone [40, 70]
    let rsiPassed = true;
    if (candles && candles.length >= 15) {
      const currentRSI = TechnicalRSI.calculate(candles.map(c => c.close), 14);
      rsiPassed = currentRSI >= 40 && currentRSI <= 70;
      reviewSteps.push({
        name: 'نطاق مؤشر RSI (40 - 70)',
        passed: rsiPassed,
        detail: rsiPassed 
          ? `مؤشر RSI (${currentRSI}) داخل النطاق المتوازن [40 - 70]` 
          : `مؤشر RSI (${currentRSI}) خارج النطاق المقبول [40 - 70] (RSI_OUT_OF_ZONE)`,
        metric: `${currentRSI}`,
        threshold: '40 <= RSI <= 70'
      });
      if (!rsiPassed) reasons.push(`مؤشر RSI (${currentRSI}) خارج النطاق الفني الآمن (RSI_OUT_OF_ZONE)`);
    }

    // Filter 3: ADX Strength (ADX >= 25)
    let adxPassed = true;
    if (candles && candles.length >= 28) {
      const currentADX = TechnicalADX.calculate(candles, 14);
      adxPassed = currentADX.adx >= 25;
      reviewSteps.push({
        name: 'قوة الزخم الفني (ADX >= 25)',
        passed: adxPassed,
        detail: adxPassed 
          ? `مؤشر ADX (${currentADX.adx}) يعكس اتجاهاً قوياً` 
          : `مؤشر ADX (${currentADX.adx}) ضعيف جداً أقل من 25 (ADX_TOO_WEAK)`,
        metric: `${currentADX.adx}`,
        threshold: 'ADX >= 25'
      });
      if (!adxPassed) reasons.push(`قوة الاتجاه غير كافية ADX=${currentADX.adx} < 25 (ADX_TOO_WEAK)`);
    }

    // Filter 4: Spread Check (Spread <= 0.05%)
    let spreadPassed = true;
    if (bidAsk && bidAsk.bid > 0) {
      const spreadPct = ((bidAsk.ask - bidAsk.bid) / bidAsk.bid) * 100;
      spreadPassed = spreadPct <= 0.05;
      reviewSteps.push({
        name: 'فحص الفارق السعري (Spread Check)',
        passed: spreadPassed,
        detail: spreadPassed 
          ? `الفارق السعري ${spreadPct.toFixed(3)}% ضمن الحدود المسموحة (<= 0.05%)`
          : `الفارق السعري ${spreadPct.toFixed(3)}% مرتفع جداً (SPREAD_TOO_WIDE)`,
        metric: `${spreadPct.toFixed(3)}%`,
        threshold: '<= 0.05%'
      });
      if (!spreadPassed) reasons.push(`الفارق السعري كبير جداً (${spreadPct.toFixed(3)}% > 0.05%) (SPREAD_TOO_WIDE)`);
    }

    const technicalFiltersPassed = volumePassed && rsiPassed && adxPassed && spreadPassed;

    // Step 1: Pattern Criteria & Multi-Dimensional Similarity Review with Wilson Score
    let patternPassed = false;
    let initialConfidence = 50;
    let similarity = pattern ? PatternSimilarity.calculateSimilarity(patternTag, pattern, currentRegime) : undefined;

    if (pattern) {
      const wins = pattern.continuedCount || Math.round(((pattern.confidence || 50) / 100) * pattern.occurrences);
      const wilsonConf = Math.round(wilsonScore(wins, pattern.occurrences, 0.95));
      const rawRate = pattern.confidence || Math.round(pattern.continuationRate || (wins / (pattern.occurrences || 1)) * 100);
      // Balanced blended confidence preventing collapse of small real-world samples
      const effectiveConf = pattern.occurrences >= 20 
        ? Math.round(wilsonConf * 0.5 + rawRate * 0.5) 
        : Math.round(rawRate * 0.7 + (wilsonConf || rawRate) * 0.3);
      initialConfidence = Math.max(35, effectiveConf);

      const reqOccurrences = settings.minOccurrences || 3;
      const reqConfidence = settings.minConfidence || 55;
      const reqSimilarity = settings.minSimilarityPct || 70;

      const occPassed = pattern.occurrences >= reqOccurrences;
      const confPassed = initialConfidence >= reqConfidence;
      const simPassed = !similarity || similarity.score >= reqSimilarity;
      patternPassed = occPassed && confPassed && simPassed;

      reviewSteps.push({
        name: 'فحص النمط ومؤشر ويلسون الإحصائي (Wilson Score)',
        passed: occPassed && confPassed,
        detail: `تكرر ${pattern.occurrences} مرة (المطلوب ≥ ${reqOccurrences}) | ثقة ويلسون الإحصائية: ${initialConfidence}% (المطلوب ≥ ${reqConfidence}%)`,
        metric: `${initialConfidence}% Wilson`,
        threshold: `≥ ${reqConfidence}%`,
      });

      if (similarity) {
        reviewSteps.push({
          name: 'المطابقة السلوكية المتعددة الأبعاد (Pattern Similarity)',
          passed: simPassed,
          detail: `درجة التشابه: ${similarity.score}% (المطلوب ≥ ${reqSimilarity}%) | تطابق النظام: ${similarity.regimeMatch ? 'نعم' : 'لا'}`,
          metric: `${similarity.score}%`,
          threshold: `≥ ${reqSimilarity}%`
        });
        if (!simPassed) reasons.push(`درجة تشابه النمط (${similarity.score}%) أقل من الحد الأدنى (${reqSimilarity}%)`);
      }

      if (!occPassed) reasons.push(`عدد التكرارات في الذاكرة (${pattern.occurrences}) أقل من الحد الأدنى (${reqOccurrences})`);
      if (!confPassed) reasons.push(`ثقة ويلسون الإحصائية (${initialConfidence}%) أقل من الحد الأدنى (${reqConfidence}%)`);
    } else {
      reviewSteps.push({
        name: 'فحص النمط في الذاكرة',
        passed: false,
        detail: `النمط ${patternTag} جديد ولم يسجل في الذاكرة بعد (0 تكرارات)`,
        threshold: `≥ ${settings.minOccurrences || 3}`,
      });
      reasons.push('نمط جديد تماماً يحتاج لبناء ذاكرة تاريخية قبل التداول');
    }

    // Step 1.2: Market Regime Detection & Filtering
    let regimePassed = true;
    let regimeSizeMultiplier = 1.0;
    if (candles && candles.length >= 20) {
      const regime = detectMarketRegime(candles);
      if (regime === 'RANGING') {
        regimePassed = false;
        reasons.push('نظام السوق عرضي (RANGING) - منع فتح صفقات اتجاهية');
      } else if (regime === 'VOLATILE') {
        regimeSizeMultiplier = 0.5;
        reasons.push('نظام السوق عالي التقلب (VOLATILE) - خفض حجم الصفقة 50%');
      }
      reviewSteps.push({
        name: 'كشف نظام السوق (Market Regime)',
        passed: regimePassed,
        detail: `نظام السوق المكتشف: ${regime} | مضاعف الحجم: ${regimeSizeMultiplier}x`,
        threshold: 'TRENDING / VOLATILE'
      });
    }

    // Step 1.3: Smart Symbol Performance Selection
    let symbolPerfPassed = true;
    const symbolPerf = getSymbolPerformance(coin, closedTrades, candles);
    if (symbolPerf.totalTrades > 10 && symbolPerf.sharpe < 0.5) {
      symbolPerfPassed = false;
      reasons.push(`أداء العملة ضعيف تاريخياً (Sharpe = ${symbolPerf.sharpe} < 0.5) (POOR_SYMBOL_PERFORMANCE)`);
    }
    if (symbolPerf.volatility < 0.05) {
      symbolPerfPassed = false;
      reasons.push(`تقلب العملة منخفض جداً (${symbolPerf.volatility}% < 0.05%) (LOW_VOLATILITY)`);
    } else if (symbolPerf.volatility > 6.0) {
      symbolPerfPassed = false;
      reasons.push(`تقلب العملة مفرط (${symbolPerf.volatility}% > 6.0%) (EXTREME_VOLATILITY)`);
    }
    reviewSteps.push({
      name: 'فحص أداء وتقلب العملة (Symbol Selection)',
      passed: symbolPerfPassed,
      detail: `نسبة شارب: ${symbolPerf.sharpe} | معدل التقلب: ${symbolPerf.volatility}% | الصفقات السابقة: ${symbolPerf.totalTrades}`,
      threshold: 'Sharpe >= 0.5 & Volatility [0.05% - 6.0%]'
    });

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
    const minSup = settings.minSupportingFrames || 3;
    const maxOpp = settings.maxOpposingAllowed !== undefined ? settings.maxOpposingAllowed : 2;
    const alignmentPassed = alignment.supportingCount >= minSup && alignment.opposingCount <= maxOpp;
    reviewSteps.push({
      name: 'توافق الأطر السبعة',
      passed: alignmentPassed,
      detail: `${alignment.supportingCount}/7 أطر داعمة | ${alignment.opposingCount} أطر معارضة (الحد الأقصى المسموح للمعارضة: ${maxOpp})`,
      metric: `${alignment.supportingCount}/7 داعمة`,
      threshold: `≥ ${minSup}/7`,
    });
    if (!alignmentPassed) {
      if (alignment.opposingCount > maxOpp) {
        reasons.push(`تعارض شديد: ${alignment.opposingCount} أطر تعارض الاتجاه`);
      } else {
        reasons.push(`توافق الأطر (${alignment.supportingCount}/7) أقل من المطلوب (${minSup}/7)`);
      }
    }

    // Step 3: Time of Day / Hour Review
    let hourBonus = 0;
    let hourPassed = true;
    if (pattern && pattern.bestHours && pattern.bestHours[currentUtcHour]) {
      const hStat = pattern.bestHours[currentUtcHour];
      if (hStat.winRate >= 70 && hStat.count >= 2) {
        hourBonus = 5;
        reviewSteps.push({
          name: 'مراجعة توقيت التداول (ساعة الذروة)',
          passed: true,
          detail: `الساعة ${currentUtcHour}:00 UTC ساعة ذهبية بنسبة فوز ${hStat.winRate}% (+5% بونص ثقة)`,
          metric: `${hStat.winRate}% WinRate`,
        });
      } else if (hStat.winRate < 45 && hStat.count >= 3) {
        hourBonus = -15;
        hourPassed = false;
        reviewSteps.push({
          name: 'مراجعة توقيت التداول (ساعة هابطة)',
          passed: false,
          detail: `الساعة ${currentUtcHour}:00 UTC ساعة ضعيفة تاريخياً بنسبة نجاح ${hStat.winRate}% فقط (عينة ${hStat.count})`,
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
    
    // Check cooldown for this coin using configured settings.cooldownMinutes
    const cooldownMins = settings.cooldownMinutes ?? 15;
    const cooldownMs = cooldownMins * 60 * 1000;
    const lastCoinTrade = closedTrades.filter(t => t.coin === coin).sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0))[0];
    const isCooldown = !!(lastCoinTrade && lastCoinTrade.exitTime && (now - lastCoinTrade.exitTime < cooldownMs));

    const riskPassed = dailyLimitPassed && consecLossesPassed && !isCooldown;
    reviewSteps.push({
      name: 'إدارة المخاطر والـ Cooldown',
      passed: riskPassed,
      detail: isCooldown 
        ? `العملة في فترة Cooldown (أقل من ${cooldownMins} دقيقة من آخر صفقة)`
        : `الخسائر المتتالية: ${stats.consecutiveLosses}/${settings.maxConsecutiveLosses} | الخسارة اليومية ضمن الحد`,
    });
    if (isCooldown) reasons.push(`العملة في فترة راحة Cooldown مؤقتة (${cooldownMins} دقيقة)`);
    if (!dailyLimitPassed) reasons.push(`تم الوصول للحد الأقصى للخسارة اليومية (${settings.dailyLossLimitPct}%)`);
    if (!consecLossesPassed) reasons.push(`تم الوصول للحد الأقصى للخسائر المتتالية (${settings.maxConsecutiveLosses})`);

    // Final Confidence Calculation
    const finalConfidence = Math.max(10, Math.min(99, alignment.adjustedConfidence + hourBonus));

    // Decision Status Determination
    let status: 'APPROVED' | 'REJECTED' | 'WAIT' = 'REJECTED';
    const minConfThresh = settings.minConfidence || 55;
    const minOccThresh = settings.minOccurrences || 3;

    if (patternPassed && alignmentPassed && hourPassed && tradesPassed && riskPassed && antiRepetitionPassed && technicalFiltersPassed && regimePassed && symbolPerfPassed && finalConfidence >= minConfThresh) {
      status = 'APPROVED';
      reasons.unshift(`المعايير مكتملة بنجاح: ثقة نهائية ${finalConfidence}% مع توافق ${alignment.supportingCount}/7 أطر`);
    } else if (!antiRepetitionPassed) {
      status = 'REJECTED';
      // reason already added in anti-repetition step
    } else if (pattern && pattern.occurrences < minOccThresh && pattern.occurrences >= 2 && alignment.supportingCount >= 3) {
      status = 'WAIT';
      reasons.unshift(`النمط واعد لكنه نادر (${pattern.occurrences} تكرار < ${minOccThresh} مطلوب). تم وضعه في قائمة المراقبة النشطة`);
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
      const sizeUsd = Math.round((finalConfidence / 100) * maxPerTradeUsd * alignmentFactor * 1.2 * regimeSizeMultiplier);

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
  evaluateTradeManagement: evaluateTradeManagement,

  /**
   * التعلم المستمر بعد إغلاق الصفقة (Phase 7: Learning)
   */
  learnFromClosedTrade: learnFromClosedTrade
};
