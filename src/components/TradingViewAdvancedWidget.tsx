import React, { memo, useEffect, useRef } from 'react';

export interface TradingViewAdvancedWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
  containerId?: string;
}

export const TradingViewAdvancedWidget: React.FC<TradingViewAdvancedWidgetProps> = memo(({
  symbol = 'BTCUSDT',
  interval = '5',
  theme = 'dark',
  containerId = 'tradingview_widget_advanced',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize symbol for Binance
  const formattedSymbol = symbol.includes(':') 
    ? symbol 
    : `BINANCE:${symbol.toUpperCase()}`;

  // Map interval format to TradingView format
  // 1m -> 1, 5m -> 5, 15m -> 15, 1h -> 60, 4h -> 240, 1d -> D
  const tvInterval = (() => {
    const clean = interval.toLowerCase().trim();
    if (clean === '1m') return '1';
    if (clean === '3m') return '3';
    if (clean === '5m') return '5';
    if (clean === '15m') return '15';
    if (clean === '30m') return '30';
    if (clean === '1h' || clean === '60m') return '60';
    if (clean === '2h') return '120';
    if (clean === '4h' || clean === '240m') return '240';
    if (clean === '1d' || clean === 'd') return 'D';
    if (clean === '1w' || clean === 'w') return 'W';
    return interval;
  })();

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container__widget';
    widgetWrapper.style.height = '100%';
    widgetWrapper.style.width = '100%';
    containerRef.current.appendChild(widgetWrapper);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: formattedSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_side_toolbar: false, // CRITICAL: Shows all Drawing Tools (Fibonacci, Trendlines, Long/Short Position, Ruler, etc.)
      hide_top_toolbar: false, // CRITICAL: Shows all Timeframes, Indicators, Bar Styles, Compare
      allow_symbol_change: true,
      save_image: true,
      details: true,
      hotlist: false,
      calendar: false,
      show_popup_button: true,
      popup_width: '1200',
      popup_height: '800',
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#090d16',
      gridColor: 'rgba(30, 41, 59, 0.4)',
      studies: [
        'STD;RSI',
        'STD;MACD',
        'STD;Bollinger_Bands',
        'STD;EMA@tv-basicstudies',
        'STD;VWAP@tv-basicstudies'
      ],
      container_id: containerId,
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [formattedSymbol, tvInterval, theme, containerId]);

  return (
    <div className="w-full h-full relative flex flex-col bg-[#090d16] overflow-hidden rounded-lg">
      <div 
        ref={containerRef} 
        className="tradingview-widget-container w-full flex-1 relative min-h-[500px]"
        style={{ height: '100%', width: '100%' }}
      >
        <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
});

TradingViewAdvancedWidget.displayName = 'TradingViewAdvancedWidget';
