// ============================================================
// ScreenerPage.jsx — ASX & Australian ETF Stock Screener
//
// Embeds the TradingView Screener widget filtered to the
// Australian market (ASX stocks + ETFs).
// Widget theme follows the site-wide light/dark setting.
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ScreenerPage() {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: '100%',
      defaultColumn: 'overview',
      defaultScreen: 'most_capitalized',
      market: 'australia',
      showToolbar: true,
      colorTheme: theme === 'light' ? 'light' : 'dark',
      locale: 'en',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [theme]);

  return (
    <div className="screener-page">

      {/* ── PAGE HERO ── */}
      <div className="screener-hero">
        <div className="screener-hero-inner">
          <div className="section-eyebrow">Trading Tools</div>
          <h1 className="screener-title">Screener</h1>
          <p className="screener-sub">
            Screen ASX-listed stocks and Australian ETFs by market cap, price,
            volume, and more — powered by TradingView.
          </p>
        </div>
      </div>

      {/* ── SCREENER BODY ── */}
      <div className="screener-body">
        <div className="tv-widget-wrap">
          <div className="tv-widget-header">
            <div className="tv-widget-title-group">
              <span className="tv-widget-label">🔍 ASX &amp; Australian ETF Screener</span>
              <span className="tv-widget-sub">Powered by TradingView · Australian market only</span>
            </div>
          </div>
          <div ref={containerRef} className="tv-widget-container screener-widget-container" />
        </div>
      </div>

    </div>
  );
}
