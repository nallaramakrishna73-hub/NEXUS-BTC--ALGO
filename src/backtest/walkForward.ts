import { BacktestEngine } from './backtestEngine';
import { Candle, StrategyConfig, WalkForwardResult } from '../types/trading';

/**
 * Executes Walk-Forward analysis across rolling In-Sample (Train) and Out-of-Sample (Forward Test) windows
 */
export function runWalkForwardAnalysis(
  candles: Candle[],
  config: StrategyConfig,
  windows: number = 3
): WalkForwardResult {
  if (candles.length < 150) {
    return { periods: [], overallEfficiency: 0 };
  }

  const windowSize = Math.floor(candles.length / windows);
  const trainRatio = 0.70; // 70% Train, 30% Test

  const periods: WalkForwardResult['periods'] = [];
  let totalEfficiency = 0;

  for (let w = 0; w < windows; w++) {
    const startIdx = w * Math.floor(windowSize * 0.5);
    const endIdx = Math.min(candles.length, startIdx + windowSize);

    if (endIdx - startIdx < 60) continue;

    const segmentCandles = candles.slice(startIdx, endIdx);
    const splitPoint = Math.floor(segmentCandles.length * trainRatio);

    const trainCandles = segmentCandles.slice(0, splitPoint);
    const testCandles = segmentCandles.slice(splitPoint);

    if (trainCandles.length < 35 || testCandles.length < 20) continue;

    const trainRes = BacktestEngine.runBacktest({ candles: trainCandles, config, initialBalance: 10000 });
    const testRes = BacktestEngine.runBacktest({ candles: testCandles, config, initialBalance: 10000 });

    const trainPF = trainRes.metrics.profitFactor;
    const testPF = testRes.metrics.profitFactor;

    // Walk forward efficiency: Test PF / Train PF (capped between 0 and 2)
    const efficiency = trainPF > 0 ? Math.min(2, Math.max(0, testPF / trainPF)) : 0;
    totalEfficiency += efficiency;

    const formatDate = (ts: number) => new Date(ts * 1000).toISOString().slice(5, 10);

    periods.push({
      periodIndex: w + 1,
      trainRange: [formatDate(trainCandles[0].time), formatDate(trainCandles[trainCandles.length - 1].time)],
      testRange: [formatDate(testCandles[0].time), formatDate(testCandles[testCandles.length - 1].time)],
      trainWinRate: Math.round(trainRes.metrics.winRate * 10) / 10,
      trainProfitFactor: Math.round(trainPF * 100) / 100,
      testWinRate: Math.round(testRes.metrics.winRate * 10) / 10,
      testProfitFactor: Math.round(testPF * 100) / 100,
      robustnessScore: Math.round(efficiency * 100),
    });
  }

  const overallEfficiency = periods.length > 0 ? Math.round((totalEfficiency / periods.length) * 100) : 0;

  return {
    periods,
    overallEfficiency,
  };
}
