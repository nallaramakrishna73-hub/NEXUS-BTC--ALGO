/**
 * NEXUS BTC — Smart Liquidity & Market Structure Trading Algorithm
 * Core Type Definitions
 */

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'RANGING';
export type TradeDirection = 'LONG' | 'SHORT' | 'NONE';

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: 'HIGH' | 'LOW';
  broken: boolean;
  classification?: 'HH' | 'HL' | 'LH' | 'LL';
}

export interface MarketStructureState {
  structure: MarketBias;
  lastSwingHigh: SwingPoint | null;
  lastSwingLow: SwingPoint | null;
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  bos: boolean;
  mss: boolean;
  choch: boolean;
  lastBosTime?: number;
  lastMssTime?: number;
  trendStrength: number; // 0 to 100
}

export interface LiquidityPool {
  id: string;
  type: 'BSL' | 'SSL' | 'EQH' | 'EQL' | 'SESSION_HIGH' | 'SESSION_LOW' | 'RANGE_HIGH' | 'RANGE_LOW';
  price: number;
  time: number;
  swept: boolean;
  sweptTime?: number;
  sweepCandleIndex?: number;
  rejectionConfirmed?: boolean;
}

export interface FairValueGap {
  id: string;
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  size: number;
  time: number;
  candleIndex: number;
  mitigated: boolean;
  retested: boolean;
  retestTime?: number;
}

export interface DisplacementResult {
  isDisplacement: boolean;
  direction: 'BULLISH' | 'BEARISH' | 'NONE';
  bodySize: number;
  atrRatio: number;
  volumeRatio: number;
  directionalConsistency: number; // 0 to 1
}

export interface SignalScoreBreakdown {
  score: number;
  maxScore: number; // 12
  isTradable: boolean; // score >= 8
  htfBiasAlignment: boolean; // +2
  liquiditySweep: boolean; // +2
  displacement: boolean; // +2
  mssBos: boolean; // +2
  fvgPresent: boolean; // +1
  fvgRetest: boolean; // +1
  volumeConfirmation: boolean; // +1
  sessionVolatilityConfirmation: boolean; // +1
  noTradeReasons: string[];
}

export interface TradeSetup {
  id: string;
  symbol: string;
  timeframe: string;
  time: number;
  direction: TradeDirection;
  score: SignalScoreBreakdown;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: number;
  atr: number;
  liquidityLevel?: LiquidityPool;
  fvgZone?: FairValueGap;
  mode: 'PAPER' | 'BACKTEST' | 'LIVE';
}

export interface Position {
  id: string;
  setupId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  entryTime: number;
  stopLoss: number;
  initialStopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  size: number; // BTC amount
  notional: number; // USD value
  riskAmount: number;
  remainingSize: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number;
  pnlPercent: number;
  realizedPnl: number;
  exitPrice?: number;
  exitTime?: number;
  exitReason?: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'TRAILING_SL' | 'MANUAL' | 'DAILY_LOSS_LIMIT' | 'TIMEOUT';
  feesPaid: number;
  rMultiple: number;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
}

export interface StrategyConfig {
  symbol: string;
  htfTimeframe: string; // "15m"
  entryTimeframe: string; // "5m"
  refinementTimeframe: string; // "1m"
  swingLength: number; // default 3
  minSignalScore: number; // default 8
  fvgAtrThreshold: number; // default 0.10
  displacementAtrMultiplier: number; // default 0.8
  slAtrBuffer: number; // default 0.15
  tp1RMultiplier: number; // default 1.5
  tp2RMultiplier: number; // default 2.0
  tp3LiquidityTarget: boolean; // true
  riskPerTrade: number; // 0.005 (0.5%)
  maxDailyLoss: number; // 0.015 (1.5%)
  maxTradesPerDay: number; // 3
  maxConsecutiveLosses: number; // 2
  cooldownCandles: number; // 3
  enableRangeFilter: boolean; // true
  adxThreshold: number; // 22
  allowCounterTrend: boolean; // false
  makerFee: number; // 0.0002 (0.02%)
  takerFee: number; // 0.0004 (0.04%)
  slippagePercent: number; // 0.0005 (0.05%)
  enabledSessions: ('ASIA' | 'LONDON' | 'NEW_YORK')[];
  liveTrading: boolean; // false default
  strategyVersion: string;
}

export interface RiskManagementState {
  initialBalance: number;
  currentBalance: number;
  dailyStartingBalance: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  peakBalance: number;
  currentDrawdown: number;
  tradesToday: number;
  consecutiveLosses: number;
  tradingHalted: boolean;
  haltReason?: string;
  cooldownUntilIndex: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  netPnlPercent: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageTrade: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageRMultiple: number;
  expectancy: number;
  sharpeRatio: number;
  sortinoRatio: number;
  recoveryFactor: number;
  longPerformance: {
    trades: number;
    winRate: number;
    pnl: number;
    profitFactor: number;
  };
  shortPerformance: {
    trades: number;
    winRate: number;
    pnl: number;
    profitFactor: number;
  };
  sessionPerformance: Record<string, { trades: number; pnl: number; winRate: number }>;
  monthlyPerformance: Record<string, { trades: number; pnl: number; winRate: number }>;
  equityCurve: { time: number; equity: number; drawdown: number }[];
}

export interface BacktestResult {
  id: string;
  config: StrategyConfig;
  startTime: number;
  endTime: number;
  candlesProcessed: number;
  metrics: BacktestMetrics;
  trades: Position[];
}

export interface MonteCarloSimulation {
  iterations: number;
  confidenceIntervals: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  maxDrawdownDistribution: number[];
  losingStreakDistribution: number[];
  equityPaths: { iteration: number; values: number[] }[];
}

export interface WalkForwardResult {
  periods: {
    periodIndex: number;
    trainRange: [string, string];
    testRange: [string, string];
    trainWinRate: number;
    trainProfitFactor: number;
    testWinRate: number;
    testProfitFactor: number;
    robustnessScore: number;
  }[];
  overallEfficiency: number;
}
