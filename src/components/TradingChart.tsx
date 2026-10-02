import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  LineStyle,
} from 'lightweight-charts';
import { Candle, FairValueGap, LiquidityPool, SwingPoint, TradeSetup } from '../types/trading';
import {
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Sliders,
  PenTool,
  Minus,
  Sparkles,
  Split,
  Compass,
  Check,
  ChevronDown,
  Trash2,
  Percent,
} from 'lucide-react';
import { TradingViewAdvancedWidget } from './TradingViewAdvancedWidget';

export type ChartViewMode = 'NEXUS' | 'TRADINGVIEW' | 'SPLIT';

export const AVAILABLE_TIMEFRAMES = [
  { id: '1m', label: '1m', desc: 'Scalp' },
  { id: '3m', label: '3m', desc: 'Micro' },
  { id: '5m', label: '5m', desc: 'Intraday' },
  { id: '15m', label: '15m', desc: 'Structure' },
  { id: '30m', label: '30m', desc: 'Session' },
  { id: '1h', label: '1h', desc: 'Trend' },
  { id: '4h', label: '4h', desc: 'Macro' },
  { id: '1d', label: '1D', desc: 'Daily' },
];

export const AVAILABLE_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOLUSDT', name: 'Solana', icon: '◎' },
  { symbol: 'BNBUSDT', name: 'BNB', icon: '⚡' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: '✕' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'Ð' },
];

