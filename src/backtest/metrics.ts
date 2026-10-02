import { BacktestMetrics, Position } from '../types/trading';

export function calculateBacktestMetrics(
  trades: Position[],
  initialBalance: number = 10000,
  equityCurve: { time: number; equity: number; drawdown: number }[]
): BacktestMetrics {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnl: 0,
      netPnlPercent: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageTrade: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      averageRMultiple: 0,
      expectancy: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      recoveryFactor: 0,
      longPerformance: { trades: 0, winRate: 0, pnl: 0, profitFactor: 0 },
      shortPerformance: { trades: 0, winRate: 0, pnl: 0, profitFactor: 0 },
      sessionPerformance: {},
      monthlyPerformance: {},
      equityCurve: [{ time: Date.now() / 1000, equity: initialBalance, drawdown: 0 }],
    };
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let totalR = 0;

  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  const returns: number[] = [];
  const downsideReturns: number[] = [];

  const longTrades = trades.filter((t) => t.direction === 'LONG');
  const shortTrades = trades.filter((t) => t.direction === 'SHORT');

  const sessionPerf: Record<string, { trades: number; pnl: number; wins: number; winRate: number }> = {};
  const monthlyPerf: Record<string, { trades: number; pnl: number; wins: number; winRate: number }> = {};

  trades.forEach((trade) => {
    const netTradePnl = trade.realizedPnl - trade.feesPaid;
    const r = trade.rMultiple || 0;
    totalR += r;

    const returnPct = netTradePnl / initialBalance;
    returns.push(returnPct);
    if (returnPct < 0) {
      downsideReturns.push(returnPct);
    }

    if (netTradePnl > 0.01) {
      winningTrades++;
      grossProfit += netTradePnl;
      largestWin = Math.max(largestWin, netTradePnl);

      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (netTradePnl < -0.01) {
      losingTrades++;
      grossLoss += Math.abs(netTradePnl);
      largestLoss = Math.max(largestLoss, Math.abs(netTradePnl));

      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    } else {
      breakEvenTrades++;
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    // Session performance
    const d = new Date(trade.entryTime * 1000);
    const hour = d.getUTCHours();
    const sessionKey =
      hour >= 13 && hour < 21 ? 'NEW_YORK' : hour >= 8 && hour < 16 ? 'LONDON' : 'ASIA';

    if (!sessionPerf[sessionKey]) {
      sessionPerf[sessionKey] = { trades: 0, pnl: 0, wins: 0, winRate: 0 };
    }
    sessionPerf[sessionKey].trades++;
    sessionPerf[sessionKey].pnl += netTradePnl;
    if (netTradePnl > 0) sessionPerf[sessionKey].wins++;

    // Monthly performance
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!monthlyPerf[monthKey]) {
      monthlyPerf[monthKey] = { trades: 0, pnl: 0, wins: 0, winRate: 0 };
    }
    monthlyPerf[monthKey].trades++;
    monthlyPerf[monthKey].pnl += netTradePnl;
    if (netTradePnl > 0) monthlyPerf[monthKey].wins++;
  });

  const netPnl = grossProfit - grossLoss;
  const netPnlPercent = (netPnl / initialBalance) * 100;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
  const averageTrade = totalTrades > 0 ? netPnl / totalTrades : 0;
  const averageWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const averageRMultiple = totalTrades > 0 ? totalR / totalTrades : 0;

  // Expectancy = (Win% * Avg Win) - (Loss% * Avg Loss)
  const winProb = winningTrades / totalTrades;
  const lossProb = losingTrades / totalTrades;
  const expectancy = winProb * averageWin - lossProb * averageLoss;

  // Max Drawdown calculation from equity curve
  let maxDDVal = 0;
  let maxDDPct = 0;
  for (const pt of equityCurve) {
    if (pt.drawdown > maxDDPct) {
      maxDDPct = pt.drawdown;
    }
  }
  maxDDVal = (initialBalance * maxDDPct) / 100;

  // Sharpe and Sortino (annualized with 365 days / 252 periods assumption)
  const meanReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  const downsideVariance =
    downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (downsideReturns.length || 1);
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (meanReturn / downsideStdDev) * Math.sqrt(252) : 0;

  const recoveryFactor = maxDDVal > 0 ? netPnl / maxDDVal : 0;

  // Directional Breakdown
  const calcSub = (subTrades: Position[]) => {
    const wins = subTrades.filter((t) => t.realizedPnl - t.feesPaid > 0).length;
    const pnl = subTrades.reduce((acc, t) => acc + (t.realizedPnl - t.feesPaid), 0);
    const gProf = subTrades.reduce((acc, t) => {
      const p = t.realizedPnl - t.feesPaid;
      return p > 0 ? acc + p : acc;
    }, 0);
    const gLoss = subTrades.reduce((acc, t) => {
      const p = t.realizedPnl - t.feesPaid;
      return p < 0 ? acc + Math.abs(p) : acc;
    }, 0);

    return {
      trades: subTrades.length,
      winRate: subTrades.length > 0 ? (wins / subTrades.length) * 100 : 0,
      pnl,
      profitFactor: gLoss > 0 ? gProf / gLoss : gProf > 0 ? 99 : 0,
    };
  };

  // Populate win rates for session and monthly
  const finalSessionPerf: Record<string, { trades: number; pnl: number; winRate: number }> = {};
  for (const [k, v] of Object.entries(sessionPerf)) {
    finalSessionPerf[k] = {
      trades: v.trades,
      pnl: v.pnl,
      winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0,
    };
  }

  const finalMonthlyPerf: Record<string, { trades: number; pnl: number; winRate: number }> = {};
  for (const [k, v] of Object.entries(monthlyPerf)) {
    finalMonthlyPerf[k] = {
      trades: v.trades,
      pnl: v.pnl,
      winRate: v.trades > 0 ? (v.wins / v.trades) * 100 : 0,
    };
  }

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate,
    grossProfit,
    grossLoss,
    netPnl,
    netPnlPercent,
    profitFactor,
    maxDrawdown: maxDDVal,
    maxDrawdownPercent: maxDDPct,
    averageTrade,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    consecutiveWins: maxWinStreak,
    consecutiveLosses: maxLossStreak,
    averageRMultiple,
    expectancy,
    sharpeRatio,
    sortinoRatio,
    recoveryFactor,
    longPerformance: calcSub(longTrades),
    shortPerformance: calcSub(shortTrades),
    sessionPerformance: finalSessionPerf,
    monthlyPerformance: finalMonthlyPerf,
    equityCurve,
  };
}
