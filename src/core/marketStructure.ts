import { Candle, MarketBias, MarketStructureState, SwingPoint } from '../types/trading';

/**
 * Detects swing highs and swing lows strictly up to currentIndex
 * A swing at index `i` is only confirmed after `swingLength` candles have fully closed after it.
 * This guarantees ZERO lookahead bias!
 */
export function detectSwingPoints(
  candles: Candle[],
  currentIndex: number,
  swingLength: number = 3
): { swingHighs: SwingPoint[]; swingLows: SwingPoint[] } {
  const swingHighs: SwingPoint[] = [];
  const swingLows: SwingPoint[] = [];

  // A swing at index i can only be confirmed if currentIndex >= i + swingLength
  const maxPossibleIndex = currentIndex - swingLength;

  for (let i = swingLength; i <= maxPossibleIndex; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isSwingHigh = true;
    let isSwingLow = true;

    // Check preceding and succeeding candles within swingLength
    for (let offset = 1; offset <= swingLength; offset++) {
      if (candles[i - offset].high >= currentHigh || candles[i + offset].high > currentHigh) {
        isSwingHigh = false;
      }
      if (candles[i - offset].low <= currentLow || candles[i + offset].low < currentLow) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      const prevHigh = swingHighs[swingHighs.length - 1];
      const classification = prevHigh ? (currentHigh > prevHigh.price ? 'HH' : 'LH') : 'HH';
      swingHighs.push({
        index: i,
        time: candles[i].time,
        price: currentHigh,
        type: 'HIGH',
        broken: false,
        classification,
      });
    }

    if (isSwingLow) {
      const prevLow = swingLows[swingLows.length - 1];
      const classification = prevLow ? (currentLow < prevLow.price ? 'LL' : 'HL') : 'LL';
      swingLows.push({
        index: i,
        time: candles[i].time,
        price: currentLow,
        type: 'LOW',
        broken: false,
        classification,
      });
    }
  }

  // Mark if any confirmed swing point was subsequently broken by any candle up to currentIndex
  for (const sh of swingHighs) {
    for (let j = sh.index + 1; j <= currentIndex; j++) {
      if (candles[j].close > sh.price) {
        sh.broken = true;
        break;
      }
    }
  }

  for (const sl of swingLows) {
    for (let j = sl.index + 1; j <= currentIndex; j++) {
      if (candles[j].close < sl.price) {
        sl.broken = true;
        break;
      }
    }
  }

  return { swingHighs, swingLows };
}

/**
 * Evaluates the full market structure state at currentIndex
 */
export function analyzeMarketStructure(
  candles: Candle[],
  currentIndex: number,
  swingLength: number = 3
): MarketStructureState {
  if (currentIndex < swingLength * 3) {
    return {
      structure: 'NEUTRAL',
      lastSwingHigh: null,
      lastSwingLow: null,
      swingHighs: [],
      swingLows: [],
      bos: false,
      mss: false,
      choch: false,
      trendStrength: 50,
    };
  }

  const { swingHighs, swingLows } = detectSwingPoints(candles, currentIndex, swingLength);

  const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null;
  const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : null;

  let structure: MarketBias = 'NEUTRAL';
  let bos = false;
  let mss = false;
  let choch = false;
  let lastBosTime: number | undefined;
  let lastMssTime: number | undefined;

  const currentCandle = candles[currentIndex];

  // Determine baseline structure from last 2 swings of each
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const sh1 = swingHighs[swingHighs.length - 1];
    const sh0 = swingHighs[swingHighs.length - 2];
    const sl1 = swingLows[swingLows.length - 1];
    const sl0 = swingLows[swingLows.length - 2];

    const higherHighs = sh1.price > sh0.price;
    const higherLows = sl1.price > sl0.price;
    const lowerHighs = sh1.price < sh0.price;
    const lowerLows = sl1.price < sl0.price;

    if (higherHighs && higherLows) {
      structure = 'BULLISH';
    } else if (lowerHighs && lowerLows) {
      structure = 'BEARISH';
    } else {
      structure = 'NEUTRAL';
    }
  }

  // Detect BOS (Break of Structure in continuation direction)
  // Bullish BOS: current candle closes above last swing high in bullish trend
  if (lastSwingHigh && currentCandle.close > lastSwingHigh.price && structure === 'BULLISH') {
    bos = true;
    lastBosTime = currentCandle.time;
  }

  // Bearish BOS: current candle closes below last swing low in bearish trend
  if (lastSwingLow && currentCandle.close < lastSwingLow.price && structure === 'BEARISH') {
    bos = true;
    lastBosTime = currentCandle.time;
  }

  // Detect MSS / CHOCH (Market Structure Shift / Change of Character)
  // Bearish to Bullish shift: market was bearish or neutral, candle closes above the last Lower High
  if (lastSwingHigh && structure !== 'BULLISH' && currentCandle.close > lastSwingHigh.price) {
    mss = true;
    choch = true;
    structure = 'BULLISH';
    lastMssTime = currentCandle.time;
  }

  // Bullish to Bearish shift: market was bullish or neutral, candle closes below the last Higher Low
  if (lastSwingLow && structure !== 'BEARISH' && currentCandle.close < lastSwingLow.price) {
    mss = true;
    choch = true;
    structure = 'BEARISH';
    lastMssTime = currentCandle.time;
  }

  // Trend strength scoring (0-100)
  let trendStrength = 50;
  if (structure === 'BULLISH') {
    trendStrength = 65 + (bos ? 15 : 0) + (mss ? 10 : 0);
  } else if (structure === 'BEARISH') {
    trendStrength = 65 + (bos ? 15 : 0) + (mss ? 10 : 0);
  }

  return {
    structure,
    lastSwingHigh,
    lastSwingLow,
    swingHighs: swingHighs.slice(-10),
    swingLows: swingLows.slice(-10),
    bos,
    mss,
    choch,
    lastBosTime,
    lastMssTime,
    trendStrength: Math.min(100, trendStrength),
  };
}
