// ============================================================
// ChartsPage.jsx — Charting & Screener tools (tabbed)
//
// Tabs:
//   - Price Chart  — TradingView Advanced Chart (live symbol search)
//   - Screener     — TradingView Screener (Australian market)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'chart',    label: 'Price Chart', icon: '📈', color: '#378ADD' },
  { id: 'screener', label: 'Screener',    icon: '🔍', color: '#22c55e' },
];

// SMA periods bundled under a single toggle
const SMA_STUDIES = [
  { tvId: 'MASimple@tv-basicstudies', tvInputs: { length: 20  }, dot: '#F0A500' },
  { tvId: 'MASimple@tv-basicstudies', tvInputs: { length: 50  }, dot: '#5B9CF6' },
  { tvId: 'MASimple@tv-basicstudies', tvInputs: { length: 100 }, dot: '#A855F7' },
];

// Sub-chart indicators
const CHART_INDICATORS = [
  { key: 'rsi',  label: 'RSI',  group: 'Sub-Charts', dot: '#00C896', tvId: 'RSI@tv-basicstudies'  },
  { key: 'macd', label: 'MACD', group: 'Sub-Charts', dot: '#5B9CF6', tvId: 'MACD@tv-basicstudies' },
];


// ---------------------------------------------------------------------------
// Price Chart tab — TradingView Advanced Chart (native data) + custom indicator toolbar
// ---------------------------------------------------------------------------
function PriceChartTab() {
  const containerRef = useRef(null);
  const suggestRef   = useRef(null);
  const debounceRef  = useRef(null);
  const { theme }    = useTheme();

  const [inputVal,    setInputVal]    = useState('BHP');
  const [symbol,      setSymbol]      = useState('ASX:BHP');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [enabled,     setEnabled]     = useState({
    sma: false, rsi: false, macd: false,
  });

  const toggle = key => setEnabled(prev => ({ ...prev, [key]: !prev[key] }));

  // Symbol autocomplete
  useEffect(() => {
    const q = inputVal.trim();
    if (q.length < 1) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/asx/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggest(true);
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [inputVal]);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (!suggestRef.current?.contains(e.target)) setShowSuggest(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const applySymbol = (val = inputVal) => {
    const v = val.trim().toUpperCase();
    if (/^[A-Z]{2,10}$/.test(v)) { setSymbol(`ASX:${v}`); setInputVal(v); }
    else setInputVal(symbol.replace('ASX:', ''));
    setShowSuggest(false); setSuggestions([]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') applySymbol();
    if (e.key === 'Escape') setShowSuggest(false);
  };

  // Build studies array from enabled toggles — always use object format with color overrides
  const buildStudies = () => {
    const studies = [];
    if (enabled.sma) {
      SMA_STUDIES.forEach(s => studies.push({ id: s.tvId, inputs: s.tvInputs, overrides: { 'Plot.color': s.dot, 'Plot.linewidth': 2 } }));
    }
    CHART_INDICATORS.filter(i => enabled[i.key]).forEach(i => {
      studies.push({ id: i.tvId, ...(i.tvInputs ? { inputs: i.tvInputs } : {}), overrides: { 'Plot.color': i.dot, 'Plot.linewidth': 2 } });
    });
    return studies;
  };

  // Rebuild TradingView widget on symbol, theme, or indicator change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width  = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type  = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Australia/Sydney',
      theme: theme === 'light' ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      save_image: true,
      hide_side_toolbar: false,
      calendar: false,
      isTransparent: false,
      backgroundColor: theme === 'light' ? 'rgba(255,255,255,1)' : 'rgba(11,18,25,1)',
      support_host: 'https://www.tradingview.com',
      studies: buildStudies(),
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [theme, symbol, enabled]); // eslint-disable-line

  return (
    <div className="charts-tab-body">
      <div className="tv-widget-wrap">

        {/* ── Header ── */}
        <div className="tv-widget-header">
          <div ref={suggestRef} style={{ position: 'relative' }}>
            <div className="chart-symbol-search">
              <span className="chart-symbol-prefix">ASX:</span>
              <input
                className="chart-symbol-input"
                value={inputVal}
                onChange={e => { setInputVal(e.target.value.toUpperCase()); setShowSuggest(true); }}
                onFocus={() => suggestions.length && setShowSuggest(true)}
                onKeyDown={handleKey}
                placeholder="e.g. BHP"
                maxLength={10}
                spellCheck={false}
                autoComplete="off"
              />
              <button className="chart-symbol-btn" onClick={() => applySymbol()}>Search</button>
              <button className="chart-symbol-btn chart-symbol-btn--clear" onClick={() => { setInputVal(''); setSuggestions([]); setShowSuggest(false); }}>Clear</button>
            </div>
            {showSuggest && suggestions.length > 0 && (
              <ul className="chart-suggest-list">
                {suggestions.map(s => (
                  <li key={s.ticker} className="chart-suggest-item"
                    onMouseDown={e => { e.preventDefault(); applySymbol(s.ticker); }}>
                    <span className="chart-suggest-code">{s.ticker}</span>
                    <span className="chart-suggest-name">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="tv-widget-title-group">
            <span className="tv-widget-label">📈 Live Price Chart</span>
            <span className="tv-widget-sub">Powered by TradingView · ASX Australia market</span>
          </div>
        </div>

        {/* ── Indicator toolbar ── */}
        <div className="tg-toolbar charts-ind-toolbar">

          {/* SMA */}
          <div className="tg-toolbar-group">
            <button className={`tg-ind-btn${enabled.sma ? ' active' : ''}`}
              style={enabled.sma ? { borderColor: '#5B9CF6', color: '#5B9CF6' } : {}}
              onClick={() => toggle('sma')}>
              <span className="tg-ind-dot" style={{ background: '#5B9CF6' }} />Simple Moving Average (SMA)
            </button>
          </div>

          {/* Sub-Charts */}
          <div className="tg-toolbar-group">
            {[
              { key: 'rsi',  label: 'RSI',  dot: '#00C896' },
              { key: 'macd', label: 'MACD', dot: '#5B9CF6' },
            ].map(({ key, label, dot }) => (
              <button key={key} className={`tg-ind-btn${enabled[key] ? ' active' : ''}`}
                style={enabled[key] ? { borderColor: dot, color: dot } : {}} onClick={() => toggle(key)}>
                <span className="tg-ind-dot" style={{ background: dot }} />{label}
              </button>
            ))}
          </div>

        </div>

        <div ref={containerRef} className="tradingview-widget-container charts-tv-container" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screener tab — TradingView Screener (Australian market)
// ---------------------------------------------------------------------------
function ScreenerTab({ isVisible }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const initialised = useRef(false); // true after first successful init
  const lastTheme   = useRef(theme);

  const initWidget = () => {
    const container = containerRef.current;
    if (!container) return;
    // Guard: don't init while hidden — offsetWidth/Height would be 0
    if (container.offsetWidth === 0) return;

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width:  container.offsetWidth,
      height: container.offsetHeight || 700,
      autosize: true,
      defaultColumn: 'overview',
      defaultScreen: 'most_capitalized',
      market: 'australia',
      exchange: 'ASX',
      country: 'AU',
      showToolbar: true,
      colorTheme: theme === 'light' ? 'light' : 'dark',
      isTransparent: false,
      locale: 'en',
    });
    container.appendChild(script);
    initialised.current = true;
    lastTheme.current   = theme;
  };

  // Initialise once the widget becomes visible for the first time
  useEffect(() => {
    if (!isVisible) return;
    if (initialised.current && lastTheme.current === theme) return; // already up-to-date

    const timer = setTimeout(initWidget, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, theme]);

  // Re-init on window resize (only when already visible)
  useEffect(() => {
    if (!isVisible) return;
    const onResize = () => {
      initialised.current = false; // force re-measure
      setTimeout(initWidget, 120);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <div className="charts-tab-body">
      <div className="tv-widget-wrap">
        <div className="tv-widget-header">
          <div className="tv-widget-title-group" style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span className="tv-widget-label">🔍 ASX &amp; Australian ETF Screener</span>
            <span className="tv-widget-sub">Powered by TradingView · Australian market only</span>
          </div>
        </div>
        <div ref={containerRef} className="tv-widget-container charts-tv-container" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ChartsPage({ isVisible = true }) {
  const [activeTab, setActiveTab] = useState('chart');

  return (
    <div className="charts-page">

      {/* ── PAGE HERO ── */}
      <div className="charts-hero page-hero">
        <div className="charts-hero-inner">
          <div className="section-eyebrow">Chart &amp; Screener</div>
          <h1 className="charts-hero-title">Chart &amp; Screener</h1>
          <p className="charts-hero-sub">
            Live price charts and stock screener for ASX-listed shares and Australian ETFs,
            powered by TradingView.
          </p>
        </div>
      </div>

      {/* ── TAB NAV + CONTENT (solid background section) ── */}
      <div className="charts-body">
        <div className="indicator-tabs-wrap">
          <div className="indicator-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`indicator-tab${activeTab === t.id ? ' active' : ''}`}
                style={activeTab === t.id ? { '--tab-color': t.color } : {}}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="indicator-tab-icon">{t.icon}</span>
                <span className="indicator-tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Both tabs always mounted — CSS hides inactive tab to preserve widget state */}
        <div className="charts-content">
          <div style={{ display: activeTab === 'chart'    ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <PriceChartTab />
          </div>
          <div style={{ display: activeTab === 'screener' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <ScreenerTab isVisible={isVisible && activeTab === 'screener'} />
          </div>
        </div>
      </div>

    </div>
  );
}
