import { calculateADX, calculateATR } from '../core/volatility';
import { RiskManager } from '../risk/riskManager';
import { NexusStrategyEngine } from '../strategy/nexusEngine';
import { BacktestResult, Candle, Position, StrategyConfig } from '../types/trading';
import { calculateBacktestMetrics } from './metrics';

export interface BacktestOptions {
  candles: Candle[];
  config: StrategyConfig;
  initialBalance?: number;
}

export class BacktestEngine {
  /**
   * Executes event-driven candle-by-candle backtest with zero future data leakage
   */
  public static runBacktest(options: BacktestOptions): BacktestResult {
    const { candles, config, initialBalance = 10000 } = options;

    const riskManager = new RiskManager(initialBalance, config);
    const strategyEngine = new NexusStrategyEngine(config, riskManager);

    // Precalculate technical series up to current index safely
    const atrSeries = calculateATR(candles, 14);
    const { adx: adxSeries } = calculateADX(candles, 14);

    const closedTrades: Position[] = [];
    let activePosition: Position | null = null;
    const equityCurve: { time: number; equity: number; drawdown: number }[] = [];

    let peakEquity = initialBalance;
    let currentDayStr = '';

    // Warm-up period (need at least 30 candles for swings and ATR)
    const startIndex = Math.max(35, config.swingLength * 4);

    for (let i = startIndex; i < candles.length; i++) {
      const candle = candles[i];

      // Day boundary check for daily loss reset
      const candleDate = new Date(candle.time * 1000).toISOString().split('T')[0];
      if (candleDate !== currentDayStr) {
        currentDayStr = candleDate;
        riskManager.resetDay();
      }

      // --- 1. MANAGE ACTIVE POSITION (Check SL, TP1, TP2, TP3) ---
      if (activePosition) {
        const pos = activePosition;
        let positionClosed = false;

        if (pos.direction === 'LONG') {
          // Check Stop Loss
          if (candle.low <= pos.stopLoss) {
            const exitPrice = pos.stopLoss * (1 - config.slippagePercent);
            const lossOnRemaining = (exitPrice - pos.entryPrice) * pos.remainingSize;
            pos.realizedPnl += lossOnRemaining;
            pos.feesPaid += pos.remainingSize * exitPrice * config.takerFee;
            pos.remainingSize = 0;
            pos.status = 'CLOSED';
            pos.exitPrice = exitPrice;
            pos.exitTime = candle.time;
            pos.exitReason = pos.tp1Hit ? 'TRAILING_SL' : 'SL';
            pos.rMultiple = pos.realizedPnl / pos.riskAmount;
            closedTrades.push({ ...pos });
            riskManager.recordTradeClosure(pos, i);
            activePosition = null;
            positionClosed = true;
          }
          // Check TP1 (50% exit, move SL to breakeven)
          else if (!pos.tp1Hit && candle.high >= pos.tp1) {
            const exitPrice = pos.tp1 * (1 - config.slippagePercent);
            const closeSize = pos.size * 0.5;
            const pnlChunk = (exitPrice - pos.entryPrice) * closeSize;
            pos.realizedPnl += pnlChunk;
            pos.feesPaid += closeSize * exitPrice * config.makerFee;
            pos.remainingSize -= closeSize;
            pos.tp1Hit = true;
            // Move Stop Loss to Entry (Breakeven + tiny buffer for fees)
            pos.stopLoss = pos.entryPrice * 1.0005;
          }
          // Check TP2 (30% exit, trail SL to TP1)
          else if (pos.tp1Hit && !pos.tp2Hit && candle.high >= pos.tp2) {
            const exitPrice = pos.tp2 * (1 - config.slippagePercent);
            const closeSize = pos.size * 0.3;
            const pnlChunk = (exitPrice - pos.entryPrice) * closeSize;
            pos.realizedPnl += pnlChunk;
            pos.feesPaid += closeSize * exitPrice * config.makerFee;
            pos.remainingSize -= closeSize;
            pos.tp2Hit = true;
            pos.stopLoss = pos.tp1; // Trail stop to TP1
          }
          // Check TP3 (remaining 20% exit)
          else if (pos.tp2Hit && !pos.tp3Hit && candle.high >= pos.tp3) {
            const exitPrice = pos.tp3 * (1 - config.slippagePercent);
            const pnlChunk = (exitPrice - pos.entryPrice) * pos.remainingSize;
            pos.realizedPnl += pnlChunk;
            pos.feesPaid += pos.remainingSize * exitPrice * config.makerFee;
            pos.remainingSize = 0;
            pos.status = 'CLOSED';
            pos.exitPrice = exitPrice;
            pos.exitTime = candle.time;
            pos.exitReason = 'TP3';
            pos.tp3Hit = true;
            pos.rMultiple = pos.realizedPnl / pos.riskAmount;
            closedTrades.push({ ...pos });
            riskManager.recordTradeClosure(pos, i);
            activePosition = null;
            positionClosed = true;
          }
        } else if (pos.direction === 'SHORT') {
          // Check Stop Loss
          if (candle.high >= pos.stopLoss) {
            const exitPrice = pos.stopLoss * (1 + config.slippagePercent);
            const lossOnRemaining = (pos.entryPrice - exitPrice) * pos.remainingSize;
            pos.realizedPnl += lossOnRemaining;
            pos.feesPaid += pos.remainingSize * exitPrice * config.takerFee;
            pos.remainingSize = 0;
            pos.status = 'CLOSED';
            pos.exitPrice = exitPrice;
            pos.exitTime = candle.time;
            pos.exitReason = pos.tp1Hit ? 'TRAILING_SL' : 'SL';
            pos.rMultiple = pos.realizedPnl / pos.riskAmount;
            closedTrades.push({ ...pos });
            riskManager.recordTradeClosure(pos, i);
            activePosition = null;
            positionClosed = true;
          }
          // Check TP1 (50% exit, move SL to breakeven)
          else if (!pos.tp1Hit && candle.low <= pos.tp1) {
            const exitPrice = pos.tp1 * (1 + config.slippagePercent);
            const closeSize = pos.size * 0.5;
            const pnlChunk = (pos.entryPrice - exitPrice) * closeSize;
            pos.realizedPnl += pnlChunk;
            pos.feesPaid += closeSize * exitPrice * config.makerFee;
            pos.remainingSize -= closeSize;
            pos.tp1Hit = true;
            pos.stopLoss = pos.entryPrice * 0.9995; // Breakeven
          }
          // Check TP2 (30% exit, trail SL to TP1)
          else if (pos.tp1Hit && !pos.tp2Hit && candle.low <= pos.tp2) {
            const exitPrice = pos.tp2 * (1 + config.slippagePercent);
            const closeSize = pos.size * 0.3;
            const pnlChunk = (pos.entryPrice - exitPrice) * closeSize;
            pos.realizedPnl += pnlChunk;
            pos.feesPaid += closeSize * exitPrice * config.makerFee;
            pos.remainingSize -= closeSize;
            pos.tp2Hit = true;
            pos.stopLoss = pos.tp1; // Trail stop to TP1
          }
          // Check TP3 (remaining 20% exit)
          else if (pos.tp2Hit && !pos.tp3Hit && candle.low <= pos.tp3) {
            const exitPrice = pos.tp3 * (1 + config.slippagePercent);
            const pnlChunk = (pos.entryPrice - exitPrice) * pos.remainingSize;
            pos.realizedPnl += pnlChunk;
            pos.feesPaid += pos.remainingSize * exitPrice * config.makerFee;
            pos.remainingSize = 0;
            pos.status = 'CLOSED';
            pos.exitPrice = exitPrice;
            pos.exitTime = candle.time;
            pos.exitReason = 'TP3';
            pos.tp3Hit = true;
            pos.rMultiple = pos.realizedPnl / pos.riskAmount;
            closedTrades.push({ ...pos });
            riskManager.recordTradeClosure(pos, i);
            activePosition = null;
            positionClosed = true;
          }
        }
      }

      // --- 2. EVALUATE STRATEGY AT CURRENT CANDLE CLOSE ---
      const snapshot = strategyEngine.evaluate(candles, i, atrSeries, adxSeries);

      // --- 3. CHECK FOR NEW ENTRY (Only if flat and signal confirmed) ---
      if (!activePosition && snapshot.lastSignal && snapshot.scoreBreakdown.isTradable) {
        const sig = snapshot.lastSignal;
        const entryPriceWithSlippage =
          sig.direction === 'LONG'
            ? candle.close * (1 + config.slippagePercent)
            : candle.close * (1 - config.slippagePercent);

        const structuralLow = sig.liquidityLevel?.type === 'SSL' ? sig.liquidityLevel.price : sig.stopLoss;
        const structuralHigh = sig.liquidityLevel?.type === 'BSL' ? sig.liquidityLevel.price : sig.stopLoss;

        const sizing = riskManager.calculatePositionSizing(
          sig.direction,
          entryPriceWithSlippage,
          structuralLow,
          structuralHigh,
          snapshot.atr
        );

        if (sizing.isValid && sizing.positionSizeBtc > 0) {
          const entryFee = sizing.notionalUsd * config.takerFee;

          activePosition = {
            id: `bt_${candle.time}_${sig.direction}`,
            setupId: sig.id,
            symbol: config.symbol,
            direction: sig.direction,
            entryPrice: entryPriceWithSlippage,
            entryTime: candle.time,
            stopLoss: sig.stopLoss,
            initialStopLoss: sig.stopLoss,
            tp1: sig.tp1,
            tp2: sig.tp2,
            tp3: sig.tp3,
            size: sizing.positionSizeBtc,
            notional: sizing.notionalUsd,
            riskAmount: sizing.riskAmountUsd,
            remainingSize: sizing.positionSizeBtc,
            status: 'OPEN',
            pnl: 0,
            pnlPercent: 0,
            realizedPnl: 0,
            feesPaid: entryFee,
            rMultiple: 0,
            tp1Hit: false,
            tp2Hit: false,
            tp3Hit: false,
          };
        }
      }

      // Track equity curve
      const riskState = riskManager.getState();
      let currentEquity = riskState.currentBalance;
      if (activePosition) {
        const unrealized =
          activePosition.direction === 'LONG'
            ? (candle.close - activePosition.entryPrice) * activePosition.remainingSize
            : (activePosition.entryPrice - candle.close) * activePosition.remainingSize;
        currentEquity += activePosition.realizedPnl + unrealized - activePosition.feesPaid;
      }

      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const ddPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;

      // Sample curve every 3 candles or on trade closure to optimize payload size
      if (i % 3 === 0 || i === candles.length - 1) {
        equityCurve.push({
          time: candle.time,
          equity: Math.round(currentEquity * 100) / 100,
          drawdown: Math.round(ddPct * 100) / 100,
        });
      }
    }

    // Force close active trade at end of backtest data
    if (activePosition) {
      const lastCandle = candles[candles.length - 1];
      const exitPrice = lastCandle.close;
      const unrealized =
        activePosition.direction === 'LONG'
          ? (exitPrice - activePosition.entryPrice) * activePosition.remainingSize
          : (activePosition.entryPrice - exitPrice) * activePosition.remainingSize;

      activePosition.realizedPnl += unrealized;
      activePosition.feesPaid += activePosition.remainingSize * exitPrice * config.takerFee;
      activePosition.remainingSize = 0;
      activePosition.status = 'CLOSED';
      activePosition.exitPrice = exitPrice;
      activePosition.exitTime = lastCandle.time;
      activePosition.exitReason = 'TIMEOUT';
      activePosition.rMultiple = activePosition.realizedPnl / activePosition.riskAmount;
      closedTrades.push(activePosition);
    }

    const metrics = calculateBacktestMetrics(closedTrades, initialBalance, equityCurve);

    return {
      id: `bt_${Date.now()}`,
      config,
      startTime: candles[0].time,
      endTime: candles[candles.length - 1].time,
      candlesProcessed: candles.length,
      metrics,
      trades: closedTrades,
    };
  }
}
