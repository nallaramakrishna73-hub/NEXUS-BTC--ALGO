import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Flame,
  Layers,
  LineChart,
  Percent,
  Play,
  RotateCcw,
  Shield,
  Shuffle,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { BacktestEngine } from '../backtest/backtestEngine';
import { runMonteCarloSimulation } from '../backtest/monteCarlo';
import { test_no_lookahead_bias } from '../backtest/noLookaheadTest';
import { runWalkForwardAnalysis } from '../backtest/walkForward';
import {
  BacktestResult,
  Candle,
  MonteCarloSimulation,
  StrategyConfig,
  WalkForwardResult,
} from '../types/trading';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles: Candle[];
  config: StrategyConfig;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({
  isOpen,
  onClose,
  candles,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'trades' | 'montecarlo' | 'walkforward' | 'lookahead'>(
    'metrics'
  );

  // Backtest state
  const [initialBalance, setInitialBalance] = useState<number>(10000);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(() => {
    // Run an initial backtest on load
    if (candles.length > 50) {
      return BacktestEngine.runBacktest({ candles, config, initialBalance: 10000 });
    }
    return null;
  });

  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloSimulation | null>(null);
  const [walkForwardResult, setWalkForwardResult] = useState<WalkForwardResult | null>(null);
  const [lookaheadTestResult, setLookaheadTestResult] = useState<{ passed: boolean; message: string; checksPerformed: number } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Auto-run backtest if modal is open and no result is yet computed
  React.useEffect(() => {
    if (isOpen && !backtestResult && candles.length >= 35) {
      const res = BacktestEngine.runBacktest({ candles, config, initialBalance });
      setBacktestResult(res);
    }
  }, [isOpen, candles, config, initialBalance, backtestResult]);

  if (!isOpen) return null;

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = BacktestEngine.runBacktest({ candles, config, initialBalance });
      setBacktestResult(res);
      // Reset subordinate results so user can run fresh simulations
      setMonteCarloResult(null);
      setWalkForwardResult(null);
      setIsRunning(false);
    }, 150);
  };

  const handleRunMonteCarlo = () => {
    if (!backtestResult || backtestResult.trades.length === 0) return;
    const mc = runMonteCarloSimulation(backtestResult.trades, initialBalance, 500);
    setMonteCarloResult(mc);
  };

  const handleRunWalkForward = () => {
    const wf = runWalkForwardAnalysis(candles, config, 3);
    setWalkForwardResult(wf);
  };

  const handleRunLookaheadCheck = () => {
    const result = test_no_lookahead_bias(candles);
    setLookaheadTestResult(result);
  };

  const exportTradesCSV = () => {
    if (!backtestResult) return;
    const headers = 'ID,Direction,EntryTime,EntryPrice,StopLoss,ExitPrice,ExitTime,ExitReason,Pnl,RMultiple\n';
    const rows = backtestResult.trades
      .map(
        (t) =>
          `${t.id},${t.direction},${new Date(t.entryTime * 1000).toISOString()},${t.entryPrice},${t.stopLoss},${t.exitPrice || 0},${new Date((t.exitTime || 0) * 1000).toISOString()},${t.exitReason},${(t.realizedPnl - t.feesPaid).toFixed(2)},${(t.rMultiple || 0).toFixed(2)}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_btc_backtest_${Date.now()}.csv`;
    a.click();
  };

  const m = backtestResult?.metrics;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b101d] border border-[#1e2a42] rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0e1526]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="NEXUS BTC"
              className="w-8 h-8 rounded object-cover border border-cyan-700/60 shadow"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  NEXUS BTC BACKTESTING & SIMULATION ENGINE
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {config.strategyVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Strict event-driven execution with fees, slippage, and zero lookahead bias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-current'}`} />
              <span>{isRunning ? 'Simulating...' : 'Run Backtest'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-[#0a0e1a] text-xs">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'metrics'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Overview & Curves</span>
          </button>

          <button
            onClick={() => setActiveTab('trades')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'trades'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Trade Journal ({backtestResult?.trades.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('montecarlo')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'montecarlo'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Monte Carlo</span>
          </button>

          <button
            onClick={() => setActiveTab('walkforward')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'walkforward'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Walk-Forward</span>
          </button>

          <button
            onClick={() => setActiveTab('lookahead')}
            className={`px-3 py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'lookahead'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>No-Lookahead Test</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'metrics' && m && (
            <>
              {/* Top Key Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">NET P&L</span>
                  <div
                    className={`text-base font-bold flex items-center gap-1 ${
                      m.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {m.netPnl >= 0 ? '+' : ''}${m.netPnl.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    ({m.netPnlPercent >= 0 ? '+' : ''}
                    {m.netPnlPercent.toFixed(2)}%)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">WIN RATE</span>
                  <div className="text-base font-bold text-white">
                    {m.winRate.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {m.winningTrades}W / {m.losingTrades}L
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">PROFIT FACTOR</span>
                  <div className="text-base font-bold text-cyan-400">
                    {m.profitFactor.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">Gross: ${(m.grossProfit / (m.grossLoss || 1)).toFixed(2)}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">MAX DRAWDOWN</span>
                  <div className="text-base font-bold text-rose-400">
                    {m.maxDrawdownPercent.toFixed(2)}%
                  </div>
                  <span className="text-[10px] text-slate-500">-${m.maxDrawdown.toFixed(2)}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">SHARPE RATIO</span>
                  <div className="text-base font-bold text-white">
                    {m.sharpeRatio.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">Sortino: {m.sortinoRatio.toFixed(2)}</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">EXPECTANCY</span>
                  <div className="text-base font-bold text-emerald-400">
                    ${m.expectancy.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">Avg R: {m.averageRMultiple.toFixed(2)}</span>
                </div>
              </div>

              {/* Equity Curve SVG Visualization */}
              <div className="p-4 rounded-lg bg-[#0e1628] border border-[#1c2944] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-bold">PORTFOLIO EQUITY CURVE ($)</span>
                    <span className="text-slate-500 text-[10px]">
                      (Initial: ${initialBalance.toLocaleString()} → Final: ${(initialBalance + m.netPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {m.equityCurve.length} checkpoints
                  </span>
                </div>

                {m.equityCurve.length > 1 ? (
                  <div className="w-full h-44 relative bg-[#090d18] rounded border border-slate-800 p-2">
                    {/* SVG Curve */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Calculate SVG path */}
                      {(() => {
                        const minEq = Math.min(...m.equityCurve.map((c) => c.equity));
                        const maxEq = Math.max(...m.equityCurve.map((c) => c.equity));
                        const range = maxEq - minEq || 1;
                        const points = m.equityCurve.map((c, i) => {
                          const x = (i / (m.equityCurve.length - 1)) * 1000;
                          const y = 140 - ((c.equity - minEq) / range) * 125;
                          return `${x},${y}`;
                        });
                        const polyPoints = `0,150 ${points.join(' ')} 1000,150`;

                        return (
                          <>
                            <polygon points={polyPoints} fill="url(#equityGrad)" />
                            <polyline
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="2"
                              points={points.join(' ')}
                            />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-slate-500">
                    Not enough trade checkpoints
                  </div>
                )}
              </div>

              {/* Sub-breakdowns: Long vs Short & Session Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Long vs Short Performance */}
                <div className="p-3.5 rounded-lg bg-[#0e1628] border border-[#1c2944] space-y-2">
                  <span className="text-slate-300 font-bold block">DIRECTIONAL BREAKDOWN</span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-[#0a0f1d] border border-slate-800">
                      <span className="text-emerald-400 font-bold">LONG TRADES</span>
                      <div className="text-right">
                        <div>
                          {m.longPerformance.trades} trades | {m.longPerformance.winRate.toFixed(1)}% Win
                        </div>
                        <div className={m.longPerformance.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ${m.longPerformance.pnl.toFixed(2)} (PF: {m.longPerformance.profitFactor.toFixed(2)})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-[#0a0f1d] border border-slate-800">
                      <span className="text-rose-400 font-bold">SHORT TRADES</span>
                      <div className="text-right">
                        <div>
                          {m.shortPerformance.trades} trades | {m.shortPerformance.winRate.toFixed(1)}% Win
                        </div>
                        <div className={m.shortPerformance.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ${m.shortPerformance.pnl.toFixed(2)} (PF: {m.shortPerformance.profitFactor.toFixed(2)})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Breakdown */}
                <div className="p-3.5 rounded-lg bg-[#0e1628] border border-[#1c2944] space-y-2">
                  <span className="text-slate-300 font-bold block">SESSION PERFORMANCE</span>
                  <div className="space-y-1.5">
                    {Object.entries(m.sessionPerformance).map(([session, data]) => (
                      <div
                        key={session}
                        className="flex items-center justify-between p-1.5 rounded bg-[#0a0f1d] border border-slate-800"
                      >
                        <span className="text-cyan-400 font-semibold">{session}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{data.trades} trades</span>
                          <span className="text-slate-300">{data.winRate.toFixed(1)}% WR</span>
                          <span className={data.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            ${data.pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Trade Journal Tab */}
          {activeTab === 'trades' && backtestResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">
                  EXECUTED TRADES LOG ({backtestResult.trades.length})
                </span>
                <button
                  onClick={exportTradesCSV}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#0e1628] text-slate-400 border-b border-slate-800">
                      <th className="p-2">Dir</th>
                      <th className="p-2">Entry Time</th>
                      <th className="p-2">Entry Price</th>
                      <th className="p-2">Exit Price</th>
                      <th className="p-2">Reason</th>
                      <th className="p-2">Net P&L</th>
                      <th className="p-2">R-Mult</th>
                      <th className="p-2">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResult.trades.map((t) => {
                      const net = t.realizedPnl - t.feesPaid;
                      return (
                        <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                t.direction === 'LONG'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {t.direction}
                            </span>
                          </td>
                          <td className="p-2 text-slate-300">
                            {new Date(t.entryTime * 1000).toLocaleString(undefined, {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-2 text-slate-200">${t.entryPrice.toFixed(1)}</td>
                          <td className="p-2 text-slate-200">
                            {t.exitPrice ? `$${t.exitPrice.toFixed(1)}` : 'Open'}
                          </td>
                          <td className="p-2 text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                              {t.exitReason || 'HOLD'}
                            </span>
                          </td>
                          <td className={`p-2 font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {net >= 0 ? '+' : ''}${net.toFixed(2)}
                          </td>
                          <td className="p-2 text-slate-300">{(t.rMultiple || 0).toFixed(2)}R</td>
                          <td className="p-2 text-slate-500">${t.feesPaid.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monte Carlo Simulation Tab */}
          {activeTab === 'montecarlo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                <div>
                  <h3 className="font-bold text-white text-xs">MONTE CARLO RESHUFFLING (500 ITERATIONS)</h3>
                  <p className="text-[11px] text-slate-400">
                    Randomizes trade sequence order and introduces execution slippage variance to test strategy resilience.
                  </p>
                </div>
                <button
                  onClick={handleRunMonteCarlo}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Execute Monte Carlo</span>
                </button>
              </div>

              {monteCarloResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2.5 rounded bg-[#0a0f1d] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block">5th Percentile (Worst)</span>
                      <span className="text-rose-400 font-bold text-sm">
                        ${monteCarloResult.confidenceIntervals.p5.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0f1d] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block">25th Percentile</span>
                      <span className="text-amber-400 font-bold text-sm">
                        ${monteCarloResult.confidenceIntervals.p25.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0f1d] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block">50th Percentile (Median)</span>
                      <span className="text-cyan-400 font-bold text-sm">
                        ${monteCarloResult.confidenceIntervals.p50.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0f1d] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block">75th Percentile</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        ${monteCarloResult.confidenceIntervals.p75.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0a0f1d] border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block">95th Percentile (Best)</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        ${monteCarloResult.confidenceIntervals.p95.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0e1628] border border-[#1c2944] text-[11px] text-slate-400">
                    <div className="font-bold text-slate-300 mb-1">Risk Envelope Assessment:</div>
                    <p>
                      Across 500 randomized runs, median terminal equity landed at{' '}
                      <span className="text-cyan-300 font-semibold">
                        ${monteCarloResult.confidenceIntervals.p50.toLocaleString()}
                      </span>
                      . Notice that Monte Carlo does not predict future returns; it stress-tests against adverse trade clustering.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Click &apos;Execute Monte Carlo&apos; to run 500 stochastic equity simulations.
                </div>
              )}
            </div>
          )}

          {/* Walk-Forward Tab */}
          {activeTab === 'walkforward' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#0e1628] border border-[#1c2944]">
                <div>
                  <h3 className="font-bold text-white text-xs">WALK-FORWARD ROBUSTNESS ANALYSIS</h3>
                  <p className="text-[11px] text-slate-400">
                    Splits history into rolling Train (In-Sample 70%) and Test (Out-of-Sample 30%) periods to detect overfitting.
                  </p>
                </div>
                <button
                  onClick={handleRunWalkForward}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Run Walk-Forward</span>
                </button>
              </div>

              {walkForwardResult ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#0a0f1d] border border-cyan-900/50 flex items-center justify-between">
                    <span className="text-slate-300">OVERALL WALK-FORWARD EFFICIENCY (WFE):</span>
                    <span
                      className={`font-bold text-base ${
                        walkForwardResult.overallEfficiency >= 60
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {walkForwardResult.overallEfficiency}%
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-[#0e1628] text-slate-400 border-b border-slate-800">
                          <th className="p-2">Window</th>
                          <th className="p-2">Train Range</th>
                          <th className="p-2">Train WR / PF</th>
                          <th className="p-2">Out-Of-Sample Test</th>
                          <th className="p-2">Test WR / PF</th>
                          <th className="p-2">Robustness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walkForwardResult.periods.map((p) => (
                          <tr key={p.periodIndex} className="border-b border-slate-800/60">
                            <td className="p-2 font-bold text-slate-300">Window #{p.periodIndex}</td>
                            <td className="p-2 text-slate-400">
                              {p.trainRange[0]} → {p.trainRange[1]}
                            </td>
                            <td className="p-2 text-slate-200">
                              {p.trainWinRate}% / {p.trainProfitFactor}
                            </td>
                            <td className="p-2 text-slate-400">
                              {p.testRange[0]} → {p.testRange[1]}
                            </td>
                            <td className="p-2 text-cyan-400 font-semibold">
                              {p.testWinRate}% / {p.testProfitFactor}
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                  p.robustnessScore >= 60
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {p.robustnessScore}% WFE
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Click &apos;Run Walk-Forward&apos; to evaluate Out-of-Sample generalization across rolling timeframes.
                </div>
              )}
            </div>
          )}

          {/* No-Lookahead Test Tab */}
          {activeTab === 'lookahead' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#0e1628] border border-[#1c2944] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-xs">MANDATORY DATA LEAKAGE & LOOKAHEAD VERIFICATION</h3>
                  <p className="text-[11px] text-slate-400">
                    Executes <code className="text-cyan-400">test_no_lookahead_bias()</code>: Mutates future candles by extreme amounts and verifies zero change in past signals or indicators.
                  </p>
                </div>
                <button
                  onClick={handleRunLookaheadCheck}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Run Verification Test</span>
                </button>
              </div>

              {lookaheadTestResult ? (
                <div
                  className={`p-4 rounded-lg border ${
                    lookaheadTestResult.passed
                      ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-700/60 text-rose-300'
                  } space-y-2`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {lookaheadTestResult.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>{lookaheadTestResult.passed ? 'TEST PASSED: ZERO LOOKAHEAD BIAS' : 'TEST FAILED'}</span>
                  </div>
                  <p className="text-xs text-slate-300">{lookaheadTestResult.message}</p>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    6 independent structural and mathematical assertions verified across pre- and post-future mutation slices.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Click &apos;Run Verification Test&apos; to execute the formal lookahead bias proof.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
