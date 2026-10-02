from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "settings"
    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CandleRecord(Base):
    __tablename__ = "candles"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), index=True, nullable=False)
    timeframe = Column(String(10), index=True, nullable=False)
    time = Column(Integer, index=True, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)

class MarketStructureRecord(Base):
    __tablename__ = "market_structure"
    id = Column(Integer, primary_key=True, index=True)
    time = Column(Integer, index=True, nullable=False)
    symbol = Column(String(20), nullable=False)
    structure = Column(String(20), nullable=False) # BULLISH, BEARISH, NEUTRAL
    last_swing_high = Column(Float, nullable=True)
    last_swing_low = Column(Float, nullable=True)
    bos = Column(Boolean, default=False)
    mss = Column(Boolean, default=False)
    choch = Column(Boolean, default=False)

class LiquidityLevelRecord(Base):
    __tablename__ = "liquidity_levels"
    id = Column(String(64), primary_key=True)
    symbol = Column(String(20), nullable=False)
    type = Column(String(20), nullable=False) # BSL, SSL, EQH, EQL
    price = Column(Float, nullable=False)
    time = Column(Integer, nullable=False)
    swept = Column(Boolean, default=False)
    swept_time = Column(Integer, nullable=True)

class FvgZoneRecord(Base):
    __tablename__ = "fvg_zones"
    id = Column(String(64), primary_key=True)
    symbol = Column(String(20), nullable=False)
    type = Column(String(20), nullable=False) # BULLISH, BEARISH
    top = Column(Float, nullable=False)
    bottom = Column(Float, nullable=False)
    time = Column(Integer, nullable=False)
    mitigated = Column(Boolean, default=False)
    retested = Column(Boolean, default=False)

class SignalRecord(Base):
    __tablename__ = "signals"
    id = Column(String(64), primary_key=True)
    time = Column(Integer, index=True, nullable=False)
    symbol = Column(String(20), nullable=False)
    direction = Column(String(10), nullable=False)
    score = Column(Integer, nullable=False)
    max_score = Column(Integer, default=12)
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    tp1 = Column(Float, nullable=False)
    tp2 = Column(Float, nullable=False)
    tp3 = Column(Float, nullable=False)
    is_tradable = Column(Boolean, default=True)
    mode = Column(String(20), default="PAPER")
    meta_json = Column(JSON, nullable=True)

class TradeRecord(Base):
    __tablename__ = "trades"
    id = Column(String(64), primary_key=True)
    symbol = Column(String(20), nullable=False)
    direction = Column(String(10), nullable=False)
    entry_price = Column(Float, nullable=False)
    entry_time = Column(Integer, nullable=False)
    stop_loss = Column(Float, nullable=False)
    size = Column(Float, nullable=False)
    notional = Column(Float, nullable=False)
    status = Column(String(20), default="OPEN") # OPEN, CLOSED
    exit_price = Column(Float, nullable=True)
    exit_time = Column(Integer, nullable=True)
    exit_reason = Column(String(30), nullable=True)
    realized_pnl = Column(Float, default=0.0)
    fees_paid = Column(Float, default=0.0)
    r_multiple = Column(Float, default=0.0)

class OrderRecord(Base):
    __tablename__ = "orders"
    id = Column(String(64), primary_key=True)
    trade_id = Column(String(64), ForeignKey("trades.id"))
    order_type = Column(String(20), nullable=False) # MARKET, LIMIT, STOP_LOSS
    side = Column(String(10), nullable=False) # BUY, SELL
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    status = Column(String(20), default="FILLED")
    created_at = Column(DateTime, default=datetime.utcnow)

class BacktestRecord(Base):
    __tablename__ = "backtests"
    id = Column(String(64), primary_key=True)
    strategy_version = Column(String(50), nullable=False)
    start_time = Column(Integer, nullable=False)
    end_time = Column(Integer, nullable=False)
    total_trades = Column(Integer, nullable=False)
    win_rate = Column(Float, nullable=False)
    profit_factor = Column(Float, nullable=False)
    net_pnl = Column(Float, nullable=False)
    max_drawdown = Column(Float, nullable=False)
    sharpe_ratio = Column(Float, nullable=False)
    config_json = Column(JSON, nullable=False)
    metrics_json = Column(JSON, nullable=False)

class BacktestTradeRecord(Base):
    __tablename__ = "backtest_trades"
    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(String(64), ForeignKey("backtests.id"))
    direction = Column(String(10), nullable=False)
    entry_price = Column(Float, nullable=False)
    entry_time = Column(Integer, nullable=False)
    exit_price = Column(Float, nullable=False)
    exit_time = Column(Integer, nullable=False)
    exit_reason = Column(String(30), nullable=False)
    pnl = Column(Float, nullable=False)
    r_multiple = Column(Float, nullable=False)

class RiskEventRecord(Base):
    __tablename__ = "risk_events"
    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String(50), nullable=False) # CONSECUTIVE_LOSS_HALT, DAILY_LOSS_HALT, COOLDOWN
    description = Column(Text, nullable=False)
    balance_at_trigger = Column(Float, nullable=False)

class AlertRecord(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime, default=datetime.utcnow)
    channel = Column(String(20), nullable=False) # TELEGRAM, EMAIL
    payload = Column(Text, nullable=False)
    status = Column(String(20), default="SENT")

class StrategyParametersRecord(Base):
    __tablename__ = "strategy_parameters"
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), unique=True, nullable=False)
    parameters_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
