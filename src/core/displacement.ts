import { Candle, DisplacementResult } from '../types/trading';

/**
 * Detects displacement (strong directional institutional candle)
 */
export function detectDisplacement(
  candles: Candle[],
  currentIndex: number,
  atr: number,
  multiplier: number = 0.8
): DisplacementResult {
  if (currentIndex < 20) {
    return {
      isDisplacement: false,
      direction: 'NONE',
      bodySize: 0,
      atrRatio: 0,
      volumeRatio: 1,
      directionalConsistency: 0,
    };
  }

  const c = candles[currentIndex];
  const bodySize = Math.abs(c.close - c.open);
  const totalRange = c.high - c.low;

  if (totalRange <= 0 || atr <= 0) {
    return {
      isDisplacement: false,
      direction: 'NONE',
      bodySize: 0,
      atrRatio: 0,
      volumeRatio: 1,
      directionalConsistency: 0,
    };
  }

  const atrRatio = bodySize / atr;
  const directionalConsistency = bodySize / totalRange;

  // Calculate 20-period average volume
  let volSum = 0;
  for (let i = currentIndex - 20; i < currentIndex; i++) {
    volSum += candles[i].volume;
  }
  const avgVol = volSum / 20;
  const volumeRatio = avgVol > 0 ? c.volume / avgVol : 1;

  // Conditions for true displacement:
  // 1. Body >= multiplier * ATR
  // 2. Body comprises at least 60% of total range (not a high-wick doji)
  // 3. Volume is at or above average volume (volumeRatio >= 1.0)
  const isLargeBody = atrRatio >= multiplier;
  const isHighConsistency = directionalConsistency >= 0.60;
  const hasVolume = volumeRatio >= 0.95;

  const isDisplacement = isLargeBody && isHighConsistency && hasVolume;
  const direction = !isDisplacement ? 'NONE' : c.close > c.open ? 'BULLISH' : 'BEARISH';

  return {
    isDisplacement,
    direction,
    bodySize,
    atrRatio,
    volumeRatio,
    directionalConsistency,
  };
}
