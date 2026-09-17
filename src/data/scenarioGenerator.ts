import { DecisionLog, Trade, UserStats } from '../types';

export interface ScenarioResult {
  decision?: DecisionLog;
  trade?: Trade;
  updatedStats?: Partial<UserStats>;
  toastMessage: string;
}

export function executeScenario(scenarioId: number, currentStats: UserStats): ScenarioResult {
  const now = Date.now();

  if (scenarioId === 1) {
    // Scenario 1: BTC Approved Trade & Win +$3.75
    const decision: DecisionLog = {
      id: `dec-sc1-${now}`,
      timestamp: now,
      coin: 'BTCUSDT',
      baseTimeframe: '15m',
      direction: 'UP',
      status: 'APPROVED',
      patternTag: 'P-U-1.5-47-R45-68-A25-35',
      initialConfidence: 68,
      adjustedConfidence: 83,
      finalConfidence: 83,
      supportingCount: 5,
      opposingCount: 1,
      reasons: [
        'المعايير مكتملة بنجاح: ثقة نهائية 83% مع توافق 5/7 أطر في الساعة 14:00 UTC',
        'النمط تكرر 47 مرة في تاريخ BTCUSDT واستمر بنجاح بنسبة 68%',
        'الساعة 14:00 UTC هي ساعة سيولة ذهبية بنسبة نجاح 78%',
      ],
      reviewSteps: [
        { name: 'فحص النمط وتكراره التاريخي', passed: true, detail: 'تكرر 47 مرة (المطلوب ≥ 20) | الثقة 68%' },
        { name: 'توافق الأطر السبعة', passed: true, detail: '5/7 أطر داعمة (1m, 5m, 15m, 30m, 1h)' },
        { name: 'مراجعة توقيت التداول', passed: true, detail: 'الساعة 14:00 UTC ساعة ذهبية (+5% بونص ثقة)' },
        { name: 'فحص الصفقات المفتوحة', passed: true, detail: 'لا توجد صفقة سابقة على BTCUSDT' },
        { name: 'إدارة المخاطر والـ Cooldown', passed: true, detail: 'ضمن حدود الخسارة المسموحة' },
      ],
      proposedTrade: {
        sizeUsd: 498,
        targetPct: 0.65,
        stopLossPct: 0.40,
        expectedDurationMins: 45,
        entryPrice: 91400,
        targetPrice: 91994,
        stopLossPrice: 91034,
      },
    };

    const trade: Trade = {
      id: `tr-sc1-${now}`,
      coin: 'BTCUSDT',
      timeframe: '15m',
      direction: 'LONG',
      entryPrice: 91400,
      currentPrice: 91994,
      peakPrice: 92050,
      targetPrice: 91994,
      stopLossPrice: 91034,
      targetPct: 0.65,
      stopLossPct: 0.40,
      sizeUsd: 498,
      leverage: 10,
      marginUsd: 49.8,
      entryTime: now - 45 * 60 * 1000,
      exitTime: now,
      durationMinutes: 45,
      expectedDurationMinutes: 45,
      status: 'CLOSED',
      exitPrice: 91994,
      exitReason: 'TAKE_PROFIT',
      realizedPnLUsd: 3.75,
      realizedPnLPct: 0.75,
      currentPnLUsd: 3.75,
      currentPnLPct: 0.75,
      peakPnLPct: 0.81,
      isTrailingActive: true,
      patternTag: 'P-U-1.5-47-R45-68-A25-35',
      confidence: 83,
      supportingTimeframesCount: 5,
      learnedLesson: 'نجاح تام: النمط P-U-1.5-47 حقق الهدف بربح +$3.75 مع توافق 5/7 أطر في الساعة 14:00 UTC.',
    };

    return {
      decision,
      trade,
      updatedStats: {
        balance: Number((currentStats.balance + 3.75).toFixed(2)),
        realizedPnL: Number((currentStats.realizedPnL + 3.75).toFixed(2)),
        winCount: currentStats.winCount + 1,
        totalTrades: currentStats.totalTrades + 1,
      },
      toastMessage: '✓ تم تطبيق السيناريو 1: فتح صفقة BTC وتحقيق ربح +$3.75!',
    };
  }

  if (scenarioId === 2) {
    // Scenario 2: ETH Rejected Trade
    const decision: DecisionLog = {
      id: `dec-sc2-${now}`,
      timestamp: now,
      coin: 'ETHUSDT',
      baseTimeframe: '5m',
      direction: 'DOWN',
      status: 'REJECTED',
      patternTag: 'P-D-0.5-30-R70-45-A30-25',
      initialConfidence: 55,
      adjustedConfidence: 15,
      finalConfidence: 15,
      supportingCount: 2,
      opposingCount: 5,
      reasons: [
        'تعارض حاد بين الأطر: 5 أطر عليا (15m, 30m, 1h, 4h, 1d) صاعدة بقوة ضد الهبوط اللحظي',
        'الساعة 03:00 UTC تاريخياً ضعيفة السيولة بنسبة نجاح 40% فقط (-15% خصم)',
        'الثقة النهائية (15%) أقل بكثير من الحد الأدنى الصارم (65%)',
      ],
      reviewSteps: [
        { name: 'فحص النمط وتكراره التاريخي', passed: true, detail: 'تكرر 34 مرة في الذاكرة' },
        { name: 'توافق الأطر السبعة', passed: false, detail: 'فشل ذريع: 5 أطر تعارض الاتجاه الهابط' },
        { name: 'مراجعة توقيت التداول', passed: false, detail: 'الساعة 03:00 UTC ساعة هابطة السيولة' },
        { name: 'فحص الصفقات المفتوحة', passed: true, detail: 'لا تعارض مع صفقات أخرى' },
        { name: 'إدارة المخاطر والـ Cooldown', passed: true, detail: 'ضمن الحدود' },
      ],
    };

    return {
      decision,
      toastMessage: '🛡️ تم تطبيق السيناريو 2: رفض صفقة ETH لحماية رأس المال من مصيدة صعود!',
    };
  }

  if (scenarioId === 3) {
    // Scenario 3: SOL Wait & Monitor
    const decision: DecisionLog = {
      id: `dec-sc3-${now}`,
      timestamp: now,
      coin: 'SOLUSDT',
      baseTimeframe: '30m',
      direction: 'UP',
      status: 'WAIT',
      patternTag: 'P-U-2.0-90-R55-70-A30-40',
      initialConfidence: 62,
      adjustedConfidence: 74,
      finalConfidence: 74,
      supportingCount: 5,
      opposingCount: 0,
      reasons: [
        'النمط واعد للغاية وثقة 74% وتوافق 5/7 أطر، لكن تكرر 8 مرات فقط في الذاكرة (< 20 مطلوب)',
        'تم وضع النمط في قائمة المراقبة النشطة لمواصلة تجميع البيانات السلوكية دون مخاطرة',
      ],
      reviewSteps: [
        { name: 'فحص النمط وتكراره التاريخي', passed: false, detail: '8 تكرارات فقط (الحد الأدنى المطلوب 20)' },
        { name: 'توافق الأطر السبعة', passed: true, detail: '5 أطر داعمة بقوة' },
        { name: 'مراجعة توقيت التداول', passed: true, detail: 'توقيت مناسب' },
        { name: 'فحص الصفقات المفتوحة', passed: true, detail: 'مقبول' },
        { name: 'إدارة المخاطر والـ Cooldown', passed: true, detail: 'مقبول' },
      ],
    };

    return {
      decision,
      toastMessage: '⏸️ تم تطبيق السيناريو 3: قرار انتظار SOL لتجميع 20 تكرار في الذاكرة!',
    };
  }

  if (scenarioId === 4) {
    // Scenario 4: Smart Exit in action!
    const trade: Trade = {
      id: `tr-sc4-${now}`,
      coin: 'SOLUSDT',
      timeframe: '15m',
      direction: 'LONG',
      entryPrice: 202.4,
      currentPrice: 203.55,
      peakPrice: 204.05,
      targetPrice: 204.8,
      stopLossPrice: 201.2,
      targetPct: 1.18,
      stopLossPct: 0.59,
      sizeUsd: 500,
      leverage: 10,
      marginUsd: 50,
      entryTime: now - 38 * 60 * 1000,
      exitTime: now,
      durationMinutes: 38,
      expectedDurationMinutes: 45,
      status: 'CLOSED',
      exitPrice: 203.55,
      exitReason: 'SMART_EXIT',
      realizedPnLUsd: 2.85,
      realizedPnLPct: 0.57,
      currentPnLUsd: 2.85,
      currentPnLPct: 0.57,
      peakPnLPct: 0.81,
      isTrailingActive: true,
      patternTag: 'P-U-1.4-42-R47-68-A26-34',
      confidence: 76,
      supportingTimeframesCount: 5,
      learnedLesson: 'إغلاق ذكي (Smart Exit): تم حجز أرباح بقيمة +$2.85 عند تراجع السعر بنسبة 29.6% من القمة (+0.81%).',
    };

    return {
      trade,
      updatedStats: {
        balance: Number((currentStats.balance + 2.85).toFixed(2)),
        realizedPnL: Number((currentStats.realizedPnL + 2.85).toFixed(2)),
        winCount: currentStats.winCount + 1,
        totalTrades: currentStats.totalTrades + 1,
      },
      toastMessage: '⚡ تم تطبيق السيناريو 4: خروج ذكي (Smart Exit) وحجز أرباح القمة +$2.85!',
    };
  }

  // Scenario 5: Learn from Loss
  const trade: Trade = {
    id: `tr-sc5-${now}`,
    coin: 'SOLUSDT',
    timeframe: '15m',
    direction: 'LONG',
    entryPrice: 204.0,
    currentPrice: 202.98,
    peakPrice: 204.2,
    targetPrice: 205.8,
    stopLossPrice: 202.98,
    targetPct: 0.88,
    stopLossPct: 0.50,
    sizeUsd: 500,
    leverage: 10,
    marginUsd: 50,
    entryTime: now - 22 * 60 * 1000,
    exitTime: now,
    durationMinutes: 22,
    expectedDurationMinutes: 40,
    status: 'CLOSED',
    exitPrice: 202.98,
    exitReason: 'STOP_LOSS',
    realizedPnLUsd: -2.50,
    realizedPnLPct: -0.50,
    currentPnLUsd: -2.50,
    currentPnLPct: -0.50,
    peakPnLPct: 0.1,
    isTrailingActive: false,
    patternTag: 'P-U-1.2-30-R50-65-A20-25',
    confidence: 75,
    supportingTimeframesCount: 4,
    learnedLesson: 'قاعدة مكتسبة: عند تداول SOLUSDT ليلاً، اشترط توافق 5 أطر على الأقل بدلاً من 4 لتفادي الخسارة.',
  };

  return {
    trade,
    updatedStats: {
      balance: Number((currentStats.balance - 2.50).toFixed(2)),
      realizedPnL: Number((currentStats.realizedPnL - 2.50).toFixed(2)),
      lossCount: currentStats.lossCount + 1,
      totalTrades: currentStats.totalTrades + 1,
      consecutiveLosses: currentStats.consecutiveLosses + 1,
    },
    toastMessage: '📚 تم تطبيق السيناريو 5: تحديث الذاكرة بعد وقف الخسارة وتسجيل قاعدة جديدة!',
  };
}
