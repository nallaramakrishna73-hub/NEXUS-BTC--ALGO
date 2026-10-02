import React, { useState } from 'react';
import { Bell, Check, Copy, Mail, Send, X } from 'lucide-react';
import { TradeSetup } from '../types/trading';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastSignal: TradeSetup | null;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  lastSignal,
}) => {
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [testSent, setTestSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mockSignalText = lastSignal
    ? `🚨 NEXUS BTC SIGNAL 🚨\n\nBTCUSDT 5M\nDirection: ${lastSignal.direction}\nScore: ${lastSignal.score.score}/12\n\nLiquidity Sweep: ${lastSignal.score.liquiditySweep ? 'YES' : 'NO'}\nDisplacement: ${lastSignal.score.displacement ? 'YES' : 'NO'}\nMSS / BOS: ${lastSignal.score.mssBos ? 'YES' : 'NO'}\nFVG: ${lastSignal.score.fvgPresent ? 'YES' : 'NO'}\nFVG Retest: ${lastSignal.score.fvgRetest ? 'YES' : 'NO'}\n\nEntry: $${lastSignal.entryPrice.toFixed(1)}\nStop Loss: $${lastSignal.stopLoss.toFixed(1)}\nTP1: $${lastSignal.tp1.toFixed(1)}\nTP2: $${lastSignal.tp2.toFixed(1)}\nTP3: $${lastSignal.tp3.toFixed(1)}\n\nRisk: 0.5%\nMode: ${lastSignal.mode}`
    : `🚨 NEXUS BTC SIGNAL 🚨\n\nBTCUSDT 5M\nDirection: LONG\nScore: 10/12\n\nLiquidity Sweep: YES\nDisplacement: YES\nMSS: YES\nFVG: YES\nFVG Retest: YES\n\nEntry: $84,500.0\nStop Loss: $84,180.0\nTP1: $84,980.0\nTP2: $85,140.0\nTP3: $85,600.0\n\nRisk: 0.5%\nMode: PAPER`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mockSignalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTest = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto font-mono text-xs">
      <div className="bg-[#0b101c] border border-[#1e2a42] rounded-xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0e1628]">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="NEXUS BTC"
              className="w-6 h-6 rounded object-cover border border-cyan-800 shadow"
              referrerPolicy="no-referrer"
            />
            <h2 className="font-bold text-white text-sm">TELEGRAM & EMAIL ALERT ENGINE</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-300">
          <div className="space-y-2">
            <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">
              Sample Formatted Dispatch Payload:
            </span>
            <div className="relative">
              <pre className="p-3 bg-[#080c16] rounded border border-slate-800 text-[11px] text-cyan-300 whitespace-pre-wrap font-mono select-all">
                {mockSignalText}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Config fields */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-slate-400 block mb-1">Telegram Bot Token & Chat ID:</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Bot Token (e.g. 123456:ABC-DEF)"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  className="px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
                <input
                  type="text"
                  placeholder="Chat ID (e.g. -1001234567)"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Email Recipient:</label>
              <input
                type="email"
                placeholder="trader@fund.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-[#131b2e] border border-slate-700 text-white"
              />
            </div>
          </div>

          {testSent && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-700 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Simulated alert message successfully dispatched to Telegram & Email queues!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0e1628]">
          <span className="text-[10px] text-slate-500">
            Real execution requires valid API webhook environment variables.
          </span>
          <button
            onClick={handleSendTest}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Test Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
