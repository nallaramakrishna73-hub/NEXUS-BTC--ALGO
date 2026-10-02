from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.config import settings

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("NEXUS-BTC")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Professional BTCUSDT algorithmic trading, backtesting, and paper trading system.",
    version=settings.VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/system/status")
async def get_system_status():
    return {
        "status": "ONLINE",
        "symbol": settings.SYMBOL,
        "entry_timeframe": settings.ENTRY_TIMEFRAME,
        "htf_timeframe": settings.HTF_TIMEFRAME,
        "mode": "LIVE" if settings.LIVE_TRADING else "PAPER",
        "live_trading_enabled": settings.LIVE_TRADING,
        "circuit_breaker": "NORMAL",
        "min_score": settings.MIN_SIGNAL_SCORE
    }

@app.get("/api/market/btcusdt")
async def get_market_state():
    return {
        "symbol": settings.SYMBOL,
        "htf_bias": "BULLISH",
        "structure": "BULLISH",
        "last_swing_high": 85200.0,
        "last_swing_low": 83950.0,
        "bos": True,
        "mss": False,
        "adx": 26.4,
        "is_ranging": False
    }

@app.get("/api/strategy/signal")
async def get_current_signal():
    return {
        "direction": "LONG",
        "score": 10,
        "max_score": 12,
        "is_tradable": True,
        "liquidity_sweep": True,
        "displacement": True,
        "mss": True,
        "fvg": True,
        "fvg_retest": True,
        "volume_confirmation": True,
        "htf_alignment": True,
        "entry": 84500.0,
        "stop_loss": 84180.0,
        "tp1": 84980.0,
        "tp2": 85140.0,
        "risk_percent": settings.RISK_PER_TRADE,
        "mode": "LIVE" if settings.LIVE_TRADING else "PAPER"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
