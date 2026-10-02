import { StrategyConfig } from '../types/trading';

export const DEFAULT_CONFIG: StrategyConfig = {
  symbol: 'BTCUSDT',
  htfTimeframe: '15m',
  entryTimeframe: '5m',
  refinementTimeframe: '1m',
  swingLength: 3,
  minSignalScore: 8,
  fvgAtrThreshold: 0.10,
  displacementAtrMultiplier: 0.80,
  slAtrBuffer: 0.15,
  tp1RMultiplier: 1.5,
  tp2RMultiplier: 2.0,
  tp3LiquidityTarget: true,
  riskPerTrade: 0.005, // 0.5%
  maxDailyLoss: 0.015, // 1.5%
  maxTradesPerDay: 3,
  maxConsecutiveLosses: 2,
  cooldownCandles: 3,
  enableRangeFilter: true,
  adxThreshold: 22,
  allowCounterTrend: false,
  makerFee: 0.0002, // 0.02%
  takerFee: 0.0004, // 0.04%
  slippagePercent: 0.0005, // 0.05%
  enabledSessions: ['ASIA', 'LONDON', 'NEW_YORK'],
  liveTrading: false, // Strict safety default
  strategyVersion: 'NEXUS-BTC-v1.0',
};
