import { MonteCarloSimulation, Position } from '../types/trading';

/**
 * Runs Monte Carlo simulation with trade order reshuffling and slippage variance
 */
export function runMonteCarloSimulation(
  trades: Position[],
  initialBalance: number = 10000,
  iterations: number = 500
): MonteCarloSimulation {
  if (trades.length === 0) {
    return {
      iterations: 0,
      confidenceIntervals: { p5: initialBalance, p25: initialBalance, p50: initialBalance, p75: initialBalance, p95: initialBalance },
      maxDrawdownDistribution: [],
      losingStreakDistribution: [],
      equityPaths: [],
    };
  }

  const tradePnls = trades.map((t) => t.realizedPnl - t.feesPaid);
  const finalEquities: number[] = [];
  const maxDrawdowns: number[] = [];
  const losingStreaks: number[] = [];
  const sampledPaths: { iteration: number; values: number[] }[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    let currentBalance = initialBalance;
    let peakBalance = initialBalance;
    let maxDd = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    const pathValues: number[] = [initialBalance];

    for (let t = 0; t < tradePnls.length; t++) {
      // Random trade selection with replacement
      const randomIndex = Math.floor(Math.random() * tradePnls.length);
      const basePnl = tradePnls[randomIndex];

      // Add random slippage / execution variance (+/- 5%)
      const noise = (Math.random() - 0.5) * 0.10 * Math.abs(basePnl);
      const simulatedPnl = basePnl + noise;

      currentBalance += simulatedPnl;

      // Track streaks
      if (simulatedPnl < 0) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }

      // Track drawdown
      if (currentBalance > peakBalance) peakBalance = currentBalance;
      const dd = peakBalance > 0 ? ((peakBalance - currentBalance) / peakBalance) * 100 : 0;
      if (dd > maxDd) maxDd = dd;

      pathValues.push(Math.round(currentBalance));
    }

    finalEquities.push(currentBalance);
    maxDrawdowns.push(Math.round(maxDd * 10) / 10);
    losingStreaks.push(maxStreak);

    // Save up to 10 sample paths for visualization
    if (iter < 10) {
      sampledPaths.push({ iteration: iter + 1, values: pathValues });
    }
  }

  // Sort final equities to extract percentiles
  finalEquities.sort((a, b) => a - b);
  const getP = (p: number) => finalEquities[Math.floor((p / 100) * (finalEquities.length - 1))];

  return {
    iterations,
    confidenceIntervals: {
      p5: Math.round(getP(5)),
      p25: Math.round(getP(25)),
      p50: Math.round(getP(50)),
      p75: Math.round(getP(75)),
      p95: Math.round(getP(95)),
    },
    maxDrawdownDistribution: maxDrawdowns,
    losingStreakDistribution: losingStreaks,
    equityPaths: sampledPaths,
  };
}
