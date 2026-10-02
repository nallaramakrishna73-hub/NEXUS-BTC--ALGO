import React from 'react';
import {
  AlertOctagon,
  CheckCircle,
  Clock,
  DollarSign,
  Lock,
  PauseCircle,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Position, RiskManagementState } from '../types/trading';

interface RiskPanelProps {
  riskState: RiskManagementState;
  activePosition: Position | null;
  currentPrice: number;
  onClosePosition: () => void;
  onResetBalance: () => void;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  riskState,
  activePosition,
  currentPrice,
  onClosePosition,
  onResetBalance,
}) => {
  // Calculate active position unrealized P&L
  let unrealizedPnl = 0;
  let unrealizedPct = 0;

  if (activePosition) {
    if (activePosition.direction === 'LONG') {
      unrealizedPnl = (currentPrice - activePosition.entryPrice) * activePosition.remainingSize;
    } else {
      unrealizedPnl = (activePosition.entryPrice - currentPrice) * activePosition.remainingSize;
    }
    unrealizedPct = (unrealizedPnl / activePosition.notional) * 100;
  }

  const isDailyLossClose = riskState.dailyPnlPercent <= -1.0;
  const isConsecutiveLossRisk = riskState.consecutiveLosses >= 1;

  return (
    <div className="w-full bg-[#0b101c] border border-[#1b263b] rounded-lg p-3.5 shadow-xl space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>RISK MANAGER</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetBalance}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            title="Reset Paper Balance to $10,000"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              riskState.tradingHalted
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {riskState.tradingHalted ? 'HALTED' : 'NORMAL'}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Balance */}
        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[10px] text-slate-400 block mb-0.5">BALANCE</span>
          <div className="font-bold text-sm text-white">
            ${riskState.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Daily P&L */}
        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[10px] text-slate-400 block mb-0.5">DAILY P&L (Max -1.5%)</span>
          <div
            className={`font-bold text-sm flex items-center gap-1 ${
              riskState.dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {riskState.dailyPnl >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {riskState.dailyPnl >= 0 ? '+' : ''}${riskState.dailyPnl.toFixed(2)} (
              {riskState.dailyPnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        {/* Drawdown */}
        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[9px] text-slate-400 block">DRAWDOWN</span>
          <span className="text-slate-200 font-bold">
            {riskState.currentDrawdown.toFixed(2)}%
          </span>
        </div>

        {/* Trades Today */}
        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[9px] text-slate-400 block">TRADES TODAY</span>
          <span
            className={`font-bold ${
              riskState.tradesToday >= 3 ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {riskState.tradesToday} / 3
          </span>
        </div>

        {/* Consecutive Losses */}
        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[9px] text-slate-400 block">CONS. LOSSES</span>
          <span
            className={`font-bold ${
              riskState.consecutiveLosses >= 2 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {riskState.consecutiveLosses} / 2
          </span>
        </div>
      </div>

      {/* Trading Halt Warning if triggered */}
      {riskState.tradingHalted && (
        <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-[11px] text-rose-300 flex items-start gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Execution Circuit Breaker Active</div>
            <div className="text-[10px] text-rose-400 mt-0.5">
              {riskState.haltReason || 'Safety limit hit. Preserving trading capital.'}
            </div>
          </div>
        </div>
      )}

      {/* Active Position Section */}
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
          ACTIVE POSITION
        </span>

        {activePosition ? (
          <div className="p-2.5 rounded bg-[#0e1526] border border-cyan-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  activePosition.direction === 'LONG'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {activePosition.direction} {activePosition.remainingSize.toFixed(3)} BTC
              </span>

              <div
                className={`font-bold text-xs ${
                  unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)} (
                {unrealizedPct >= 0 ? '+' : ''}
                {unrealizedPct.toFixed(2)}%)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
              <div>Entry: ${activePosition.entryPrice.toFixed(1)}</div>
              <div>SL: ${activePosition.stopLoss.toFixed(1)}</div>
              <div>TP1: ${activePosition.tp1.toFixed(1)} {activePosition.tp1Hit ? '✓' : ''}</div>
              <div>TP2: ${activePosition.tp2.toFixed(1)} {activePosition.tp2Hit ? '✓' : ''}</div>
            </div>

            <button
              onClick={onClosePosition}
              className="w-full py-1.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold shadow transition-colors"
            >
              Market Close Position
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-[#0c1220] border border-dashed border-slate-800 text-slate-500 text-center text-[11px]">
            No open position. Engine flat.
          </div>
        )}
      </div>
    </div>
  );
};
