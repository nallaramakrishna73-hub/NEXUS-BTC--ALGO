import { Candle, LiquidityPool, SwingPoint } from '../types/trading';

/**
 * Identify potential liquidity pools from confirmed swing points, equal highs/lows, and session levels
 */
export function identifyLiquidityPools(
  candles: Candle[],
  currentIndex: number,
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[]
): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const equalTolerancePercent = 0.001; // 0.1% tolerance for equal highs/lows

  // 1. Swing Highs as Buy-Side Liquidity (BSL)
  const recentHighs = swingHighs.slice(-6);
  for (const sh of recentHighs) {
    pools.push({
      id: `bsl_${sh.index}_${sh.price.toFixed(1)}`,
      type: 'BSL',
      price: sh.price,
      time: sh.time,
      swept: false,
    });
  }

  // 2. Swing Lows as Sell-Side Liquidity (SSL)
  const recentLows = swingLows.slice(-6);
  for (const sl of recentLows) {
    pools.push({
      id: `ssl_${sl.index}_${sl.price.toFixed(1)}`,
      type: 'SSL',
      price: sl.price,
      time: sl.time,
      swept: false,
    });
  }

  // 3. Detect Equal Highs (EQH)
  for (let i = 0; i < recentHighs.length; i++) {
    for (let j = i + 1; j < recentHighs.length; j++) {
      const diff = Math.abs(recentHighs[i].price - recentHighs[j].price) / recentHighs[i].price;
      if (diff <= equalTolerancePercent) {
        pools.push({
          id: `eqh_${recentHighs[i].index}_${recentHighs[j].index}`,
          type: 'EQH',
          price: Math.max(recentHighs[i].price, recentHighs[j].price),
          time: recentHighs[j].time,
          swept: false,
        });
      }
    }
  }

  // 4. Detect Equal Lows (EQL)
  for (let i = 0; i < recentLows.length; i++) {
    for (let j = i + 1; j < recentLows.length; j++) {
      const diff = Math.abs(recentLows[i].price - recentLows[j].price) / recentLows[i].price;
      if (diff <= equalTolerancePercent) {
        pools.push({
          id: `eql_${recentLows[i].index}_${recentLows[j].index}`,
          type: 'EQL',
          price: Math.min(recentLows[i].price, recentLows[j].price),
          time: recentLows[j].time,
          swept: false,
        });
      }
    }
  }

  // 5. Session Highs / Lows (e.g. past 288 candles for 5m = 24h)
  const lookback24h = Math.min(288, currentIndex);
  if (lookback24h > 24) {
    const sessionSlice = candles.slice(currentIndex - lookback24h, currentIndex);
    let sHigh = -Infinity;
    let sLow = Infinity;
    let sHighTime = 0;
    let sLowTime = 0;

    for (const c of sessionSlice) {
      if (c.high > sHigh) {
        sHigh = c.high;
        sHighTime = c.time;
      }
      if (c.low < sLow) {
        sLow = c.low;
        sLowTime = c.time;
      }
    }

    pools.push({
      id: `session_high_${sHighTime}`,
      type: 'SESSION_HIGH',
      price: sHigh,
      time: sHighTime,
      swept: false,
    });

    pools.push({
      id: `session_low_${sLowTime}`,
      type: 'SESSION_LOW',
      price: sLow,
      time: sLowTime,
      swept: false,
    });
  }

  return pools;
}

/**
 * Checks for genuine liquidity sweep at the current candle or recent 3 candles
 */
export function detectLiquiditySweep(
  candles: Candle[],
  currentIndex: number,
  liquidityPools: LiquidityPool[],
  atr: number
): {
  isSweep: boolean;
  type: 'BULLISH' | 'BEARISH' | 'NONE';
  sweptPool?: LiquidityPool;
  rejectionWickRatio: number;
} {
  if (currentIndex < 2 || liquidityPools.length === 0) {
    return { isSweep: false, type: 'NONE', rejectionWickRatio: 0 };
  }

  // Look at current candle and up to 2 candles prior for multi-candle sweep + rejection
  const checkCandle = candles[currentIndex];
  const prevCandle = candles[currentIndex - 1];

  const totalRange = checkCandle.high - checkCandle.low;
  if (totalRange <= 0) return { isSweep: false, type: 'NONE', rejectionWickRatio: 0 };

  const lowerWick = Math.min(checkCandle.open, checkCandle.close) - checkCandle.low;
  const upperWick = checkCandle.high - Math.max(checkCandle.open, checkCandle.close);
  const lowerWickRatio = lowerWick / totalRange;
  const upperWickRatio = upperWick / totalRange;

  // Minimum wick ratio to confirm rejection
  const minRejectionRatio = 0.35;

  // Check Bullish Sweep (Sell-side liquidity swept, wick went below pool, but candle closes back ABOVE level)
  const sslPools = liquidityPools.filter(
    (p) => p.type === 'SSL' || p.type === 'EQL' || p.type === 'SESSION_LOW' || p.type === 'RANGE_LOW'
  );

  for (const pool of sslPools) {
    // Condition A: Single candle sweep: low went below pool price, but close > pool price
    const singleCandleSweep =
      checkCandle.low < pool.price &&
      checkCandle.close > pool.price &&
      lowerWickRatio >= minRejectionRatio &&
      pool.price - checkCandle.low >= 0.05 * atr;

    // Condition B: Two-candle sweep: prev candle traded below, current candle vigorously rejected back above
    const twoCandleSweep =
      prevCandle.low < pool.price &&
      prevCandle.close < pool.price &&
      checkCandle.close > pool.price &&
      checkCandle.close > checkCandle.open; // Bullish candle

    if (singleCandleSweep || twoCandleSweep) {
      pool.swept = true;
      pool.sweptTime = checkCandle.time;
      pool.sweepCandleIndex = currentIndex;
      pool.rejectionConfirmed = true;

      return {
        isSweep: true,
        type: 'BULLISH',
        sweptPool: pool,
        rejectionWickRatio: lowerWickRatio,
      };
    }
  }

  // Check Bearish Sweep (Buy-side liquidity swept, wick went above pool, but candle closes back BELOW level)
  const bslPools = liquidityPools.filter(
    (p) => p.type === 'BSL' || p.type === 'EQH' || p.type === 'SESSION_HIGH' || p.type === 'RANGE_HIGH'
  );

  for (const pool of bslPools) {
    // Condition A: Single candle sweep: high went above pool price, but close < pool price
    const singleCandleSweep =
      checkCandle.high > pool.price &&
      checkCandle.close < pool.price &&
      upperWickRatio >= minRejectionRatio &&
      checkCandle.high - pool.price >= 0.05 * atr;

    // Condition B: Two-candle sweep: prev candle traded above, current candle closed back below
    const twoCandleSweep =
      prevCandle.high > pool.price &&
      prevCandle.close > pool.price &&
      checkCandle.close < pool.price &&
      checkCandle.close < checkCandle.open; // Bearish candle

    if (singleCandleSweep || twoCandleSweep) {
      pool.swept = true;
      pool.sweptTime = checkCandle.time;
      pool.sweepCandleIndex = currentIndex;
      pool.rejectionConfirmed = true;

      return {
        isSweep: true,
        type: 'BEARISH',
        sweptPool: pool,
        rejectionWickRatio: upperWickRatio,
      };
    }
  }

  return { isSweep: false, type: 'NONE', rejectionWickRatio: 0 };
}
