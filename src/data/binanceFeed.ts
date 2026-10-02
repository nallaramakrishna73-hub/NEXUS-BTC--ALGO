import { Candle } from '../types/trading';

/**
 * Generates realistic BTCUSDT candlestick dataset with natural price discovery,
 * swings, liquidity sweep wicks, and FVGs for offline or initial loading
 */
export function generateRealisticBTCCandles(count: number = 300, basePrice: number = 84500): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  const fiveMin = 300; // 5 minutes in seconds
  let currentPrice = basePrice;
  let trend = 1;

  for (let i = count; i >= 0; i--) {
    const time = now - i * fiveMin;

    // Shift trend every 40-70 candles
    if (Math.random() < 0.02) {
      trend = trend === 1 ? -1 : 1;
    }

    // Occasional liquidity sweep impulse
    const isSweepImpulse = Math.random() < 0.08;
    const impulseDirection = isSweepImpulse ? (Math.random() < 0.5 ? 1 : -1) : 0;

    const volatility = currentPrice * 0.0035; // 0.35% per 5m
    const change = (Math.random() - 0.48 + trend * 0.05 + impulseDirection * 0.4) * volatility;

    const open = currentPrice;
    const close = Math.round((open + change) * 100) / 100;

    // High and Low with realistic wicks
    const upperWick = Math.random() * volatility * (impulseDirection === 1 ? 1.8 : 0.8);
    const lowerWick = Math.random() * volatility * (impulseDirection === -1 ? 1.8 : 0.8);

    const high = Math.round((Math.max(open, close) + upperWick) * 100) / 100;
    const low = Math.round((Math.min(open, close) - lowerWick) * 100) / 100;

    // Volume with occasional spikes
    const baseVolume = 120 + Math.random() * 80;
    const volumeMultiplier = isSweepImpulse ? 2.5 + Math.random() : 1 + Math.random() * 0.5;
    const volume = Math.round(baseVolume * volumeMultiplier * 10) / 10;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Fetches real historical BTCUSDT candles from Binance Public REST API
 * Gracefully falls back to high-fidelity generator on CORS/network errors without throwing uncaught exceptions
 */
export async function fetchBinanceKlines(
  symbol: string = 'BTCUSDT',
  interval: string = '5m',
  limit: number = 250
): Promise<Candle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { signal: controller.signal }
    ).catch(() => null);
    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      return generateRealisticBTCCandles(limit, 84250);
    }

    const rawData = await response.json().catch(() => null);
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return generateRealisticBTCCandles(limit, 84250);
    }

    const candles: Candle[] = rawData
      .map((item: any[]) => ({
        time: Math.floor(Number(item[0]) / 1000),
        open: parseFloat(item[1]) || 84000,
        high: parseFloat(item[2]) || 84100,
        low: parseFloat(item[3]) || 83900,
        close: parseFloat(item[4]) || 84050,
        volume: parseFloat(item[5]) || 100,
      }))
      .filter((c: Candle) => Number.isFinite(c.time) && Number.isFinite(c.close));

    return candles.length > 20 ? candles : generateRealisticBTCCandles(limit, 84250);
  } catch {
    return generateRealisticBTCCandles(limit, 84250);
  }
}

/**
 * Manages real-time Binance WebSocket or auto-simulated live candle feed
 */
export class RealtimeMarketFeed {
  private symbol: string;
  private interval: string;
  private ws: WebSocket | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private onCandleUpdate: (candle: Candle, isClosed: boolean) => void;
  private isSimulated: boolean = false;
  private lastCandle: Candle | null = null;

  constructor(
    symbol: string = 'BTCUSDT',
    interval: string = '5m',
    onCandleUpdate: (candle: Candle, isClosed: boolean) => void
  ) {
    this.symbol = (symbol || 'BTCUSDT').toLowerCase();
    this.interval = (interval || '5m').toLowerCase();
    this.onCandleUpdate = onCandleUpdate;
  }

  public setInterval(newInterval: string) {
    this.interval = (newInterval || '5m').toLowerCase();
  }

  public setSymbol(newSymbol: string) {
    this.symbol = (newSymbol || 'BTCUSDT').toLowerCase();
  }

  public start(currentLastCandle?: Candle) {
    if (currentLastCandle) {
      this.lastCandle = { ...currentLastCandle };
    }

    try {
      if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
        this.fallbackToSimulation();
        return;
      }

      const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@kline_${this.interval}`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.k) {
            const k = data.k;
            const updatedCandle: Candle = {
              time: Math.floor(Number(k.t) / 1000),
              open: parseFloat(k.o) || 84000,
              high: parseFloat(k.h) || 84100,
              low: parseFloat(k.l) || 83900,
              close: parseFloat(k.c) || 84050,
              volume: parseFloat(k.v) || 100,
            };
            this.lastCandle = updatedCandle;
            this.onCandleUpdate(updatedCandle, Boolean(k.x));
          }
        } catch {}
      };

      socket.onerror = () => {
        this.fallbackToSimulation();
      };

      socket.onclose = () => {
        if (!this.isSimulated) {
          this.fallbackToSimulation();
        }
      };
    } catch {
      this.fallbackToSimulation();
    }
  }

  private fallbackToSimulation() {
    if (this.simulationInterval) return;
    this.isSimulated = true;

    this.simulationInterval = setInterval(() => {
      if (!this.lastCandle) return;

      const delta = (Math.random() - 0.49) * 25;
      const newClose = Math.round((this.lastCandle.close + delta) * 100) / 100;
      const newHigh = Math.max(this.lastCandle.high, newClose);
      const newLow = Math.min(this.lastCandle.low, newClose);
      const newVol = this.lastCandle.volume + Math.round(Math.random() * 2 * 10) / 10;

      // Update current candle
      this.lastCandle = {
        ...this.lastCandle,
        close: newClose,
        high: newHigh,
        low: newLow,
        volume: newVol,
      };

      this.onCandleUpdate(this.lastCandle, false);
    }, 2500);
  }

  public stop() {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}
