// ============================================================
// ASXPriceChartPage.jsx — Live ASX Price Chart
//
// Embeds a TradingView Advanced Chart for any ASX-listed stock
// or ETF. Users can search by ticker code (e.g. BHP, CBA, VAS).
// Chart theme follows the site-wide light/dark setting.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ASXPriceChartPage() {
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const [inputVal, setInputVal] = useState('BHP');
  const [symbol, setSymbol] = useState('ASX:BHP');
  const [error, setError] = useState('');

  const handleInput = e => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setInputVal(val);
    setError('');
  };

  const applySymbol = () => {
    const ticker = inputVal.trim().toUpperCase();
    if (!ticker) { setError('Please enter a stock code.'); return; }
    if (!/^[A-Z0-9]{1,6}$/.test(ticker)) { setError('Enter a valid ASX ticker (1–6 letters/numbers).'); return; }
    setError('');
    setSymbol(`ASX:${ticker}`);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Australia/Sydney',
      theme: theme === 'light' ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [theme, symbol]);

  return (
    <div className="asx-chart-page">

      {/* ── PAGE HERO ── */}
      <div className="asx-chart-hero">
        <div className="asx-chart-hero-inner">
          <div className="section-eyebrow">Trading Tools</div>
          <h1 className="asx-chart-title">Price Chart</h1>
          <p className="asx-chart-sub">
            Search any ASX-listed stock or ETF to view a live interactive price chart
            powered by TradingView.
          </p>
        </div>
      </div>

      {/* ── CHART BODY ── */}
      <div className="asx-chart-body">

        {/* Search bar */}
        <div className="asx-chart-search-wrap">
          <div className="asx-chart-search-row">
            <span className="asx-chart-search-label">Enter ASX ticker</span>
            <div className="tv-symbol-input-wrap">
              <div className="tv-symbol-input-row">
                <span className="tv-symbol-prefix">ASX:</span>
                <input
                  className={`tv-symbol-input tv-symbol-input--lg${error ? ' tv-symbol-input--error' : ''}`}
                  value={inputVal}
                  onChange={handleInput}
                  onKeyDown={e => e.key === 'Enter' && applySymbol()}
                  placeholder="BHP, CBA, VAS…"
                  maxLength={6}
                  spellCheck={false}
                  autoFocus
                />
              </div>
              {error && <span className="tv-symbol-error">{error}</span>}
            </div>
            <button className="tv-symbol-btn tv-symbol-btn--lg" onClick={applySymbol}>
              Load Chart
            </button>
          </div>
          <p className="asx-chart-hint">
            Type a ticker code and press <kbd>Enter</kbd> or click <strong>Load Chart</strong>.
            Examples: <code>BHP</code>, <code>CBA</code>, <code>VAS</code>, <code>NDQ</code>, <code>A200</code>
          </p>
        </div>

        {/* TradingView chart */}
        <div className="tv-widget-wrap">
          <div className="tv-widget-header">
            <div className="tv-widget-title-group">
              <span className="tv-widget-label">📈 {symbol}</span>
              <span className="tv-widget-sub">Powered by TradingView · Live ASX data</span>
            </div>
          </div>
          <div ref={containerRef} className="tv-widget-container tv-widget-container--full" />
        </div>

      </div>
    </div>
  );
}
