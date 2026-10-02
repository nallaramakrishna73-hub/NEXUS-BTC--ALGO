# NEXUS BTC — Smart Liquidity & Market Structure Trading Algorithm

> **"CONFIRMATION OVER PREDICTION."**  
> The algorithm does not attempt to predict every Bitcoin move. Its job is to wait for a strict, quantified sequence of institutional orderflow conditions, calculate mathematical risk, and output either a **VALID SETUP** or **NO TRADE**.

---

## Architecture Overview

```
nexus-btc/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── config.py                # Central strategy & system configuration
│   │   ├── core/                    # Market structure, liquidity sweeps, FVG, displacement, scoring
│   │   ├── strategy/                # Long & Short confluence setup engines
│   │   ├── backtest/                # Event-driven backtester (zero lookahead)
│   │   ├── risk/                    # Dynamic sizing, ATR buffers, loss limits
│   │   ├── database/                # SQLAlchemy models & migrations
│   │   └── notifications/           # Telegram & Email alert engines
│   ├── tests/                       # Pytest test suite with test_no_lookahead_bias()
│   ├── requirements.txt             # Python 3.12+ dependencies
│   └── Dockerfile
├── src/                             # Interactive React + TypeScript terminal dashboard
├── docker-compose.yml               # Backend, PostgreSQL, and Redis stack
└── README.md
```

---

## 10 Core Pillars of the Strategy

1. **Higher-Timeframe Market Bias (15M):** Resampled structure determines institutional direction.
2. **Primary Setup Timeframe (5M):** Signal generation and orderflow confirmation.
3. **Market Structure Shifts (MSS / CHOCH & BOS):** Dynamic swing point confirmation without single-candle assumptions.
4. **Liquidity Sweeps:** Validates genuine sell-side (SSL) or buy-side (BSL) sweeps with rejection wicks ($\ge 35\%$ range) rather than naive wick touches.
5. **Fair Value Gaps (FVG):** Three-candle displacement gaps filtered by ATR threshold ($0.10 \times \text{ATR}$).
6. **Displacement:** Institutional momentum candles where body $\ge 0.8 \times \text{ATR}$ and volume exceeds 20-period SMA.
7. **Range / Chop Protection:** ADX filter ($< 22$) and high-low compression detection disable signals during low-edge sideways regimes.
8. **12-Point Confluence Scoring:** Requires at least $8/12$ points to trigger; otherwise defaults strictly to **NO TRADE**.
9. **Strict Risk Management:** $0.5\%$ risk per trade, max 3 trades/day, circuit breaker on 2 consecutive losses or $-1.5\%$ daily loss.
10. **Zero Lookahead Backtesting:** Event-driven candle-by-candle simulation factoring maker/taker fees and slippage.

---

## Running the Application

### 1. Interactive Terminal (React + TypeScript + Vite)
```bash
# In the project root:
npm install
npm run dev
# The interactive trading terminal opens on http://localhost:3000
```

### 2. Python Backend (FastAPI + SQLAlchemy)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Running with Docker Compose
```bash
docker-compose up --build
```

### 4. Running the Test Suite (Including Data Leakage / Zero Lookahead Test)
```bash
pytest backend/tests/test_no_lookahead.py -v
```

---

## Verification of Safety Protocols
- **Live Trading Disabled By Default:** `LIVE_TRADING=false` is strictly enforced.
- **Circuit Breaker:** Halts trading when daily drawdown reaches $1.5\%$ or $2$ consecutive losses occur.
- **Cooldown:** Automatic 3-candle buffer after trade closure prevents revenge trading.
