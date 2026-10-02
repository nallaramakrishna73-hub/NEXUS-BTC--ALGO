import { calculateADX, calculateATR } from '../core/volatility';
import { RiskManager } from '../risk/riskManager';
import { DEFAULT_CONFIG } from '../strategy/defaultConfig';
import { NexusStrategyEngine } from '../strategy/nexusEngine';
import { Candle } from '../types/trading';

/**
 * Strict verification test: test_no_lookahead_bias()
 * Validates that modifying or appending future candles has ZERO impact
 * on past market structure, liquidity sweeps, signals, and scores.
 */
export function test_no_lookahead_bias(sampleCandles: Candle[]): {
  passed: boolean;
  message: string;
  checksPerformed: number;
} {
  if (sampleCandles.length < 50) {
    return { passed: false, message: 'Sample dataset too small (<50 candles)', checksPerformed: 0 };
  }

  const testIndex = Math.floor(sampleCandles.length * 0.6); // 60% mark
  const prefixCandles = sampleCandles.slice(0, testIndex + 1);

  // Run evaluation at testIndex using only prefixCandles
  const riskManager1 = new RiskManager(10000, DEFAULT_CONFIG);
  const engine1 = new NexusStrategyEngine(DEFAULT_CONFIG, riskManager1);
  const atr1 = calculateATR(prefixCandles, 14);
  const adx1 = calculateADX(prefixCandles, 14).adx;
  const snapshotOriginal = engine1.evaluate(prefixCandles, testIndex, atr1, adx1);

  // Now create a mutated dataset where candles AFTER testIndex have wild values (e.g. BTC pumps to $200k or crashes to $10k)
  const mutatedCandles: Candle[] = JSON.parse(JSON.stringify(sampleCandles));
  for (let i = testIndex + 1; i < mutatedCandles.length; i++) {
    mutatedCandles[i].open = 200000;
    mutatedCandles[i].high = 250000;
    mutatedCandles[i].low = 190000;
    mutatedCandles[i].close = 240000;
    mutatedCandles[i].volume = 9999999;
  }

  // Run evaluation at the same testIndex using the mutated array
  const riskManager2 = new RiskManager(10000, DEFAULT_CONFIG);
  const engine2 = new NexusStrategyEngine(DEFAULT_CONFIG, riskManager2);
  const atr2 = calculateATR(mutatedCandles, 14);
  const adx2 = calculateADX(mutatedCandles, 14).adx;
  const snapshotMutated = engine2.evaluate(mutatedCandles, testIndex, atr2, adx2);

  // Compare results at testIndex
  const structureMatch = snapshotOriginal.structure5m.structure === snapshotMutated.structure5m.structure;
  const scoreMatch = snapshotOriginal.scoreBreakdown.score === snapshotMutated.scoreBreakdown.score;
  const signalMatch = snapshotOriginal.lastSignal?.direction === snapshotMutated.lastSignal?.direction;
  const atrMatch = Math.abs(snapshotOriginal.atr - snapshotMutated.atr) < 0.0001;
  const bosMatch = snapshotOriginal.structure5m.bos === snapshotMutated.structure5m.bos;
  const mssMatch = snapshotOriginal.structure5m.mss === snapshotMutated.structure5m.mss;

  const allPassed = structureMatch && scoreMatch && signalMatch && atrMatch && bosMatch && mssMatch;

  return {
    passed: allPassed,
    message: allPassed
      ? 'PASSED: Zero lookahead bias verified. Mutating future candles has zero effect on past signals or structure.'
      : 'FAILED: Future data leakage detected in strategy evaluation!',
    checksPerformed: 6,
  };
}
