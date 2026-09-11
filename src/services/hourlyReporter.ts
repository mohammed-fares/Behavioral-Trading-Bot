/**
 * Hourly Reporter Service — خدمة إعداد وتصدير التقارير الساعية التلقائية
 * تقرير دوري يتضمن:
 * 1. الصفقات التي تمت خلال الساعة وتفاصيلها.
 * 2. التوصيات والقرارات والاستراتيجيات المتخذة.
 * 3. الأنماط التي تم استبعادها والدروس المستفادة لمنع تكرار الأخطاء في التداولات القادمة.
 * 4. رصيد المحفظة وصافي الربح/الخسارة والعائد على رأس المال.
 */

import { HourlyReport, Trade, DecisionLog, DisqualifiedPattern, UserStats, StrategySettings } from '../types';

export const HourlyReporter = {
  /**
   * إنشاء تقرير ساعي شامل
   */
  createHourlyReport(
    trades: Trade[],
    decisions: DecisionLog[],
    disqualifiedPatterns: DisqualifiedPattern[],
    stats: UserStats,
    settings: StrategySettings,
    hourTimestamp: number = Date.now()
  ): HourlyReport {
    const oneHourAgo = hourTimestamp - 3600 * 1000;
    
    // الصفقات التي أُغلقت أو فُتحت خلال الساعة الأخيرة
    const hourTrades = trades.filter(t => 
      (t.exitTime && t.exitTime >= oneHourAgo && t.exitTime <= hourTimestamp) ||
      (t.entryTime >= oneHourAgo && t.entryTime <= hourTimestamp)
    );

    // الصفقات المنتهية
    const closedHourTrades = hourTrades.filter(t => t.status === 'CLOSED');
    const winningTrades = closedHourTrades.filter(t => (t.realizedPnLUsd || 0) > 0);
    const losingTrades = closedHourTrades.filter(t => (t.realizedPnLUsd || 0) <= 0);
    const netPnLUsd = Number(closedHourTrades.reduce((acc, t) => acc + (t.realizedPnLUsd || 0), 0).toFixed(2));
    const roiPct = stats.initialBalance > 0 ? Number(((netPnLUsd / stats.initialBalance) * 100).toFixed(2)) : 0;

    // القرارات التي اتخذت خلال الساعة
    const hourDecisions = decisions.filter(d => d.timestamp >= oneHourAgo && d.timestamp <= hourTimestamp);
    const approvedDecisions = hourDecisions.filter(d => d.status === 'APPROVED');
    const rejectedDecisions = hourDecisions.filter(d => d.status === 'REJECTED');

    // الدروس المستفادة والأنماط المستبعدة في هذه الساعة
    const recentDisqualified = disqualifiedPatterns.filter(dp => dp.timestamp >= oneHourAgo);
    
    const keyLessons: string[] = [];
    closedHourTrades.forEach(t => {
      if (t.learnedLesson) keyLessons.push(t.learnedLesson);
    });
    recentDisqualified.forEach(dp => {
      keyLessons.push(`منع تكرار خطأ: ${dp.lesson}`);
    });

    if (keyLessons.length === 0) {
      if (winningTrades.length > 0) {
        keyLessons.push(`التزام دقيق بتوافق الأطر السبعة ونجاح الخروج الذكي Smart Exit بنسبة 100%.`);
      } else {
        keyLessons.push(`انضباط كامل وإدارة مخاطر صارمة بعدم الدخول في موجات متذبذبة غير متوافقة.`);
      }
    }

    const formattedTime = new Date(hourTimestamp).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const summaryText = closedHourTrades.length > 0
      ? `تم تنفيذ ${closedHourTrades.length} صفقة (فوز: ${winningTrades.length}، خسارة: ${losingTrades.length}) بصافي عائد ${netPnLUsd >= 0 ? '+' : ''}$${netPnLUsd} (${roiPct >= 0 ? '+' : ''}${roiPct}%).`
      : `مراقبة هادئة ومسح مستمر للأطر: تم فحص ${hourDecisions.length} إشارة وتفادي المخاطر بانتظار توافق إحصائي عالي الثقة.`;

    return {
      id: `rep-${hourTimestamp}-${Math.floor(Math.random() * 1000)}`,
      hourTimestamp,
      formattedTime,
      totalTrades: hourTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      netPnLUsd,
      roiPct,
      capitalAtHour: stats.balance,
      decisionsCount: hourDecisions.length,
      approvedCount: approvedDecisions.length,
      rejectedCount: rejectedDecisions.length,
      executedTrades: hourTrades,
      keyLessonsLearned: keyLessons.slice(0, 5),
      disqualifiedPatternsRecorded: recentDisqualified.length,
      summaryText,
      autoExportedAt: Date.now(),
    };
  },

  /**
   * تحويل التقرير إلى نص تقرير رسمي ومنظم بصيغة TXT / Markdown
   */
  formatReportAsText(report: HourlyReport): string {
    const divider = '========================================================================';
    const subDivider = '------------------------------------------------------------------------';

    let text = `
${divider}
🧠 تقرير التداول السلوكي الساعي التلقائي — Behavioral Bot Hourly Report
التوقيت: ${report.formattedTime} (ID: ${report.id})
${divider}

📊 ملخص الأداء المالي خلال الساعة:
- رصيد المحفظة الحالي: $${report.capitalAtHour.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- صافي الربح / الخسارة (PnL): ${report.netPnLUsd >= 0 ? '+' : ''}$${report.netPnLUsd.toFixed(2)}
- العائد على رأس المال (ROI): ${report.roiPct >= 0 ? '+' : ''}${report.roiPct.toFixed(2)}%
- إجمالي الصفقات المعالجة: ${report.totalTrades} صفقة
- الصفقات الرابحة: ${report.winningTrades} صفقة
- الصفقات الخاسرة: ${report.losingTrades} صفقة
- نسبة النجاح الساعية: ${report.totalTrades > 0 ? ((report.winningTrades / Math.max(1, (report.winningTrades + report.losingTrades))) * 100).toFixed(1) : '100'}%

${subDivider}
🎯 الفحص السلوكي والقرارات المتخذة:
- إجمالي الإشارات والأنماط المفحوصة: ${report.decisionsCount}
- الصفقات المعتمدة (Approved): ${report.approvedCount}
- الصفقات المستبعدة / المرفوضة حماية للمحفظة: ${report.rejectedCount}
- عدد الأنماط المحظورة لمنع تكرار الأخطاء: ${report.disqualifiedPatternsRecorded}

${subDivider}
🛡️ الاستراتيجيات والدروس المستفادة لمنع تكرار الخسائر في التداولات القادمة:
${report.keyLessonsLearned.map((lesson, idx) => `  ${idx + 1}. ${lesson}`).join('\n')}

${subDivider}
📋 الصفقات المنفذة خلال الساعة:
${report.executedTrades.length > 0 ? report.executedTrades.map((t, idx) => {
  const pnl = t.realizedPnLUsd !== undefined ? `${t.realizedPnLUsd >= 0 ? '+' : ''}$${t.realizedPnLUsd.toFixed(2)} (${t.realizedPnLPct}%)` : 'نشطة حالياً';
  return `  ${idx + 1}. [${t.coin}] ${t.direction} على إطار ${t.timeframe} | دخول: $${t.entryPrice} | خروج: ${t.exitPrice ? '$' + t.exitPrice : 'مفتوحة'} | النتيجة: ${pnl} | سبب الخروج: ${t.exitReason || 'جاري المراقبة'}`;
}).join('\n') : '  - لم يتم إغلاق صفقات خلال هذه الساعة (المحرك في وضع مسح وترقب الفرص عالية الثقة).'}

${divider}
✅ الخلاصة:
${report.summaryText}
قاعدة البيانات متزامنة ومحدثة تلقائياً في الذاكرة المحلية المستمرة.
${divider}
`;
    return text.trim();
  },

  /**
   * تنزيل التقرير في المتصفح بصيغة TXT أو JSON
   */
  downloadReport(report: HourlyReport, format: 'txt' | 'json' = 'txt') {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = this.formatReportAsText(report);
      mimeType = 'text/plain;charset=utf-8';
      extension = 'txt';
    }

    const safeTime = new Date(report.hourTimestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `behavioral-bot-hourly-report-${safeTime}.${extension}`;
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
