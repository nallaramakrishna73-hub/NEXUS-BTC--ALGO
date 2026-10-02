import React from 'react';
import {
  Activity,
  Compass,
  Layers,
  Sliders,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from 'lucide-react';
import { MarketBias, MarketStructureState, LiquidityPool } from '../types/trading';

interface MarketStatePanelProps {
  htfBias: MarketBias;
  structure5m: MarketStructureState;
  liquidityPools: LiquidityPool[];
  atr: number;
  adx: number;
  adxThreshold: number;
  isRanging: boolean;
  currentPrice: number;
}

export const MarketStatePanel: React.FC<MarketStatePanelProps> = ({
  htfBias,
  structure5m,
  liquidityPools,
  atr,
  adx,
  adxThreshold,
  isRanging,
  currentPrice,
}) => {
  // Find nearest BSL and SSL
  const bslPools = liquidityPools
    .filter((p) => p.price > currentPrice && !p.swept)
    .sort((a, b) => a.price - b.price);

  const sslPools = liquidityPools
    .filter((p) => p.price < currentPrice && !p.swept)
    .sort((a, b) => b.price - a.price);

  const nearestBsl = bslPools[0];
  const nearestSsl = sslPools[0];

  return (
    <div className="w-full bg-[#0b101c] border border-[#1b263b] rounded-lg p-3.5 shadow-xl space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>MARKET STATE & STRUCTURE</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">REGIME:</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isRanging
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {isRanging ? 'RANGING' : 'TRENDING'}
          </span>
        </div>
      </div>

      {/* HTF and 5M structure columns */}
      <div className="grid grid-cols-2 gap-2">
        {/* 15M HTF Bias */}
        <div className="p-2.5 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[10px] text-slate-400 block mb-1">HTF BIAS (15M)</span>
          <div className="flex items-center gap-1.5 font-bold text-sm">
            {htfBias === 'BULLISH' ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : htfBias === 'BEARISH' ? (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            ) : (
              <Activity className="w-4 h-4 text-amber-400" />
            )}
            <span
              className={
                htfBias === 'BULLISH'
                  ? 'text-emerald-400'
                  : htfBias === 'BEARISH'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {htfBias}
            </span>
          </div>
        </div>

        {/* 5M Primary Setup Structure */}
        <div className="p-2.5 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-[10px] text-slate-400 block mb-1">5M STRUCTURE</span>
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <span
              className={
                structure5m.structure === 'BULLISH'
                  ? 'text-emerald-400'
                  : structure5m.structure === 'BEARISH'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }
            >
              {structure5m.structure}
            </span>
          </div>
        </div>
      </div>

      {/* BOS / MSS status badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-slate-400 text-[11px]">BOS:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              structure5m.bos
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {structure5m.bos ? 'CONFIRMED' : 'NO'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <span className="text-slate-400 text-[11px]">MSS / CHOCH:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              structure5m.mss
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {structure5m.mss ? 'SHIFT DETECTED' : 'NO'}
          </span>
        </div>
      </div>

      {/* Swing High and Low references */}
      <div className="space-y-1.5 text-[11px] p-2 rounded bg-[#0e1526] border border-[#1b273d]">
        <div className="flex justify-between items-center text-slate-400">
          <span>Last Swing High:</span>
          <span className="text-slate-200 font-semibold">
            {structure5m.lastSwingHigh
              ? `$${structure5m.lastSwingHigh.price.toFixed(1)} (${structure5m.lastSwingHigh.classification})`
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Last Swing Low:</span>
          <span className="text-slate-200 font-semibold">
            {structure5m.lastSwingLow
              ? `$${structure5m.lastSwingLow.price.toFixed(1)} (${structure5m.lastSwingLow.classification})`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* ADX and ATR Volatility */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>ADX (14):</span>
            <span className={adx >= adxThreshold ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {adx.toFixed(1)}
            </span>
          </div>
          <div className="text-[9px] text-slate-500">
            Threshold: &gt;{adxThreshold} ({adx >= adxThreshold ? 'Trending' : 'Chop/Range'})
          </div>
        </div>

        <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d]">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>ATR (14):</span>
            <span className="text-cyan-400 font-bold">${atr.toFixed(1)}</span>
          </div>
          <div className="text-[9px] text-slate-500">
            {((atr / (currentPrice || 1)) * 100).toFixed(2)}% of price
          </div>
        </div>
      </div>

      {/* Liquidity targets */}
      <div className="p-2 rounded bg-[#0e1526] border border-[#1b273d] space-y-1">
        <span className="text-[10px] text-slate-400 block font-semibold">NEAREST LIQUIDITY TARGETS</span>
        <div className="flex justify-between text-[11px]">
          <span className="text-rose-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> BSL:
          </span>
          <span className="text-slate-300">
            {nearestBsl
              ? `$${nearestBsl.price.toFixed(1)} (+${((nearestBsl.price - currentPrice) / currentPrice * 100).toFixed(2)}%)`
              : 'Cleared'}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> SSL:
          </span>
          <span className="text-slate-300">
            {nearestSsl
              ? `$${nearestSsl.price.toFixed(1)} (-${((currentPrice - nearestSsl.price) / currentPrice * 100).toFixed(2)}%)`
              : 'Cleared'}
          </span>
        </div>
      </div>
    </div>
  );
};
