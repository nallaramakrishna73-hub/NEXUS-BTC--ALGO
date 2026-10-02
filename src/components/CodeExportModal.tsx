import React, { useState } from 'react';
import { Check, Copy, Download, FileCode, FolderTree, Terminal, X } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<string>('main.py');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fileSnippets: Record<string, string> = {
    'main.py': `"""
NEXUS BTC — Smart Liquidity & Market Structure Trading Algorithm
FastAPI Production Server & Engine Orchestrator
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
from typing import List, Optional

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("NEXUS-BTC")

app = FastAPI(
    title="NEXUS BTC Trading Platform API",
    description="Professional BTCUSDT algorithmic trading, backtesting, and paper trading system.",
    version="1.0.0"
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
        "symbol": "BTCUSDT",
        "primary_timeframe": "5m",
        "htf_timeframe": "15m",
        "mode": "PAPER",
        "live_trading_enabled": False,
        "active_cooldown": False,
        "circuit_breaker_status": "NORMAL"
    }

@app.get("/api/market/btcusdt")
async def get_market_state():
    # Returns latest 5m candle, HTF bias, structure, liquidity pools, active FVGs
    return {
        "symbol": "BTCUSDT",
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
        "risk_percent": 0.005,
        "mode": "PAPER"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
`,
    'test_engine.py': `"""
NEXUS BTC — Unit Tests & Zero-Lookahead Bias Verification
"""

import pytest
import numpy as np

def test_no_lookahead_bias():
    """
    CRITICAL: Validates that future candles never leak into past market structure,
    swings, liquidity pools, or confirmation scoring.
    """
    from nexus_btc.core.market_structure import analyze_market_structure
    from nexus_btc.core.scoring import calculate_signal_score
    
    # Generate 100 historical candles
    base_candles = [{'time': i*300, 'open': 80000+i*10, 'high': 80050+i*10, 'low': 79950+i*10, 'close': 80020+i*10, 'volume': 100} for i in range(100)]
    
    # Evaluate at index 60
    eval_idx = 60
    slice_original = base_candles[:eval_idx+1]
    res_original = analyze_market_structure(slice_original, eval_idx, swing_length=3)
    
    # Mutate future candles (from index 61 onward)
    mutated_candles = list(base_candles)
    for i in range(eval_idx+1, len(mutated_candles)):
        mutated_candles[i] = {'time': i*300, 'open': 190000, 'high': 210000, 'low': 180000, 'close': 200000, 'volume': 99999}
    
    res_mutated = analyze_market_structure(mutated_candles, eval_idx, swing_length=3)
    
    assert res_original['structure'] == res_mutated['structure'], "Future data altered past structure!"
    assert res_original['bos'] == res_mutated['bos'], "Future data altered past BOS status!"
    assert res_original['last_swing_high'] == res_mutated['last_swing_high'], "Future data altered confirmed swing points!"
    print("Zero lookahead bias verified successfully!")

def test_risk_consecutive_loss_breaker():
    from nexus_btc.risk.risk_manager import RiskManager
    rm = RiskManager(initial_balance=10000, max_consecutive_losses=2)
    assert rm.can_take_trade()["allowed"] is True
    rm.record_loss(50)
    assert rm.can_take_trade()["allowed"] is True
    rm.record_loss(50)
    # Circuit breaker triggers on 2nd consecutive loss
    assert rm.can_take_trade()["allowed"] is False
    assert "consecutive" in rm.can_take_trade()["reason"]
`,
    'requirements.txt': `fastapi==0.115.0
uvicorn[standard]==0.31.0
pydantic==2.9.2
sqlalchemy==2.0.35
alembic==1.13.3
psycopg2-binary==2.9.9
redis==5.1.0
websockets==13.1
pandas==2.2.3
numpy==2.1.1
scipy==1.14.1
pytest==8.3.3
pytest-asyncio==0.24.0
python-dotenv==1.0.1
requests==2.32.3
aiohttp==3.10.9
`,
    'docker-compose.yml': `version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://nexus:nexuspassword@postgres:5432/nexus_btc
      - REDIS_URL=redis://redis:6379/0
      - LIVE_TRADING=false
      - RISK_PER_TRADE=0.005
      - MAX_DAILY_LOSS=0.015
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=nexus
      - POSTGRES_PASSWORD=nexuspassword
      - POSTGRES_DB=nexus_btc
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
`,
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileSnippets[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto font-mono text-xs">
      <div className="bg-[#0b101d] border border-[#1e2a42] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0e1628]">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="NEXUS BTC"
              className="w-6 h-6 rounded object-cover border border-cyan-800/80 shadow"
              referrerPolicy="no-referrer"
            />
            <h2 className="font-bold text-white text-sm">NEXUS BTC PYTHON ARCHITECTURE & CODEBASE</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Browser */}
        <div className="flex flex-1 overflow-hidden divide-x divide-slate-800">
          {/* File List */}
          <div className="w-48 bg-[#080d18] p-3 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
              Key Python Artifacts
            </span>
            {Object.keys(fileSnippets).map((filename) => (
              <button
                key={filename}
                onClick={() => setSelectedFile(filename)}
                className={`w-full text-left px-2 py-1.5 rounded transition-colors text-xs flex items-center gap-1.5 ${
                  selectedFile === filename
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>{filename}</span>
              </button>
            ))}

            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300">Run Backend:</div>
              <code className="block p-1 bg-slate-900 rounded text-slate-400">
                uvicorn main:app --reload
              </code>
              <div className="font-semibold text-slate-300 pt-1">Run Tests:</div>
              <code className="block p-1 bg-slate-900 rounded text-slate-400">
                pytest test_engine.py -v
              </code>
            </div>
          </div>

          {/* Code View */}
          <div className="flex-1 bg-[#050811] p-4 flex flex-col justify-between overflow-y-auto">
            <div className="relative">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-cyan-400 font-bold text-xs">{selectedFile}</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="text-slate-300 text-[11px] leading-relaxed overflow-x-auto select-all">
                {fileSnippets[selectedFile]}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-800 bg-[#0e1628] text-[11px] text-slate-400">
          <span>All Python files, SQLAlchemy models, and Pytest suites also written to repository.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
