import { Trade, PatternStats } from '../../types';

export function learnFromClosedTrade(
  closedTrade: Trade,
  patterns: PatternStats[]
): { updatedPatterns: PatternStats[]; learnedLesson: string } {
  const isWin = (closedTrade.realizedPnLUsd || 0) > 0;
  const currentHour = new Date(closedTrade.entryTime).getUTCHours();
  let learnedLesson = '';

  let matched = false;
  const updatedPatterns = patterns.map(p => {
    if (p.tag === closedTrade.patternTag && p.coin === closedTrade.coin) {
      matched = true;
      const newOcc = p.occurrences + 1;
      const newCont = isWin ? p.continuedCount + 1 : p.continuedCount;
      const newRev = !isWin ? p.reversedCount + 1 : p.reversedCount;
      const newContRate = Number(((newCont / newOcc) * 100).toFixed(1));
      const newRevRate = Number(((newRev / newOcc) * 100).toFixed(1));

      // Bayesian Conjugate Update using Beta(alpha_0=2, beta_0=2) informative prior
      const alpha = newCont + 2;
      const beta = newRev + 2;
      const total = alpha + beta;
      const posteriorMean = alpha / total;
      const posteriorVar = (alpha * beta) / (Math.pow(total, 2) * (total + 1));
      const posteriorStd = Math.sqrt(posteriorVar);
      // Conservative Bayesian lower-bound confidence
      const bayesianConfidence = Math.round(Math.min(98, Math.max(15, (posteriorMean - 0.5 * posteriorStd) * 100)));

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
        confidence: bayesianConfidence,
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

  if (!matched && closedTrade.patternTag) {
    // Initialize new pattern in memory with Bayesian prior
    const alpha = (isWin ? 1 : 0) + 2;
    const beta = (!isWin ? 1 : 0) + 2;
    const total = alpha + beta;
    const posteriorMean = alpha / total;
    const bayesianConfidence = Math.round(posteriorMean * 100);

    updatedPatterns.push({
      tag: closedTrade.patternTag,
      coin: closedTrade.coin,
      timeframe: closedTrade.timeframe,
      direction: closedTrade.direction === 'SHORT' ? 'DOWN' : 'UP',
      magnitudePct: Math.abs(closedTrade.targetPct || 1.5),
      durationMinutes: 30,
      occurrences: 1,
      continuedCount: isWin ? 1 : 0,
      reversedCount: !isWin ? 1 : 0,
      sidewaysCount: 0,
      continuationRate: isWin ? 100 : 0,
      reversalRate: !isWin ? 100 : 0,
      sidewaysRate: 0,
      avgSubsequentMovePct: Math.abs(closedTrade.targetPct || 1.5),
      avgSubsequentDuration: 30,
      confidence: bayesianConfidence,
      lastOccurredAt: Date.now(),
      bestHours: {
        [currentHour]: {
          count: 1,
          winRate: isWin ? 100 : 0,
          avgProfit: closedTrade.realizedPnLPct || 0,
        }
      },
    });
  }

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
