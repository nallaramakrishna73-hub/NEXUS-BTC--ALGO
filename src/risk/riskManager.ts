import { Candle, Position, RiskManagementState, StrategyConfig, TradeDirection, TradeSetup } from '../types/trading';

export class RiskManager {
  private state: RiskManagementState;
  private config: StrategyConfig;

  constructor(initialBalance: number = 10000, config: StrategyConfig) {
    this.config = config;
    this.state = {
      initialBalance,
      currentBalance: initialBalance,
      dailyStartingBalance: initialBalance,
      dailyPnl: 0,
      dailyPnlPercent: 0,
      peakBalance: initialBalance,
      currentDrawdown: 0,
      tradesToday: 0,
      consecutiveLosses: 0,
      tradingHalted: false,
      cooldownUntilIndex: -1,
    };
  }

  public getState(): RiskManagementState {
    return { ...this.state };
  }

  public resetDay(newStartingBalance?: number) {
    const bal = newStartingBalance ?? this.state.currentBalance;
    this.state.dailyStartingBalance = bal;
    this.state.dailyPnl = 0;
    this.state.dailyPnlPercent = 0;
    this.state.tradesToday = 0;
    this.state.tradingHalted = false;
    this.state.haltReason = undefined;
  }

  /**
   * Calculates entry, stop loss, TP1, TP2, TP3 and dynamic position size
   */
  public calculatePositionSizing(
    direction: TradeDirection,
    entryPrice: number,
    structuralLow: number,
    structuralHigh: number,
    atr: number
  ): {
    stopLoss: number;
    tp1: number;
    tp2: number;
    tp3: number;
    positionSizeBtc: number;
    notionalUsd: number;
    riskAmountUsd: number;
    riskRewardRatio: number;
    isValid: boolean;
    invalidReason?: string;
  } {
    const buffer = this.config.slAtrBuffer * atr;
    let stopLoss = 0;

    if (direction === 'LONG') {
      stopLoss = structuralLow - buffer;
      // Safety check: stop loss must be strictly below entry price
      if (stopLoss >= entryPrice) {
        stopLoss = entryPrice - atr * 1.2;
      }
    } else {
      stopLoss = structuralHigh + buffer;
      // Safety check: stop loss must be strictly above entry price
      if (stopLoss <= entryPrice) {
        stopLoss = entryPrice + atr * 1.2;
      }
    }

    const slDistance = Math.abs(entryPrice - stopLoss);
    if (slDistance <= 0) {
      return {
        stopLoss: 0,
        tp1: 0,
        tp2: 0,
        tp3: 0,
        positionSizeBtc: 0,
        notionalUsd: 0,
        riskAmountUsd: 0,
        riskRewardRatio: 0,
        isValid: false,
        invalidReason: 'Stop loss distance cannot be zero',
      };
    }

    // Dynamic risk formula: risk_amount = balance * risk_percent
    const riskAmountUsd = this.state.currentBalance * this.config.riskPerTrade;
    let positionSizeBtc = riskAmountUsd / slDistance;

    // Apply contract precision (e.g. 0.001 BTC step)
    positionSizeBtc = Math.floor(positionSizeBtc * 1000) / 1000;
    if (positionSizeBtc < 0.001) {
      positionSizeBtc = 0.001; // minimum exchange lot size
    }

    const notionalUsd = positionSizeBtc * entryPrice;

    // Target calculations
    let tp1 = 0;
    let tp2 = 0;
    let tp3 = 0;

    if (direction === 'LONG') {
      tp1 = entryPrice + slDistance * this.config.tp1RMultiplier;
      tp2 = entryPrice + slDistance * this.config.tp2RMultiplier;
      tp3 = entryPrice + slDistance * 3.0; // opposing liquidity default
    } else {
      tp1 = entryPrice - slDistance * this.config.tp1RMultiplier;
      tp2 = entryPrice - slDistance * this.config.tp2RMultiplier;
      tp3 = entryPrice - slDistance * 3.0;
    }

    const avgR = (this.config.tp1RMultiplier + this.config.tp2RMultiplier + 3.0) / 3;

    return {
      stopLoss,
      tp1,
      tp2,
      tp3,
      positionSizeBtc,
      notionalUsd,
      riskAmountUsd,
      riskRewardRatio: avgR,
      isValid: true,
    };
  }

  /**
   * Checks whether the strategy is allowed to take a new trade
   */
  public canTakeTrade(currentCandleIndex: number): { allowed: boolean; reason?: string } {
    if (this.state.tradingHalted) {
      return { allowed: false, reason: this.state.haltReason || 'Trading halted' };
    }

    if (this.state.tradesToday >= this.config.maxTradesPerDay) {
      return { allowed: false, reason: `Max daily trades reached (${this.config.maxTradesPerDay})` };
    }

    if (this.state.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.state.tradingHalted = true;
      this.state.haltReason = `Max consecutive losses (${this.config.maxConsecutiveLosses}) reached. Halting trading for the session.`;
      return { allowed: false, reason: this.state.haltReason };
    }

    // Daily loss check: maxDailyLoss (e.g. 1.5%)
    if (this.state.dailyPnlPercent <= -this.config.maxDailyLoss * 100) {
      this.state.tradingHalted = true;
      this.state.haltReason = `Max daily loss limit (-${(this.config.maxDailyLoss * 100).toFixed(1)}%) reached. Halting trading.`;
      return { allowed: false, reason: this.state.haltReason };
    }

    if (currentCandleIndex < this.state.cooldownUntilIndex) {
      const remaining = this.state.cooldownUntilIndex - currentCandleIndex;
      return { allowed: false, reason: `Cooldown active for ${remaining} more candle(s)` };
    }

    return { allowed: true };
  }

  /**
   * Records a closed trade and updates risk parameters
   */
  public recordTradeClosure(position: Position, closeIndex: number) {
    const netPnl = position.realizedPnl - position.feesPaid;
    this.state.currentBalance += netPnl;
    this.state.dailyPnl += netPnl;
    this.state.dailyPnlPercent = (this.state.dailyPnl / this.state.dailyStartingBalance) * 100;
    this.state.tradesToday += 1;

    // Track peak and drawdown
    if (this.state.currentBalance > this.state.peakBalance) {
      this.state.peakBalance = this.state.currentBalance;
    }
    this.state.currentDrawdown =
      ((this.state.peakBalance - this.state.currentBalance) / this.state.peakBalance) * 100;

    // Consecutive loss handling
    if (netPnl < 0) {
      this.state.consecutiveLosses += 1;
    } else {
      this.state.consecutiveLosses = 0; // reset consecutive losses on win
    }

    // Cooldown period enforcement
    this.state.cooldownUntilIndex = closeIndex + this.config.cooldownCandles;

    // Post-trade safety check
    if (this.state.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.state.tradingHalted = true;
      this.state.haltReason = `Max consecutive losses reached (${this.config.maxConsecutiveLosses})`;
    } else if (this.state.dailyPnlPercent <= -this.config.maxDailyLoss * 100) {
      this.state.tradingHalted = true;
      this.state.haltReason = `Max daily loss reached (${(this.config.maxDailyLoss * 100).toFixed(1)}%)`;
    }
  }
}
