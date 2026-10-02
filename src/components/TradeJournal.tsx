import React from 'react';
import { Clock, History, TrendingDown, TrendingUp } from 'lucide-react';
import { Position } from '../types/trading';

interface TradeJournalProps {
  trades: Position[];
}

export const TradeJournal: React.FC<TradeJournalProps> = ({ trades }) => {
  return (
    <div className="w-full bg-[#0b101c] border border-[#1b263b] rounded-lg p-3.5 shadow-xl font-mono text-xs space-y-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>SESSION TRADE JOURNAL ({trades.length})</span>
        </div>
        <span className="text-[10px] text-slate-500">Live Paper Orders</span>
      </div>

      {trades.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-[11px] border border-dashed border-slate-800 rounded">
          No executed trades in current session. Waiting for setup confirmation (Score &ge; 8/12).
        </div>
      ) : (
        <div className="overflow-x-auto max-h-48 overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800 text-[10px]">
                <th className="pb-1">DIR</th>
                <th className="pb-1">ENTRY</th>
                <th className="pb-1">EXIT</th>
                <th className="pb-1">REASON</th>
                <th className="pb-1 text-right">NET P&L</th>
                <th className="pb-1 text-right">R</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice().reverse().map((t) => {
                const net = t.realizedPnl - t.feesPaid;
                return (
                  <tr key={t.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                    <td className="py-1.5">
                      <span
                        className={`px-1 py-0.5 rounded font-bold text-[9px] ${
                          t.direction === 'LONG'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-1.5 text-slate-300">${t.entryPrice.toFixed(1)}</td>
                    <td className="py-1.5 text-slate-300">
                      {t.exitPrice ? `$${t.exitPrice.toFixed(1)}` : 'Open'}
                    </td>
                    <td className="py-1.5 text-slate-400">
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800">
                        {t.exitReason || 'HOLD'}
                      </span>
                    </td>
                    <td
                      className={`py-1.5 text-right font-bold ${
                        net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {net >= 0 ? '+' : ''}${net.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right text-slate-300">
                      {(t.rMultiple || 0).toFixed(2)}R
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