interface TradingChartProps {
  candles: Candle[];
  swingPoints: { swingHighs: SwingPoint[]; swingLows: SwingPoint[] };
  liquidityPools: LiquidityPool[];
  fvgs: FairValueGap[];
  lastSignal: TradeSetup | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  symbol?: string;
  onSymbolChange?: (sym: string) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  swingPoints,
  liquidityPools,
  fvgs,
  lastSignal,
  onRefresh,
  isLoading = false,
  timeframe = '5m',
  onTimeframeChange,
  symbol = 'BTCUSDT',
  onSymbolChange,
}) => {
  // Chart View Mode: NEXUS SMC, Official TradingView Advanced, or Split Dual
  const [viewMode, setViewMode] = useState<ChartViewMode>('TRADINGVIEW');

  // Chart Container References
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);
  const markersPluginRef = useRef<any>(null);

  // Drawing Tools State (on NEXUS chart)
  const [activeDrawingTool, setActiveDrawingTool] = useState<
    'NONE' | 'HORIZONTAL_RAY' | 'FIBONACCI' | 'LONG_RISK' | 'SHORT_RISK' | 'RULER'
  >('NONE');
  const [userDrawings, setUserDrawings] = useState<
    Array<{ id: string; type: string; label: string; price: number; color: string }>
  >([]);
  const [showDrawingMenu, setShowDrawingMenu] = useState(false);

  // Dropdown states
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Layer Visibility Controls
  const [layers, setLayers] = useState({
    liquidity: true,
    fvgs: true,
    swings: true,
    structure: true,
    signals: true,
    volume: true,
  });

  // Initialize Lightweight Charts for NEXUS View
  useEffect(() => {
    if (viewMode === 'TRADINGVIEW') return; // Lightweight charts not needed when in pure TV mode
    if (!chartContainerRef.current) return;

    // Safely remove previous chart instance if present
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {}
      chartRef.current = null;
    }

    try {
      const initialWidth = chartContainerRef.current.clientWidth || 600;
      const initialHeight = chartContainerRef.current.clientHeight || 450;

      const chart = createChart(chartContainerRef.current, {
        width: initialWidth,
        height: initialHeight,
        layout: {
          background: { color: '#090d16' },
          textColor: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: '#141c2e' },
          horzLines: { color: '#141c2e' },
        },
        crosshair: {
          vertLine: {
            color: '#38bdf8',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#0284c7',
          },
          horzLine: {
            color: '#38bdf8',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#0284c7',
          },
        },
        rightPriceScale: {
          borderColor: '#1e293b',
          scaleMargins: {
            top: 0.1,
            bottom: 0.2,
          },
        },
        timeScale: {
          borderColor: '#1e293b',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // Candlestick Series
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      // Volume Histogram Series
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#334155',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // overlay
      });

      try {
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.82,
            bottom: 0,
          },
        });
      } catch (e) {
        console.warn('Volume price scale options error:', e);
      }

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // Resize Observer with animation frame debounce
      let resizeRaf: number | null = null;
      const handleResize = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
          if (chartContainerRef.current && chartRef.current) {
            const width = chartContainerRef.current.clientWidth;
            const height = chartContainerRef.current.clientHeight;
            if (width > 0 && height > 0) {
              chartRef.current.applyOptions({ width, height });
            }
          }
        });
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(chartContainerRef.current);

      return () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeObserver.disconnect();
        if (markersPluginRef.current) {
          try {
            markersPluginRef.current.detach();
          } catch {}
          markersPluginRef.current = null;
        }
        try {
          chart.remove();
        } catch {}
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
      };
    } catch (err) {
      console.warn('Chart initialization error:', err);
    }
  }, [viewMode]);

  // Update Candle & Volume Data and Synchronize Overlays
  useEffect(() => {
    if (viewMode === 'TRADINGVIEW') return;
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    try {
      const seenTimes = new Set<number>();
      const formattedCandles: CandlestickData[] = [];
      const formattedVolume: any[] = [];

      for (const c of candles) {
        if (!seenTimes.has(c.time) && Number.isFinite(c.time) && Number.isFinite(c.close)) {
          seenTimes.add(c.time);
          formattedCandles.push({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          });

          formattedVolume.push({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
          });
        }
      }

      formattedCandles.sort((a, b) => (a.time as number) - (b.time as number));
      formattedVolume.sort((a, b) => (a.time as number) - (b.time as number));

      if (formattedCandles.length > 0) {
        candleSeriesRef.current.setData(formattedCandles);
        volumeSeriesRef.current.setData(layers.volume ? formattedVolume : []);
      }

      // Safe update of price lines
      priceLinesRef.current.forEach((line) => {
        try {
          candleSeriesRef.current?.removePriceLine(line);
        } catch {}
      });
      priceLinesRef.current = [];

      // Add Price Lines for Entry, Stop Loss, TP1, TP2, TP3
      if (layers.signals && lastSignal && lastSignal.score.isTradable) {
        if (Number.isFinite(lastSignal.entryPrice)) {
          const entryLine = candleSeriesRef.current.createPriceLine({
            price: lastSignal.entryPrice,
            color: '#38bdf8',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `ENTRY: $${lastSignal.entryPrice.toFixed(1)}`,
          });
          priceLinesRef.current.push(entryLine);
        }

        if (Number.isFinite(lastSignal.stopLoss)) {
          const slLine = candleSeriesRef.current.createPriceLine({
            price: lastSignal.stopLoss,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL: $${lastSignal.stopLoss.toFixed(1)}`,
          });
          priceLinesRef.current.push(slLine);
        }

        if (Number.isFinite(lastSignal.tp1)) {
          const tp1Line = candleSeriesRef.current.createPriceLine({
            price: lastSignal.tp1,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `TP1 (1.5R): $${lastSignal.tp1.toFixed(1)}`,
          });
          priceLinesRef.current.push(tp1Line);
        }

        if (Number.isFinite(lastSignal.tp2)) {
          const tp2Line = candleSeriesRef.current.createPriceLine({
            price: lastSignal.tp2,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `TP2 (2.0R): $${lastSignal.tp2.toFixed(1)}`,
          });
          priceLinesRef.current.push(tp2Line);
        }
      }

      // Liquidity Pool Lines
      if (layers.liquidity && liquidityPools.length > 0) {
        liquidityPools.slice(-6).forEach((pool) => {
          if (Number.isFinite(pool.price)) {
            const line = candleSeriesRef.current?.createPriceLine({
              price: pool.price,
              color: pool.type.startsWith('BSL') || pool.type.includes('HIGH') ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)',
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `${pool.type} ${pool.swept ? '(Swept)' : ''} $${pool.price.toFixed(1)}`,
            });
            if (line) priceLinesRef.current.push(line);
          }
        });
      }

      // FVG Zones
      if (layers.fvgs && fvgs.length > 0) {
        fvgs.slice(-4).forEach((fvg) => {
          const mid = (fvg.top + fvg.bottom) / 2;
          if (Number.isFinite(mid)) {
            const line = candleSeriesRef.current?.createPriceLine({
              price: mid,
              color: fvg.type === 'BULLISH' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(249, 115, 22, 0.45)',
              lineWidth: 1,
              lineStyle: LineStyle.LargeDashed,
              axisLabelVisible: false,
              title: `FVG ${fvg.type}: $${fvg.bottom.toFixed(0)}-$${fvg.top.toFixed(0)}`,
            });
            if (line) priceLinesRef.current.push(line);
          }
        });
      }

      // Render Active User Drawings (Lines, Rays, Fibonacci levels)
      userDrawings.forEach((drawing) => {
        if (Number.isFinite(drawing.price)) {
          const userLine = candleSeriesRef.current?.createPriceLine({
            price: drawing.price,
            color: drawing.color,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: drawing.label,
          });
          if (userLine) priceLinesRef.current.push(userLine);
        }
      });

      // Chart Markers with STRICT validation that timestamp exists in candle series
      const markersMap = new Map<number, any>();

      if (layers.swings) {
        swingPoints.swingHighs.slice(-8).forEach((sh) => {
          if (seenTimes.has(sh.time)) {
            markersMap.set(sh.time, {
              time: sh.time as UTCTimestamp,
              position: 'aboveBar',
              color: '#f59e0b',
              shape: 'arrowDown',
              text: sh.classification || 'SH',
            });
          }
        });

        swingPoints.swingLows.slice(-8).forEach((sl) => {
          if (seenTimes.has(sl.time)) {
            markersMap.set(sl.time, {
              time: sl.time as UTCTimestamp,
              position: 'belowBar',
              color: '#38bdf8',
              shape: 'arrowUp',
              text: sl.classification || 'SL',
            });
          }
        });
      }

      // Prioritize Trade Signal Marker
      if (layers.signals && lastSignal && lastSignal.score.isTradable) {
        if (seenTimes.has(lastSignal.time)) {
          markersMap.set(lastSignal.time, {
            time: lastSignal.time as UTCTimestamp,
            position: lastSignal.direction === 'LONG' ? 'belowBar' : 'aboveBar',
            color: lastSignal.direction === 'LONG' ? '#10b981' : '#ef4444',
            shape: lastSignal.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
            text: `NEXUS ${lastSignal.direction} (${lastSignal.score.score}/12)`,
          });
        }
      }

      const finalMarkers = Array.from(markersMap.values()).sort(
        (a, b) => (a.time as number) - (b.time as number)
      );

      // Safe update of markers
      try {
        if (markersPluginRef.current) {
          markersPluginRef.current.setMarkers(finalMarkers);
        } else if (candleSeriesRef.current && finalMarkers.length > 0) {
          markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current, finalMarkers);
        }
      } catch (markerErr) {
        console.warn('Error setting chart markers, detached plugin safely:', markerErr);
        if (markersPluginRef.current) {
          try {
            markersPluginRef.current.detach();
          } catch {}
          markersPluginRef.current = null;
        }
      }
    } catch (err) {
      console.warn('Error updating chart data:', err);
    }
  }, [candles, layers, swingPoints, liquidityPools, fvgs, lastSignal, userDrawings, viewMode]);

  // Current Price & Stats
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 84500;
  const recentHigh = useMemo(() => {
    if (candles.length === 0) return currentPrice * 1.02;
    return Math.max(...candles.slice(-40).map((c) => c.high));
  }, [candles, currentPrice]);
  const recentLow = useMemo(() => {
    if (candles.length === 0) return currentPrice * 0.98;
    return Math.min(...candles.slice(-40).map((c) => c.low));
  }, [candles, currentPrice]);

  // Handle User Drawing Placement
  const handleAddDrawing = (type: 'HORIZONTAL_RAY' | 'FIBONACCI' | 'LONG_RISK' | 'SHORT_RISK' | 'RULER') => {
    if (type === 'HORIZONTAL_RAY') {
      const newDrawing = {
        id: `ray_${Date.now()}`,
        type: 'HORIZONTAL_RAY',
        label: `Key Level: $${currentPrice.toFixed(0)}`,
        price: currentPrice,
        color: '#f59e0b',
      };
      setUserDrawings((prev) => [...prev, newDrawing]);
    } else if (type === 'FIBONACCI') {
      const diff = recentHigh - recentLow;
      const fibLevels = [
        { level: '0.236', price: recentHigh - diff * 0.236, color: '#94a3b8' },
        { level: '0.382', price: recentHigh - diff * 0.382, color: '#38bdf8' },
        { level: '0.500', price: recentHigh - diff * 0.5, color: '#e2e8f0' },
        { level: '0.618 (Golden Pocket)', price: recentHigh - diff * 0.618, color: '#f59e0b' },
        { level: '0.786', price: recentHigh - diff * 0.786, color: '#ec4899' },
      ];
      const newDrawings = fibLevels.map((f) => ({
        id: `fib_${f.level}_${Date.now()}`,
        type: 'FIBONACCI',
        label: `FIB ${f.level}: $${f.price.toFixed(0)}`,
        price: f.price,
        color: f.color,
      }));
      setUserDrawings((prev) => [...prev.filter((d) => d.type !== 'FIBONACCI'), ...newDrawings]);
    } else if (type === 'LONG_RISK') {
      const sl = recentLow * 0.999;
      const risk = currentPrice - sl;
      const tp1 = currentPrice + risk * 1.5;
      const tp2 = currentPrice + risk * 2.5;

      const longSetup = [
        { id: `long_entry_${Date.now()}`, type: 'RISK', label: `Long Entry: $${currentPrice.toFixed(0)}`, price: currentPrice, color: '#38bdf8' },
        { id: `long_sl_${Date.now()}`, type: 'RISK', label: `Long SL (-1R): $${sl.toFixed(0)}`, price: sl, color: '#ef4444' },
        { id: `long_tp1_${Date.now()}`, type: 'RISK', label: `Long TP1 (1.5R): $${tp1.toFixed(0)}`, price: tp1, color: '#10b981' },
        { id: `long_tp2_${Date.now()}`, type: 'RISK', label: `Long TP2 (2.5R): $${tp2.toFixed(0)}`, price: tp2, color: '#10b981' },
      ];
      setUserDrawings((prev) => [...prev.filter((d) => d.type !== 'RISK'), ...longSetup]);
    } else if (type === 'SHORT_RISK') {
      const sl = recentHigh * 1.001;
      const risk = sl - currentPrice;
      const tp1 = currentPrice - risk * 1.5;
      const tp2 = currentPrice - risk * 2.5;

      const shortSetup = [
        { id: `short_entry_${Date.now()}`, type: 'RISK', label: `Short Entry: $${currentPrice.toFixed(0)}`, price: currentPrice, color: '#38bdf8' },
        { id: `short_sl_${Date.now()}`, type: 'RISK', label: `Short SL (-1R): $${sl.toFixed(0)}`, price: sl, color: '#ef4444' },
        { id: `short_tp1_${Date.now()}`, type: 'RISK', label: `Short TP1 (1.5R): $${tp1.toFixed(0)}`, price: tp1, color: '#10b981' },
        { id: `short_tp2_${Date.now()}`, type: 'RISK', label: `Short TP2 (2.5R): $${tp2.toFixed(0)}`, price: tp2, color: '#10b981' },
      ];
      setUserDrawings((prev) => [...prev.filter((d) => d.type !== 'RISK'), ...shortSetup]);
    } else if (type === 'RULER') {
      const prevCandle = candles[candles.length - 2] || candles[0];
      const delta = currentPrice - prevCandle.close;
      const pct = (delta / prevCandle.close) * 100;
      const rulerDrawing = {
        id: `ruler_${Date.now()}`,
        type: 'RULER',
        label: `Range: ${delta >= 0 ? '+' : ''}$${delta.toFixed(1)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`,
        price: currentPrice,
        color: delta >= 0 ? '#10b981' : '#ef4444',
      };
      setUserDrawings((prev) => [...prev.filter((d) => d.type !== 'RULER'), rulerDrawing]);
    }
    setActiveDrawingTool('NONE');
  };

  const handleClearDrawings = () => {
    setUserDrawings([]);
    setActiveDrawingTool('NONE');
  };

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleFitContent = () => {
    try {
      chartRef.current?.timeScale().fitContent();
    } catch {}
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#090d16] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl">
      {/* Top Universal TradingView & NEXUS Control Header */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-[#1e293b] bg-[#0c111c] gap-2 text-xs select-none">
        {/* Symbol Selector & Live Ticker */}
        <div className="flex items-center gap-2">
          {/* Symbol Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161f30] hover:bg-[#1f2b42] text-slate-100 font-bold font-mono tracking-wider transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{symbol.toUpperCase()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showSymbolDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-[#0f172a] border border-[#334155] rounded-md shadow-2xl z-50 p-1.5 space-y-1 text-xs">
                <div className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1 border-b border-slate-800">
                  Select Market Pair
                </div>
                {AVAILABLE_SYMBOLS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => {
                      onSymbolChange?.(s.symbol);
                      setShowSymbolDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left font-mono ${
                      symbol === s.symbol
                        ? 'bg-cyan-950/60 text-cyan-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-xs">{s.icon}</span>
                      <span>{s.symbol}</span>
                    </span>
                    {symbol === s.symbol && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Segmented Control (1m, 3m, 5m, 15m, 30m, 1h, 4h, 1D) */}
          <div className="flex items-center bg-[#070b14] p-0.5 rounded border border-[#1e293b]">
            {AVAILABLE_TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => onTimeframeChange?.(tf.id)}
                title={`${tf.desc} Timeframe`}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  timeframe.toLowerCase() === tf.id.toLowerCase()
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <span className="text-slate-400 font-mono hidden md:inline font-semibold">
            {candles.length > 0 ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}` : 'Loading...'}
          </span>
        </div>

        {/* View Mode Switcher (TradingView Full Suite vs NEXUS SMC vs Split) */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#070b14] p-0.5 rounded border border-[#1e293b]">
            <button
              onClick={() => setViewMode('TRADINGVIEW')}
              title="Full Official TradingView Advanced Platform (All Drawing Tools & Indicators)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'TRADINGVIEW'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>TradingView Full Suite</span>
            </button>

            <button
              onClick={() => setViewMode('NEXUS')}
              title="NEXUS Algorithmic Smart Money Concepts & Liquidity Engine"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'NEXUS'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>NEXUS SMC Chart</span>
            </button>

            <button
              onClick={() => setViewMode('SPLIT')}
              title="Dual Terminal: TradingView Pro Chart & NEXUS SMC side-by-side"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'SPLIT'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>

          {/* Quick Drawing Tools Menu (Available in NEXUS & Split modes) */}
          {(viewMode === 'NEXUS' || viewMode === 'SPLIT') && (
            <div className="relative">
              <button
                onClick={() => setShowDrawingMenu(!showDrawingMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#161f30] hover:bg-[#1f2b42] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Interactive Drawing Tools"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Tools</span>
              </button>

              {showDrawingMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#0f172a] border border-[#334155] rounded-md shadow-2xl z-50 p-2 space-y-1 text-xs">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 pb-1 border-b border-slate-800">
                    Analysis & Drawing Tools
                  </div>
                  <button
                    onClick={() => {
                      handleAddDrawing('HORIZONTAL_RAY');
                      setShowDrawingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-left text-slate-200"
                  >
                    <Minus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Horizontal Support/Res Ray</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAddDrawing('FIBONACCI');
                      setShowDrawingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-left text-slate-200"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Fibonacci Golden Pocket</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAddDrawing('LONG_RISK');
                      setShowDrawingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-left text-slate-200"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Long Position Box (R:R)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAddDrawing('SHORT_RISK');
                      setShowDrawingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-left text-slate-200"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400 rotate-180" />
                    <span>Short Position Box (R:R)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAddDrawing('RULER');
                      setShowDrawingMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-left text-slate-200"
                  >
                    <Percent className="w-3.5 h-3.5 text-purple-400" />
                    <span>Delta Measure Ruler</span>
                  </button>
                  {userDrawings.length > 0 && (
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          handleClearDrawings();
                          setShowDrawingMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-rose-950 text-left text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All Drawings ({userDrawings.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Layer toggles popup (In NEXUS/Split mode) */}
          {(viewMode === 'NEXUS' || viewMode === 'SPLIT') && (
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#161f30] hover:bg-[#1f2b42] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Toggle SMC Layers"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Layers</span>
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0f172a] border border-[#334155] rounded-md shadow-2xl z-50 p-2 space-y-1 text-xs">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 pb-1 border-b border-slate-800">
                    SMC Overlays
                  </div>
                  {(Object.keys(layers) as (keyof typeof layers)[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 text-left capitalize transition-colors"
                    >
                      <span className={layers[key] ? 'text-slate-200' : 'text-slate-500'}>{key}</span>
                      {layers[key] ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fit Content & Refresh */}
          {(viewMode === 'NEXUS' || viewMode === 'SPLIT') && (
            <button
              onClick={handleFitContent}
              className="p-1 rounded bg-[#161f30] hover:bg-[#1f2b42] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded bg-[#161f30] hover:bg-[#1f2b42] text-slate-300 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              title="Refresh Candles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Dynamic Chart Body Container */}
      <div className="relative flex-1 w-full flex flex-col min-h-[520px]">
        {/* VIEW MODE 1: PURE OFFICIAL TRADINGVIEW ADVANCED CHART (With All Tools, Indicators, and Timeframes) */}
        {viewMode === 'TRADINGVIEW' && (
          <div className="w-full flex-1 h-full min-h-[520px]">
            <TradingViewAdvancedWidget
              symbol={symbol}
              interval={timeframe}
              theme="dark"
              containerId="tradingview_full_terminal"
            />
          </div>
        )}

        {/* VIEW MODE 2: NEXUS ALGORITHMIC SMART MONEY CHART */}
        {viewMode === 'NEXUS' && (
          <div className="relative flex-1 w-full min-h-[520px]">
            {/* Dedicated Chart Canvas Target (No React Children) */}
            <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />

            {/* Loading Overlay as safe sibling */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#090d16]/70 flex items-center justify-center z-10 pointer-events-none">
                <div className="flex items-center gap-2 text-sm text-cyan-400 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Streaming Market Data...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE 3: SPLIT TERMINAL (Dual Screen: Official TradingView + NEXUS SMC) */}
        {viewMode === 'SPLIT' && (
          <div className="w-full flex-1 grid grid-cols-1 xl:grid-cols-2 gap-1 bg-[#090d16] p-1">
            {/* Left: Official TradingView Advanced Widget */}
            <div className="w-full h-[480px] xl:h-full border border-slate-800 rounded overflow-hidden">
              <TradingViewAdvancedWidget
                symbol={symbol}
                interval={timeframe}
                theme="dark"
                containerId="tradingview_split_terminal"
              />
            </div>

            {/* Right: NEXUS SMC Engine */}
            <div className="relative w-full h-[480px] xl:h-full border border-slate-800 rounded overflow-hidden">
              <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
              {isLoading && (
                <div className="absolute inset-0 bg-[#090d16]/70 flex items-center justify-center z-10 pointer-events-none">
                  <div className="flex items-center gap-2 text-sm text-cyan-400 font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Streaming Market Data...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#090d16] border-t border-[#141c2e] text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> SSL / Swing Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> BSL / Swing High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> FVG Zone
          </span>
          {userDrawings.length > 0 && (
            <span className="text-amber-400 font-bold">
              • {userDrawings.length} Active Drawings
            </span>
          )}
        </div>
        <div className="text-slate-500 hidden sm:inline">
          {symbol.toUpperCase()} · {timeframe.toUpperCase()} · TradingView Full Suite & NEXUS Algorithmic Core
        </div>
      </div>
    </div>
  );
};
