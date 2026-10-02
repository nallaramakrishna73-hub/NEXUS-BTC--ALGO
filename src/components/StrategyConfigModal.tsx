import React, { useState } from 'react';
import { RefreshCw, Save, Settings, Sliders, X } from 'lucide-react';
import { StrategyConfig } from '../types/trading';
import { DEFAULT_CONFIG } from '../strategy/defaultConfig';

interface StrategyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StrategyConfig;
  onSaveConfig: (newConfig: StrategyConfig) => void;
}

export const StrategyConfigModal: React.FC<StrategyConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<StrategyConfig>({ ...config });

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setFormData({ ...DEFAULT_CONFIG });
  };

  const handleSave = () => {
    // Increment version if parameters changed
    let nextVersion = formData.strategyVersion;
    if (JSON.stringify(formData) !== JSON.stringify(config)) {
      const match = formData.strategyVersion.match(/v(\d+)\.(\d+)/);
      if (match) {
        const major = match[1];
        const minor = parseInt(match[2], 10) + 1;
        nextVersion = `NEXUS-BTC-v${major}.${minor}`;
      }
    }
    const updated = { ...formData, strategyVersion: nextVersion };
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto font-mono text-xs">
      <div className="bg-[#0b101c] border border-[#1e2a42] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0e1628]">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="NEXUS BTC"
              className="w-6 h-6 rounded object-cover border border-cyan-800 shadow"
              referrerPolicy="no-referrer"
            />
            <h2 className="font-bold text-white text-sm">STRATEGY PARAMETERS CONFIGURATION</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              {formData.strategyVersion}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-300">
          {/* Section 1: Algorithmic Sensitivities */}
          <div className="space-y-3">
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-1">
              Structure & Setup Sensitivity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">
                  Swing Detection Length ({formData.swingLength} candles):
                </label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={formData.swingLength}
                  onChange={(e) => setFormData({ ...formData, swingLength: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500">Requires {formData.swingLength} higher/lower candles each side</div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Min Signal Score ({formData.minSignalScore} / 12):
                </label>
                <input
                  type="range"
                  min="6"
                  max="11"
                  value={formData.minSignalScore}
                  onChange={(e) => setFormData({ ...formData, minSignalScore: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="text-[10px] text-slate-500">Threshold below which setup triggers NO TRADE</div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  FVG Min Size Threshold ({formData.fvgAtrThreshold}x ATR):
                </label>
                <input
                  type="number"
                  step="0.02"
                  min="0.05"
                  max="0.5"
                  value={formData.fvgAtrThreshold}
                  onChange={(e) => setFormData({ ...formData, fvgAtrThreshold: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Displacement Body Size ({formData.displacementAtrMultiplier}x ATR):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="2.0"
                  value={formData.displacementAtrMultiplier}
                  onChange={(e) => setFormData({ ...formData, displacementAtrMultiplier: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Range & Volatility Filter */}
          <div className="space-y-3 pt-2">
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-1">
              Range & Chop Protection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rangeFilter"
                  checked={formData.enableRangeFilter}
                  onChange={(e) => setFormData({ ...formData, enableRangeFilter: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
                <label htmlFor="rangeFilter" className="text-slate-200 cursor-pointer">
                  Enable ADX Range Filter
                </label>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  ADX Chop Threshold (Current: {formData.adxThreshold}):
                </label>
                <input
                  type="number"
                  min="15"
                  max="35"
                  value={formData.adxThreshold}
                  onChange={(e) => setFormData({ ...formData, adxThreshold: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Risk & Position Management */}
          <div className="space-y-3 pt-2">
            <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-1">
              Risk Management Constraints
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">
                  Risk Per Trade ({(formData.riskPerTrade * 100).toFixed(1)}%):
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="0.03"
                  value={formData.riskPerTrade}
                  onChange={(e) => setFormData({ ...formData, riskPerTrade: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Max Daily Loss ({(formData.maxDailyLoss * 100).toFixed(1)}%):
                </label>
                <input
                  type="number"
                  step="0.005"
                  min="0.005"
                  max="0.05"
                  value={formData.maxDailyLoss}
                  onChange={(e) => setFormData({ ...formData, maxDailyLoss: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Max Daily Trades:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxTradesPerDay}
                  onChange={(e) => setFormData({ ...formData, maxTradesPerDay: parseInt(e.target.value, 10) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Consecutive Loss Stop:
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.maxConsecutiveLosses}
                  onChange={(e) => setFormData({ ...formData, maxConsecutiveLosses: parseInt(e.target.value, 10) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  SL ATR Buffer ({formData.slAtrBuffer}x ATR):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="0.5"
                  value={formData.slAtrBuffer}
                  onChange={(e) => setFormData({ ...formData, slAtrBuffer: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Cooldown Candles:
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.cooldownCandles}
                  onChange={(e) => setFormData({ ...formData, cooldownCandles: parseInt(e.target.value, 10) })}
                  className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0e1628]">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-950"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
