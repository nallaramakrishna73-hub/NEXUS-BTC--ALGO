import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS BTC Trading System"
    VERSION: str = "1.0.0"
    SYMBOL: str = "BTCUSDT"
    
    HTF_TIMEFRAME: str = "15m"
    ENTRY_TIMEFRAME: str = "5m"
    REFINEMENT_TIMEFRAME: str = "1m"
    
    SWING_LENGTH: int = 3
    MIN_SIGNAL_SCORE: int = 8
    FVG_ATR_THRESHOLD: float = 0.10
    DISPLACEMENT_ATR_MULTIPLIER: float = 0.80
    SL_ATR_BUFFER: float = 0.15
    
    TP1_R_MULTIPLIER: float = 1.5
    TP2_R_MULTIPLIER: float = 2.0
    
    RISK_PER_TRADE: float = 0.005 # 0.5%
    MAX_DAILY_LOSS: float = 0.015 # 1.5%
    MAX_TRADES_PER_DAY: int = 3
    MAX_CONSECUTIVE_LOSSES: int = 2
    COOLDOWN_CANDLES: int = 3
    
    ENABLE_RANGE_FILTER: bool = True
    ADX_THRESHOLD: float = 22.0
    
    # SAFETY: Must be false by default
    LIVE_TRADING: bool = False
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://nexus:nexuspassword@localhost:5432/nexus_btc")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    
    class Config:
        env_file = ".env"

settings = Settings()
