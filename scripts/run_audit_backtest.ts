import { BacktestEngine } from '../src/services/backtest/backtestEngine';
import { DEFAULT_SETTINGS } from '../src/services/seedData';

async function main() {
  console.log('[BACKTEST_AUDIT] Starting real historical backtest for BTCUSDT 15m...');
  try {
    const { totalResult, inSample, outOfSample } = await BacktestEngine.runBacktest(
      'BTCUSDT',
      '15m',
      DEFAULT_SETTINGS,
      {
        initialCapitalUsd: 100,
        leverage: 10,
        takerFeeRate: 0.0004,
        slippagePct: 0.02
      }
    );

    console.log('\n===== REAL BACKTEST AUDIT RESULTS (BTCUSDT 15m) =====');
    console.log(`Total Candles Analyzed: 1000 candles`);
    console.log(`Period: ${new Date(totalResult.startTime).toISOString()} to ${new Date(totalResult.endTime).toISOString()}`);
    console.log(`Total Trades: ${totalResult.totalTrades}`);
    console.log(`Winning Trades: ${totalResult.winningTrades}`);
    console.log(`Losing Trades: ${totalResult.losingTrades}`);
    console.log(`Win Rate: ${totalResult.winRatePct}%`);
    console.log(`Profit Factor: ${totalResult.profitFactor}`);
    console.log(`Sharpe Ratio: ${totalResult.sharpeRatio}`);
    console.log(`Sortino Ratio: ${totalResult.sortinoRatio}`);
    console.log(`Max Drawdown: ${totalResult.maxDrawdownPct}%`);
    console.log(`Total Return Pct: ${totalResult.totalReturnPct}%`);
    console.log(`Total Fees Paid: $${totalResult.totalFeesUsd}`);
    console.log(`Slippage Cost: $${totalResult.slippagePaidUsd}`);
    console.log(`Benchmark Buy & Hold: ${totalResult.buyAndHoldReturnPct}%`);

    const isOperable = totalResult.sharpeRatio > 1 && totalResult.maxDrawdownPct < 20;
    console.log(`\nOperable Verdict (Sharpe > 1 && MaxDD < 20%): ${isOperable ? 'YES (قابلة للتشغيل)' : 'NO (غير قابلة للتشغيل بحالتها الحالية)'}`);
  } catch (err: any) {
    console.error('[BACKTEST_AUDIT_ERROR] Failed:', err.message);
  }
}

main();
