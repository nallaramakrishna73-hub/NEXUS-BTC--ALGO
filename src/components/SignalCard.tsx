import React from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Info,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { SignalScoreBreakdown, TradeSetup } from '../types/trading';

interface SignalCardProps {
  signal: TradeSetup | null;
  scoreBreakdown: SignalScoreBreakdown;
  currentPrice: number;
  onExecutePaperTrade?: (signal: TradeSetup) => void;
  isPositionOpen?: boolean;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  scoreBreakdown,
  currentPrice,
  onExecutePaperTrade,
  isPositionOpen = false,
}) => {
  const isTradable = scoreBreakdown.isTradable && signal !== null;

  return (
    <div className="w-full bg-[#0b101c] border border-[#1b263b] rounded-lg p-4 shadow-xl flex flex-col justify-between">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              ALGORITHM SIGNAL ENGINE
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-extrabold text-sm text-white">NEXUS BTC</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                5M PRIMARY
              </span>
            </div>
          </div>

          {/* Direction Badge */}
          {isTradable ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono font-bold text-xs shadow-lg ${
                signal.direction === 'LONG'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {signal.direction === 'LONG' ? (
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>SETUP: {signal.direction}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-mono font-bold">
              <XCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>SETUP: NO TRADE</span>
            </div>
          )}
        </div>

        {/* Score & Confirmation Meter */}
        <div className="my-3 p-3 rounded-lg bg-[#0e1424] border border-[#1c273e]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">Setup Confidence Score:</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span
                className={`text-lg font-extrabold ${
                  scoreBreakdown.score >= 8
                    ? 'text-emerald-400'
                    : scoreBreakdown.score >= 5
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {scoreBreakdown.score}
              </span>
              <span className="text-xs text-slate-500">/ 12</span>
              <span className="text-[10px] text-slate-500 ml-1">
                (Min: 8/12)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                scoreBreakdown.score >= 8
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : scoreBreakdown.score >= 5
                  ? 'bg-amber-500'
                  : 'bg-slate-600'
              }`}
              style={{ width: `${(scoreBreakdown.score / 12) * 100}%` }}
            />
          </div>

          {/* 8-Point Criteria Checklist */}
          <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.htfBiasAlignment ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.htfBiasAlignment ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>HTF Bias (+2)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.liquiditySweep ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.liquiditySweep ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>Liquidity Sweep (+2)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.displacement ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.displacement ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>Displacement (+2)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.mssBos ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.mssBos ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>MSS / BOS (+2)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.fvgPresent ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.fvgPresent ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>FVG Zone (+1)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.fvgRetest ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.fvgRetest ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>FVG Retest (+1)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.volumeConfirmation ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.volumeConfirmation ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>Volume Spike (+1)</span>
            </div>

            <div
              className={`flex items-center gap-1.5 ${
                scoreBreakdown.sessionVolatilityConfirmation ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {scoreBreakdown.sessionVolatilityConfirmation ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 flex-shrink-0 text-slate-600" />
              )}
              <span>Session Filter (+1)</span>
            </div>
          </div>
        </div>

        {/* Trade Parameters or NO TRADE Reasons */}
        {isTradable ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#0d1424] border border-cyan-900/40">
                <span className="text-[10px] text-slate-400">ENTRY:</span>
                <div className="text-white font-bold text-sm">
                  ${signal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </div>
              </div>

              <div className="p-2 rounded bg-[#0d1424] border border-rose-900/40">
                <span className="text-[10px] text-rose-400">STOP LOSS (ATR Buffer):</span>
                <div className="text-rose-300 font-bold text-sm">
                  ${signal.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
              <div className="p-1.5 rounded bg-[#0d1424] border border-emerald-900/40 text-center">
                <span className="text-[9px] text-emerald-400 block">TP1 (1.5R - 50%)</span>
                <span className="font-semibold text-emerald-300">
                  ${signal.tp1.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="p-1.5 rounded bg-[#0d1424] border border-emerald-900/40 text-center">
                <span className="text-[9px] text-emerald-400 block">TP2 (2.0R - 30%)</span>
                <span className="font-semibold text-emerald-300">
                  ${signal.tp2.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="p-1.5 rounded bg-[#0d1424] border border-emerald-900/40 text-center">
                <span className="text-[9px] text-emerald-400 block">TP3 (Opp. Liq - 20%)</span>
                <span className="font-semibold text-emerald-300">
                  ${signal.tp3.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
              <span>Risk: 0.5% Balance</span>
              <span>Avg R:R: 2.16</span>
              <span>Mode: {signal.mode}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs font-mono space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>DISQUALIFIED REASONS:</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
              {scoreBreakdown.noTradeReasons.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="leading-tight">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-3 border-t border-slate-800 mt-3">
        {isTradable ? (
          <button
            onClick={() => onExecutePaperTrade && onExecutePaperTrade(signal)}
            disabled={isPositionOpen}
            className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
              isPositionOpen
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : signal.direction === 'LONG'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>
              {isPositionOpen
                ? 'POSITION ALREADY OPEN'
                : `EXECUTE ${signal.direction} IN PAPER MODE`}
            </span>
          </button>
        ) : (
          <div className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-500 font-mono text-xs flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CONFIRMATION OVER PREDICTION — NO TRADE ACTIVE</span>
          </div>
        )}
      </div>
    </div>
  );
};
