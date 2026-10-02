import { detectDisplacement } from '../core/displacement';
import { detectFVG, updateFVGs } from '../core/fvg';
import { detectLiquiditySweep, identifyLiquidityPools } from '../core/liquidity';
import { analyzeMarketStructure } from '../core/marketStructure';
import { calculateSignalScore } from '../core/scoring';
import { calculateADX, calculateATR, isMarketRanging } from '../core/volatility';
import { analyzeVolume, getTradingSession } from '../core/volume';
import { RiskManager } from '../risk/riskManager';
import {
  Candle,
  FairValueGap,
  LiquidityPool,
  MarketBias,
  MarketStructureState,
  SignalScoreBreakdown,
  StrategyConfig,
  TradeDirection,
  TradeSetup,
} from '../types/trading';

export interface NexusEngineSnapshot {
  time: number;
  price: number;
  htfBias: MarketBias;
  structure5m: MarketStructureState;
  liquidityPools: LiquidityPool[];
  activeFvgs: FairValueGap[];
  atr: number;
  adx: number;
  isRanging: boolean;
  rangeReason?: string;
  session: string;
  volumeRvol: number;
  lastSignal: TradeSetup | null;
  scoreBreakdown: SignalScoreBreakdown;
}

export class NexusStrategyEngine {
  private config: StrategyConfig;
  private riskManager: RiskManager;
  private storedFvgs: FairValueGap[] = [];
  private lastEvaluatedIndex: number = -1;

  constructor(config: StrategyConfig, riskManager: RiskManager) {
    this.config = config;
    this.riskManager = riskManager;
  }

  public updateConfig(newConfig: StrategyConfig) {
    this.config = newConfig;
  }

  /**
   * Resamples 5m candles into 15m HTF candles up to currentIndex
   * STRICTLY NO LOOKAHEAD: uses only closed 5m candles up to currentIndex
   */
  public getHTFBias(candles5m: Candle[], currentIndex: number): MarketBias {
    if (currentIndex < 15) return 'NEUTRAL';

    // Group 3 5m candles into 15m candles
    const htfCandles: Candle[] = [];
    const maxCandles = currentIndex + 1;
    for (let i = 0; i < maxCandles; i += 3) {
      if (i + 2 < maxCandles) {
        const c1 = candles5m[i];
        const c2 = candles5m[i + 1];
        const c3 = candles5m[i + 2];
        htfCandles.push({
          time: c3.time,
          open: c1.open,
          high: Math.max(c1.high, c2.high, c3.high),
          low: Math.min(c1.low, c2.low, c3.low),
          close: c3.close,
          volume: c1.volume + c2.volume + c3.volume,
        });
      }
    }

    if (htfCandles.length < 6) return 'NEUTRAL';

    // Analyze market structure on HTF candles
    const htfStructure = analyzeMarketStructure(
      htfCandles,
      htfCandles.length - 1,
      Math.max(2, this.config.swingLength - 1)
    );
    return htfStructure.structure;
  }

