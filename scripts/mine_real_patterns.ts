import fs from 'fs';
import path from 'path';
import { mineMultipleSymbols, mergeMinedPatterns } from '../src/services/behavior/historicalPatternMiner';
import { Timeframe } from '../src/types';

async function main() {
  console.log('=== REAL BINANCE HISTORICAL PATTERN MINER ===');
  console.log('Fetching authentic historical candles from Binance for supported coins...');

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'AVAXUSDT'];
  const timeframes: Timeframe[] = ['15m', '1h'];

  const memoryFile = path.join(process.cwd(), 'data', 'memory.json');
  let memoryData: any = {};
  if (fs.existsSync(memoryFile)) {
    memoryData = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
  }

  const existingPatterns = memoryData.patterns || [];
  console.log(`Current patterns in memory: ${existingPatterns.length}`);

  const { patterns, swings, totalCandles } = await mineMultipleSymbols(
    symbols,
    timeframes,
    1000,
    (msg, pct) => {
      console.log(`[${pct}%] ${msg}`);
    }
  );

  console.log(`Mined ${patterns.length} authentic patterns across ${totalCandles} candles.`);

  const merged = mergeMinedPatterns(existingPatterns, patterns);
  memoryData.patterns = merged;
  memoryData.swings = (memoryData.swings || []).concat(swings).slice(-1000); // keep last 1000 swings

  fs.writeFileSync(memoryFile, JSON.stringify(memoryData, null, 2), 'utf-8');
  console.log(`Successfully saved ${merged.length} authentic real patterns to data/memory.json!`);

  // Print summary by coin
  const countByCoin: Record<string, number> = {};
  merged.forEach((p: any) => {
    countByCoin[p.coin] = (countByCoin[p.coin] || 0) + 1;
  });
  console.log('Patterns count by coin:', countByCoin);
}

main().catch(err => {
  console.error('Fatal error during pattern mining:', err);
  process.exit(1);
});
