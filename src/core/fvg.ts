import { Candle, FairValueGap } from '../types/trading';

/**
 * Detects new 3-candle Fair Value Gaps formed at candle (currentIndex)
 * Candle 1: currentIndex - 2
 * Candle 2: currentIndex - 1 (displacement candle)
 * Candle 3: currentIndex (completes the 3-candle pattern)
 */
export function detectFVG(
  candles: Candle[],
  currentIndex: number,
  atr: number,
  atrThreshold: number = 0.10
): FairValueGap | null {
  if (currentIndex < 2) return null;

  const c1 = candles[currentIndex - 2];
  const c2 = candles[currentIndex - 1];
  const c3 = candles[currentIndex];

  const minGapSize = atr * atrThreshold;

  // Bullish FVG: Candle 1 High < Candle 3 Low
  if (c1.high < c3.low && c2.close > c2.open) {
    const gapSize = c3.low - c1.high;
    if (gapSize >= minGapSize) {
      return {
        id: `fvg_bullish_${c2.time}`,
        type: 'BULLISH',
        top: c3.low,
        bottom: c1.high,
        size: gapSize,
        time: c2.time,
        candleIndex: currentIndex - 1,
        mitigated: false,
        retested: false,
      };
    }
  }

  // Bearish FVG: Candle 1 Low > Candle 3 High
  if (c1.low > c3.high && c2.close < c2.open) {
    const gapSize = c1.low - c3.high;
    if (gapSize >= minGapSize) {
      return {
        id: `fvg_bearish_${c2.time}`,
        type: 'BEARISH',
        top: c1.low,
        bottom: c3.high,
        size: gapSize,
        time: c2.time,
        candleIndex: currentIndex - 1,
        mitigated: false,
        retested: false,
      };
    }
  }

  return null;
}

/**
 * Updates existing FVGs for retests and mitigation based on current candle
 */
export function updateFVGs(
  fvgs: FairValueGap[],
  currentCandle: Candle
): { updatedFvgs: FairValueGap[]; activeRetest: FairValueGap | null } {
  let activeRetest: FairValueGap | null = null;

  const updatedFvgs = fvgs.map((fvg) => {
    if (fvg.mitigated) return fvg;

    const copy = { ...fvg };
    const midpoint = (fvg.top + fvg.bottom) / 2;

    // Check Retest (price trades into the gap)
    if (currentCandle.low <= fvg.top && currentCandle.high >= fvg.bottom) {
      copy.retested = true;
      copy.retestTime = currentCandle.time;
      activeRetest = copy;
    }

    // Check Mitigation (price closes past midpoint or fully covers the gap)
    if (fvg.type === 'BULLISH') {
      if (currentCandle.close < midpoint || currentCandle.low < fvg.bottom) {
        copy.mitigated = true;
      }
    } else {
      if (currentCandle.close > midpoint || currentCandle.high > fvg.top) {
        copy.mitigated = true;
      }
    }

    return copy;
  });

  return { updatedFvgs, activeRetest };
}
