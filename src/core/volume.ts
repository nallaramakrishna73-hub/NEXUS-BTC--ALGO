import { Candle } from '../types/trading';

export function getTradingSession(timestampSeconds: number): 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OFF_HOURS' {
  const date = new Date(timestampSeconds * 1000);
  const hour = date.getUTCHours();

  if (hour >= 13 && hour < 21) {
    return 'NEW_YORK';
  } else if (hour >= 8 && hour < 16) {
    return 'LONDON';
  } else if (hour >= 0 && hour < 8) {
    return 'ASIA';
  }
  return 'OFF_HOURS';
}

/**
 * Checks if current volume shows strong institutional activity
 */
export function analyzeVolume(
  candles: Candle[],
  currentIndex: number,
  lookback: number = 20
): { isVolumeConfirmed: boolean; rvol: number; avgVolume: number } {
  if (currentIndex < lookback) {
    return { isVolumeConfirmed: true, rvol: 1, avgVolume: 0 };
  }

  const currentVolume = candles[currentIndex].volume;
  let sum = 0;
  for (let i = currentIndex - lookback; i < currentIndex; i++) {
    sum += candles[i].volume;
  }
  const avgVolume = sum / lookback;
  const rvol = avgVolume > 0 ? currentVolume / avgVolume : 1;

  // Relative volume >= 1.10 indicates volume confirmation
  return {
    isVolumeConfirmed: rvol >= 1.10,
    rvol,
    avgVolume,
  };
}
