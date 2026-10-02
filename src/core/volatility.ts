import { Candle } from '../types/trading';

/**
 * Calculates True Range for a candle given previous close
 */
export function calculateTrueRange(current: Candle, prevClose: number): number {
  const highLow = current.high - current.low;
  const highClose = Math.abs(current.high - prevClose);
  const lowClose = Math.abs(current.low - prevClose);
  return Math.max(highLow, highClose, lowClose);
}

/**
 * Calculates ATR series for candles up to current index (strictly no future data)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atrValues: number[] = new Array(candles.length).fill(0);
  if (candles.length < 2) return atrValues;

  const trValues: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    trValues.push(calculateTrueRange(candles[i], candles[i - 1].close));
  }

  // Initial SMA
  if (candles.length >= period) {
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trValues[i];
    }
    atrValues[period - 1] = sum / period;

    // Wilder's Smoothing
    for (let i = period; i < candles.length; i++) {
      atrValues[i] = (atrValues[i - 1] * (period - 1) + trValues[i]) / period;
    }
  }

  return atrValues;
}

/**
 * Calculates ADX (Average Directional Index) for trend strength & ranging detection
 */
export function calculateADX(candles: Candle[], period: number = 14): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const len = candles.length;
  const adx = new Array(len).fill(0);
  const plusDI = new Array(len).fill(0);
  const minusDI = new Array(len).fill(0);

  if (len < period * 2) {
    return { adx, plusDI, minusDI };
  }

  const tr: number[] = [candles[0].high - candles[0].low];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < len; i++) {
    tr.push(calculateTrueRange(candles[i], candles[i - 1].close));

    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  // Wilder's smooth initial sum
  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let i = 0; i < period; i++) {
    trSmooth += tr[i];
    plusDMSmooth += plusDM[i];
    minusDMSmooth += minusDM[i];
  }

  const dxList: { index: number; dx: number }[] = [];

  for (let i = period; i < len; i++) {
    trSmooth = trSmooth - trSmooth / period + tr[i];
    plusDMSmooth = plusDMSmooth - plusDMSmooth / period + plusDM[i];
    minusDMSmooth = minusDMSmooth - minusDMSmooth / period + minusDM[i];

    const pDI = trSmooth > 0 ? (plusDMSmooth / trSmooth) * 100 : 0;
    const mDI = trSmooth > 0 ? (minusDMSmooth / trSmooth) * 100 : 0;
    plusDI[i] = pDI;
    minusDI[i] = mDI;

    const diDiff = Math.abs(pDI - mDI);
    const diSum = pDI + mDI;
    const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
    dxList.push({ index: i, dx });
  }

  if (dxList.length >= period) {
    let dxSum = 0;
    for (let i = 0; i < period; i++) {
      dxSum += dxList[i].dx;
    }
    let prevADX = dxSum / period;
    adx[dxList[period - 1].index] = prevADX;

    for (let i = period; i < dxList.length; i++) {
      prevADX = (prevADX * (period - 1) + dxList[i].dx) / period;
      adx[dxList[i].index] = prevADX;
    }
  }

  return { adx, plusDI, minusDI };
}

/**
 * Checks if the market is currently in a sideways/ranging condition
 */
export function isMarketRanging(
  candles: Candle[],
  currentIndex: number,
  adxValues: number[],
  adxThreshold: number = 22
): { isRanging: boolean; reason?: string; adx: number } {
  if (currentIndex < 20) {
    return { isRanging: false, adx: 25 };
  }

  const currentADX = adxValues[currentIndex] || 0;

  // Check 1: ADX below threshold
  if (currentADX > 0 && currentADX < adxThreshold) {
    return {
      isRanging: true,
      reason: `Low directional momentum (ADX ${currentADX.toFixed(1)} < ${adxThreshold})`,
      adx: currentADX,
    };
  }

  // Check 2: High/Low compression over past 15 candles
  const windowSlice = candles.slice(Math.max(0, currentIndex - 15), currentIndex + 1);
  const highest = Math.max(...windowSlice.map((c) => c.high));
  const lowest = Math.min(...windowSlice.map((c) => c.low));
  const priceRangePercent = ((highest - lowest) / lowest) * 100;

  if (priceRangePercent < 0.35) {
    return {
      isRanging: true,
      reason: `Tight price compression (${priceRangePercent.toFixed(2)}% range over 15 candles)`,
      adx: currentADX,
    };
  }

  return { isRanging: false, adx: currentADX };
}