  /**
   * Evaluates the full NEXUS BTC strategy at candle (currentIndex)
   */
  public evaluate(
    candles: Candle[],
    currentIndex: number,
    atrValues: number[],
    adxValues: number[]
  ): NexusEngineSnapshot {
    const currentCandle = candles[currentIndex];
    const atr = atrValues[currentIndex] || currentCandle.high - currentCandle.low;
    const adx = adxValues[currentIndex] || 25;

    // 1. HTF Bias
    const htfBias = this.getHTFBias(candles, currentIndex);

    // 2. 5M Market Structure
    const structure5m = analyzeMarketStructure(candles, currentIndex, this.config.swingLength);

    // 3. Liquidity Pools & Sweeps
    const pools = identifyLiquidityPools(candles, currentIndex, structure5m.swingHighs, structure5m.swingLows);
    const sweep = detectLiquiditySweep(candles, currentIndex, pools, atr);

    // 4. Fair Value Gaps (FVG)
    const newFvg = detectFVG(candles, currentIndex, atr, this.config.fvgAtrThreshold);
    if (newFvg) {
      this.storedFvgs.push(newFvg);
      // Keep recent 20 unmitigated
      if (this.storedFvgs.length > 30) {
        this.storedFvgs = this.storedFvgs.slice(-30);
      }
    }

    const { updatedFvgs, activeRetest } = updateFVGs(this.storedFvgs, currentCandle);
    this.storedFvgs = updatedFvgs;

    // 5. Displacement
    const displacement = detectDisplacement(candles, currentIndex, atr, this.config.displacementAtrMultiplier);

    // 6. Range Detection
    const { isRanging, reason: rangeReason } = this.config.enableRangeFilter
      ? isMarketRanging(candles, currentIndex, adxValues, this.config.adxThreshold)
      : { isRanging: false, reason: undefined };

    // 7. Volume and Session
    const { isVolumeConfirmed, rvol } = analyzeVolume(candles, currentIndex, 20);
    const session = getTradingSession(currentCandle.time);
    const sessionValid =
      session !== 'OFF_HOURS' &&
      this.config.enabledSessions.includes(session as 'ASIA' | 'LONDON' | 'NEW_YORK');

    const volatilityValid = !isRanging && atr > 0;

    // 8. Determine candidate direction
    let candidateDirection: TradeDirection = 'NONE';
    if (sweep.isSweep && sweep.type === 'BULLISH') {
      candidateDirection = 'LONG';
    } else if (sweep.isSweep && sweep.type === 'BEARISH') {
      candidateDirection = 'SHORT';
    } else if (structure5m.mss || structure5m.bos) {
      if (structure5m.structure === 'BULLISH' && (displacement.direction === 'BULLISH' || activeRetest?.type === 'BULLISH')) {
        candidateDirection = 'LONG';
      } else if (structure5m.structure === 'BEARISH' && (displacement.direction === 'BEARISH' || activeRetest?.type === 'BEARISH')) {
        candidateDirection = 'SHORT';
      }
    }

    // 9. Risk Manager Permissions
    const riskCheck = this.riskManager.canTakeTrade(currentIndex);
    const cooldownActive = !riskCheck.allowed && (riskCheck.reason?.includes('Cooldown') || false);
    const dailyLossHalted = !riskCheck.allowed && (riskCheck.reason?.includes('daily loss') || false);
    const consecutiveLossHalted = !riskCheck.allowed && (riskCheck.reason?.includes('consecutive') || false);

    // 10. Scoring Engine
    const scoreBreakdown = calculateSignalScore({
      direction: candidateDirection,
      htfBias,
      structure5m,
      sweep,
      displacement,
      recentFvgs: this.storedFvgs,
      activeRetestFvg: activeRetest,
      volumeConfirmed: isVolumeConfirmed,
      sessionValid,
      volatilityValid,
      isRanging,
      rangeReason,
      cooldownActive,
      dailyLossHalted,
      consecutiveLossHalted,
    });

    let lastSignal: TradeSetup | null = null;

    if (scoreBreakdown.isTradable && candidateDirection !== 'NONE') {
      const structuralLow =
        sweep.sweptPool?.type === 'SSL'
          ? Math.min(sweep.sweptPool.price, currentCandle.low)
          : structure5m.lastSwingLow?.price || currentCandle.low;

      const structuralHigh =
        sweep.sweptPool?.type === 'BSL'
          ? Math.max(sweep.sweptPool.price, currentCandle.high)
          : structure5m.lastSwingHigh?.price || currentCandle.high;

      const sizing = this.riskManager.calculatePositionSizing(
        candidateDirection,
        currentCandle.close,
        structuralLow,
        structuralHigh,
        atr
      );

      if (sizing.isValid) {
        lastSignal = {
          id: `sig_${currentCandle.time}_${candidateDirection}`,
          symbol: this.config.symbol,
          timeframe: this.config.entryTimeframe,
          time: currentCandle.time,
          direction: candidateDirection,
          score: scoreBreakdown,
          entryPrice: currentCandle.close,
          stopLoss: sizing.stopLoss,
          tp1: sizing.tp1,
          tp2: sizing.tp2,
          tp3: sizing.tp3,
          riskReward: sizing.riskRewardRatio,
          atr,
          liquidityLevel: sweep.sweptPool,
          fvgZone: activeRetest || undefined,
          mode: this.config.liveTrading ? 'LIVE' : 'PAPER',
        };
      }
    }

    return {
      time: currentCandle.time,
      price: currentCandle.close,
      htfBias,
      structure5m,
      liquidityPools: pools,
      activeFvgs: this.storedFvgs.filter((f) => !f.mitigated),
      atr,
      adx,
      isRanging,
      rangeReason,
      session,
      volumeRvol: rvol,
      lastSignal,
      scoreBreakdown,
    };
  }
}
