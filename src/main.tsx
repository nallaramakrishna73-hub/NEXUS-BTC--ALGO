import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global uncaught handlers to prevent unhandled rejection crashes from WebSocket/fetch/ResizeObserver
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('ResizeObserver') ||
      event.message?.includes('Script error') ||
      !event.message
    ) {
      event.preventDefault();
      return;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Recovered from component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-200 flex flex-col items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full bg-[#0b101c] border border-cyan-800 rounded-xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center mx-auto text-cyan-400 font-bold text-xl">
              ⚡
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              NEXUS BTC TERMINAL RECOVERY
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The algorithmic engine encountered a state interruption and safely contained execution to protect risk constraints.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950 transition-all cursor-pointer"
            >
              Restart Terminal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
