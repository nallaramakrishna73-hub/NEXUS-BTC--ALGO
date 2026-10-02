import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertsModal } from './components/AlertsModal';
import { BacktestModal } from './components/BacktestModal';
import { CodeExportModal } from './components/CodeExportModal';
import { Header } from './components/Header';
import { MarketStatePanel } from './components/MarketStatePanel';
import { RiskPanel } from './components/RiskPanel';
import { SignalCard } from './components/SignalCard';
import { StrategyConfigModal } from './components/StrategyConfigModal';
import { TradeJournal } from './components/TradeJournal';
import { TradingChart } from './components/TradingChart';
import { calculateADX, calculateATR } from './core/volatility';
import { fetchBinanceKlines, RealtimeMarketFeed } from './data/binanceFeed';
import { RiskManager } from './risk/riskManager';
import { DEFAULT_CONFIG } from './strategy/defaultConfig';
import { NexusEngineSnapshot, NexusStrategyEngine } from './strategy/nexusEngine';
import { Candle, Position, StrategyConfig, TradeSetup } from './types/trading';

export default function App() {
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);

  // Risk & Trading State
  const riskManagerRef = useRef<RiskManager>(new RiskManager(10000, DEFAULT_CONFIG));
  const strategyEngineRef = useRef<NexusStrategyEngine>(
    new NexusStrategyEngine(DEFAULT_CONFIG, riskManagerRef.current)
  );

  const [activePosition, setActivePosition] = useState<Position | null>(null);
  const [sessionTrades, setSessionTrades] = useState<Position[]>([]);
  const [riskStateVersion, setRiskStateVersion] = useState(0);

  // Real-time market feed
  const feedRef = useRef<RealtimeMarketFeed | null>(null);

  // Load initial historical candles
  const loadHistoricalCandles = async (sym: string = config.symbol, tf: string = config.entryTimeframe) => {
    setIsLoading(true);
    const klines = await fetchBinanceKlines(sym, tf, 250);
    setCandles(klines);
    setIsLoading(false);
  };

  const handleTimeframeChange = (newTf: string) => {
    setConfig((prev) => ({ ...prev, entryTimeframe: newTf }));
    loadHistoricalCandles(config.symbol, newTf);
  };

  const handleSymbolChange = (newSym: string) => {
    setConfig((prev) => ({ ...prev, symbol: newSym }));
    loadHistoricalCandles(newSym, config.entryTimeframe);
  };

  useEffect(() => {
    loadHistoricalCandles();
  }, []);

  // Update strategy engine when config changes
  useEffect(() => {
    riskManagerRef.current = new RiskManager(riskManagerRef.current.getState().currentBalance, config);
    strategyEngineRef.current = new NexusStrategyEngine(config, riskManagerRef.current);
  }, [config]);

  // Compute technical indicators and strategy snapshot for current candles
  const engineSnapshot: NexusEngineSnapshot | null = useMemo(() => {
    if (candles.length < 25) return null;
    const atrSeries = calculateATR(candles, 14);
    const { adx: adxSeries } = calculateADX(candles, 14);
    return strategyEngineRef.current.evaluate(candles, candles.length - 1, atrSeries, adxSeries);
  }, [candles, config, riskStateVersion]);

  // Active Position SL/TP Realtime Monitor
  useEffect(() => {
    if (!activePosition || candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];

    let updatedPos: Position | null = { ...activePosition };
    let shouldClose = false;
    let exitReason: Position['exitReason'] = undefined;
    let exitPrice = 0;

    if (activePosition.direction === 'LONG') {
      // Stop Loss
      if (lastCandle.low <= activePosition.stopLoss) {
        exitPrice = activePosition.stopLoss * (1 - config.slippagePercent);
        exitReason = activePosition.tp1Hit ? 'TRAILING_SL' : 'SL';
        shouldClose = true;
      }
      // TP1 (50% exit, move SL to breakeven)
      else if (!activePosition.tp1Hit && lastCandle.high >= activePosition.tp1) {
        const chunk = activePosition.size * 0.5;
        updatedPos.realizedPnl += (activePosition.tp1 - activePosition.entryPrice) * chunk;
        updatedPos.feesPaid += chunk * activePosition.tp1 * config.makerFee;
        updatedPos.remainingSize -= chunk;
        updatedPos.tp1Hit = true;
        updatedPos.stopLoss = activePosition.entryPrice * 1.0005; // Breakeven
      }
      // TP2 (30% exit, trail SL to TP1)
      else if (activePosition.tp1Hit && !activePosition.tp2Hit && lastCandle.high >= activePosition.tp2) {
        const chunk = activePosition.size * 0.3;
        updatedPos.realizedPnl += (activePosition.tp2 - activePosition.entryPrice) * chunk;
        updatedPos.feesPaid += chunk * activePosition.tp2 * config.makerFee;
        updatedPos.remainingSize -= chunk;
        updatedPos.tp2Hit = true;
        updatedPos.stopLoss = activePosition.tp1;
      }
      // TP3 (final 20% exit)
      else if (activePosition.tp2Hit && !activePosition.tp3Hit && lastCandle.high >= activePosition.tp3) {
        exitPrice = activePosition.tp3 * (1 - config.slippagePercent);
        exitReason = 'TP3';
        shouldClose = true;
      }
    } else if (activePosition.direction === 'SHORT') {
      // Stop Loss
      if (lastCandle.high >= activePosition.stopLoss) {
        exitPrice = activePosition.stopLoss * (1 + config.slippagePercent);
        exitReason = activePosition.tp1Hit ? 'TRAILING_SL' : 'SL';
        shouldClose = true;
      }
      // TP1 (50% exit, move SL to breakeven)
      else if (!activePosition.tp1Hit && lastCandle.low <= activePosition.tp1) {
        const chunk = activePosition.size * 0.5;
        updatedPos.realizedPnl += (activePosition.entryPrice - activePosition.tp1) * chunk;
        updatedPos.feesPaid += chunk * activePosition.tp1 * config.makerFee;
        updatedPos.remainingSize -= chunk;
        updatedPos.tp1Hit = true;
        updatedPos.stopLoss = activePosition.entryPrice * 0.9995; // Breakeven
      }
      // TP2 (30% exit, trail SL to TP1)
      else if (activePosition.tp1Hit && !activePosition.tp2Hit && lastCandle.low <= activePosition.tp2) {
        const chunk = activePosition.size * 0.3;
        updatedPos.realizedPnl += (activePosition.entryPrice - activePosition.tp2) * chunk;
        updatedPos.feesPaid += chunk * activePosition.tp2 * config.makerFee;
        updatedPos.remainingSize -= chunk;
        updatedPos.tp2Hit = true;
        updatedPos.stopLoss = activePosition.tp1;
      }
      // TP3 (final 20% exit)
      else if (activePosition.tp2Hit && !activePosition.tp3Hit && lastCandle.low <= activePosition.tp3) {
        exitPrice = activePosition.tp3 * (1 + config.slippagePercent);
        exitReason = 'TP3';
        shouldClose = true;
      }
    }

    if (shouldClose) {
      const pnlChunk =
        activePosition.direction === 'LONG'
          ? (exitPrice - activePosition.entryPrice) * activePosition.remainingSize
          : (activePosition.entryPrice - exitPrice) * activePosition.remainingSize;

      updatedPos.realizedPnl += pnlChunk;
      updatedPos.feesPaid += activePosition.remainingSize * exitPrice * config.takerFee;
      updatedPos.remainingSize = 0;
      updatedPos.status = 'CLOSED';
      updatedPos.exitPrice = exitPrice;
      updatedPos.exitTime = lastCandle.time;
      updatedPos.exitReason = exitReason;
      updatedPos.rMultiple = updatedPos.realizedPnl / updatedPos.riskAmount;

      riskManagerRef.current.recordTradeClosure(updatedPos, candles.length - 1);
      setSessionTrades((prev) => [...prev, updatedPos!]);
      setActivePosition(null);
      setRiskStateVersion((v) => v + 1);
    } else {
      setActivePosition(updatedPos);
    }
  }, [candles]);

  // Realtime Live Feed Subscription
  useEffect(() => {
    if (candles.length === 0) return;

    if (feedRef.current) {
      feedRef.current.stop();
    }

    const feed = new RealtimeMarketFeed(
      config.symbol,
      config.entryTimeframe,
      (candleUpdate, isClosed) => {
        setCandles((prev) => {
          if (prev.length === 0) return [candleUpdate];
          const last = prev[prev.length - 1];

          if (last.time === candleUpdate.time) {
            // Update in-flight candle
            return [...prev.slice(0, -1), candleUpdate];
          } else if (isClosed || candleUpdate.time > last.time) {
            // Append newly closed candle
            return [...prev.slice(-299), candleUpdate];
          }
          return prev;
        });
      }
    );

    feed.start(candles[candles.length - 1]);
    feedRef.current = feed;

    return () => {
      feed.stop();
    };
  }, [config.symbol, config.entryTimeframe, candles.length > 0 ? candles[0].time : 0]);

  // Execute Paper Trade
  const handleExecutePaperTrade = (signal: TradeSetup) => {
    if (activePosition || !signal.score.isTradable) return;

    const currentCandle = candles[candles.length - 1];
    const sizing = riskManagerRef.current.calculatePositionSizing(
      signal.direction,
      signal.entryPrice,
      signal.stopLoss,
      signal.tp3,
      signal.atr
    );

    if (!sizing.isValid) return;

    const newPosition: Position = {
      id: `pos_${Date.now()}`,
      setupId: signal.id,
      symbol: config.symbol,
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      entryTime: currentCandle.time,
      stopLoss: signal.stopLoss,
      initialStopLoss: signal.stopLoss,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      size: sizing.positionSizeBtc,
      notional: sizing.notionalUsd,
      riskAmount: sizing.riskAmountUsd,
      remainingSize: sizing.positionSizeBtc,
      status: 'OPEN',
      pnl: 0,
      pnlPercent: 0,
      realizedPnl: 0,
      feesPaid: sizing.notionalUsd * config.takerFee,
      rMultiple: 0,
      tp1Hit: false,
      tp2Hit: false,
      tp3Hit: false,
    };

    setActivePosition(newPosition);
  };

  // Close Active Position Manually
  const handleClosePosition = () => {
    if (!activePosition || candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;

    const pnlChunk =
      activePosition.direction === 'LONG'
        ? (exitPrice - activePosition.entryPrice) * activePosition.remainingSize
        : (activePosition.entryPrice - exitPrice) * activePosition.remainingSize;

    const closedPos: Position = {
      ...activePosition,
      realizedPnl: activePosition.realizedPnl + pnlChunk,
      feesPaid: activePosition.feesPaid + activePosition.remainingSize * exitPrice * config.takerFee,
      remainingSize: 0,
      status: 'CLOSED',
      exitPrice,
      exitTime: lastCandle.time,
      exitReason: 'MANUAL',
      rMultiple: (activePosition.realizedPnl + pnlChunk) / activePosition.riskAmount,
    };

    riskManagerRef.current.recordTradeClosure(closedPos, candles.length - 1);
    setSessionTrades((prev) => [...prev, closedPos]);
    setActivePosition(null);
    setRiskStateVersion((v) => v + 1);
  };

  // Reset Balance to $10,000
  const handleResetBalance = () => {
    riskManagerRef.current.resetDay(10000);
    setActivePosition(null);
    setSessionTrades([]);
    setRiskStateVersion((v) => v + 1);
  };

  // Current Price & 24h change
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 84500;
  const firstPrice = candles.length > 0 ? candles[0].close : 84500;
  const priceChange24h = ((currentPrice - firstPrice) / firstPrice) * 100;

  return (
    <div className="min-h-screen bg-[#070b14] text-[#d1d4dc] flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Application Header */}
      <Header
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        session={engineSnapshot?.session || 'LONDON'}
        config={config}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenCodeExport={() => setIsCodeExportOpen(true)}
        onToggleLiveTrading={(enabled) => setConfig((prev) => ({ ...prev, liveTrading: enabled }))}
        onResetPaperBalance={handleResetBalance}
      />

      {/* Main Terminal Dashboard */}
      <main className="flex-1 p-2 sm:p-3 max-w-[1720px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column (Chart & Trade Journal) - 8 Cols */}
        <div className="lg:col-span-8 flex flex-col gap-3 h-full">
          <div className="flex-1 min-h-[540px]">
            <TradingChart
              candles={candles}
              swingPoints={{
                swingHighs: engineSnapshot?.structure5m.swingHighs || [],
                swingLows: engineSnapshot?.structure5m.swingLows || [],
              }}
              liquidityPools={engineSnapshot?.liquidityPools || []}
              fvgs={engineSnapshot?.activeFvgs || []}
              lastSignal={engineSnapshot?.lastSignal || null}
              onRefresh={() => loadHistoricalCandles(config.symbol, config.entryTimeframe)}
              isLoading={isLoading}
              timeframe={config.entryTimeframe}
              onTimeframeChange={handleTimeframeChange}
              symbol={config.symbol}
              onSymbolChange={handleSymbolChange}
            />
          </div>

          <div>
            <TradeJournal trades={sessionTrades} />
          </div>
        </div>

        {/* Right Column (Signal Card, Market Structure, Risk Management) - 4 Cols */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Signal Card (Confirmation Over Prediction) */}
          <SignalCard
            signal={engineSnapshot?.lastSignal || null}
            scoreBreakdown={
              engineSnapshot?.scoreBreakdown || {
                score: 0,
                maxScore: 12,
                isTradable: false,
                htfBiasAlignment: false,
                liquiditySweep: false,
                displacement: false,
                mssBos: false,
                fvgPresent: false,
                fvgRetest: false,
                volumeConfirmation: false,
                sessionVolatilityConfirmation: false,
                noTradeReasons: ['Calculating market confluence...'],
              }
            }
            currentPrice={currentPrice}
            onExecutePaperTrade={handleExecutePaperTrade}
            isPositionOpen={activePosition !== null}
          />

          {/* Market Structure & State */}
          <MarketStatePanel
            htfBias={engineSnapshot?.htfBias || 'NEUTRAL'}
            structure5m={
              engineSnapshot?.structure5m || {
                structure: 'NEUTRAL',
                lastSwingHigh: null,
                lastSwingLow: null,
                swingHighs: [],
                swingLows: [],
                bos: false,
                mss: false,
                choch: false,
                trendStrength: 50,
              }
            }
            liquidityPools={engineSnapshot?.liquidityPools || []}
            atr={engineSnapshot?.atr || 0}
            adx={engineSnapshot?.adx || 25}
            adxThreshold={config.adxThreshold}
            isRanging={engineSnapshot?.isRanging || false}
            currentPrice={currentPrice}
          />

          {/* Risk Management & Active Position */}
          <RiskPanel
            riskState={riskManagerRef.current.getState()}
            activePosition={activePosition}
            currentPrice={currentPrice}
            onClosePosition={handleClosePosition}
            onResetBalance={handleResetBalance}
          />
        </div>
      </main>

      {/* Footer Ticker Bar */}
      <footer className="w-full bg-[#080c16] border-t border-[#162035] px-4 py-2 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-slate-300 font-bold">NEXUS BTC PRINCIPLE:</span>
          <span className="text-slate-400">
            &quot;CONFIRMATION OVER PREDICTION&quot; — Wait for institutional liquidity sweeps, displacement, and structural shifts.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span>Mode: {config.liveTrading ? 'LIVE' : 'PAPER TRADING'}</span>
          <span>Risk: {(config.riskPerTrade * 100).toFixed(1)}%</span>
          <span>Max Loss: {(config.maxDailyLoss * 100).toFixed(1)}%</span>
          <span>Version: {config.strategyVersion}</span>
        </div>
      </footer>

      {/* Modals */}
      <BacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        candles={candles}
        config={config}
      />

      <StrategyConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => setConfig(newConfig)}
      />

      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        lastSignal={engineSnapshot?.lastSignal || null}
      />

      <CodeExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
      />
    </div>
  );
}
