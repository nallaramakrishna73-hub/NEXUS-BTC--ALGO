import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  FileCode,
  Flame,
  Globe,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Zap,
} from 'lucide-react';
import { StrategyConfig } from '../types/trading';

interface HeaderProps {
  currentPrice: number;
  priceChange24h: number;
  session: string;
  config: StrategyConfig;
  onOpenBacktest: () => void;
  onOpenConfig: () => void;
  onOpenAlerts: () => void;
  onOpenCodeExport: () => void;
  onToggleLiveTrading: (enabled: boolean) => void;
  onResetPaperBalance: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPrice,
  priceChange24h,
  session,
  config,
  onOpenBacktest,
  onOpenConfig,
  onOpenAlerts,
  onOpenCodeExport,
  onToggleLiveTrading,
  onResetPaperBalance,
}) => {
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState(false);

  const handleLiveToggleClick = () => {
    if (!config.liveTrading) {
      setShowLiveConfirmModal(true);
    } else {
      onToggleLiveTrading(false);
    }
  };

  const confirmLiveEnable = () => {
    setShowLiveConfirmModal(false);
    onToggleLiveTrading(true);
  };

  return (
    <>
      <header className="w-full bg-[#0a0f1d] border-b border-[#1b253b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Brand & Ticker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="NEXUS BTC Logo"
              className="w-9 h-9 rounded-lg object-cover bg-black border border-cyan-800/60 shadow-lg shadow-cyan-950/60"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-white">NEXUS BTC</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {config.strategyVersion}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-tight">
                Smart Liquidity & Structure Algorithm
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Asset & Live Ticker */}
          <div className="hidden sm:flex items-center gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                <span>{config.symbol}</span>
                <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                  {config.entryTimeframe}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white font-semibold">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {priceChange24h >= 0 ? '+' : ''}
                  {priceChange24h.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Session indicator */}
            <div className="px-2 py-1 rounded bg-[#131b2e] border border-[#23314d] text-[10px] font-mono flex items-center gap-1.5 text-slate-300">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>SESSION:</span>
              <span className="font-bold text-cyan-300">{session}</span>
            </div>
          </div>
        </div>

        {/* Status Mode Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
              config.liveTrading
                ? 'bg-rose-950/80 text-rose-400 border-rose-700 animate-pulse'
                : 'bg-emerald-950/80 text-emerald-400 border-emerald-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>CURRENT MODE: {config.liveTrading ? 'LIVE TRADING' : 'PAPER TRADING'}</span>
          </div>

          {/* Live Switch Button */}
          <button
            onClick={handleLiveToggleClick}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all border ${
              config.liveTrading
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-lg shadow-rose-950'
                : 'bg-[#162033] hover:bg-[#202d47] text-slate-300 border-slate-700'
            }`}
            title="Toggle Live / Paper Execution"
          >
            {config.liveTrading ? 'Emergency Kill Live' : 'Live Mode'}
          </button>

          {/* Backtest Button */}
          <button
            onClick={onOpenBacktest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Backtester</span>
          </button>

          {/* Config Settings Button */}
          <button
            onClick={onOpenConfig}
            className="p-1.5 rounded bg-[#162033] hover:bg-[#202d47] text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Strategy Parameters"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Telegram / Email Alerts */}
          <button
            onClick={onOpenAlerts}
            className="p-1.5 rounded bg-[#162033] hover:bg-[#202d47] text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Alerts System"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Python Code Export */}
          <button
            onClick={onOpenCodeExport}
            className="p-1.5 rounded bg-[#162033] hover:bg-[#202d47] text-slate-300 hover:text-white border border-slate-800 transition-colors hidden sm:block"
            title="View Python Backend Code & Tests"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* Safety Confirmation Modal for LIVE TRADING */}
      {showLiveConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-rose-600/50 max-w-md w-full rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Enable Real Live Trading?</h3>
                <p className="text-xs text-rose-400 font-mono">SAFETY PROTOCOL VERIFICATION</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-[#172033] p-3 rounded-lg border border-slate-800">
              <p className="font-semibold text-rose-300">
                Warning: Real exchange execution involves genuine capital risk.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>NEXUS BTC strictly prioritizes confirmation over prediction.</li>
                <li>No algorithmic strategy guarantees profitability.</li>
                <li>Pre-configured daily loss limit (1.5%) and max daily trades (3) will remain strictly active.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLiveConfirmModal(false)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel (Keep Paper Trading)
              </button>
              <button
                onClick={confirmLiveEnable}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950"
              >
                Confirm & Enable Live Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
