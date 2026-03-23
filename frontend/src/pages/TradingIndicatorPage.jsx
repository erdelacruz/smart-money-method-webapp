// ============================================================
// TradingIndicatorPage.jsx — Educational guide for trading indicators.
//
// Subpages (tabs):
//   - Moving Average (MA)
//   - Darvas Box
//   - RSI
//   - Fibonacci Retracement
// ============================================================

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// SVG visualisations for each indicator
// ---------------------------------------------------------------------------

function MAChart() {
  // Simulated price line + 20-period SMA
  const prices = [52,54,53,56,58,57,60,62,61,63,65,64,67,66,68,70,69,72,74,73,75,77,76,78,80];
  const sma = prices.map((_, i) => {
    if (i < 4) return null;
    const slice = prices.slice(i - 4, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  const W = 400, H = 140;
  const minP = 50, maxP = 82, range = maxP - minP;
  const x = (i) => (i / (prices.length - 1)) * W;
  const y = (v) => H - ((v - minP) / range) * (H - 20) - 4;

  const pricePts = prices.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const smaPts = sma
    .map((v, i) => (v !== null ? `${x(i)},${y(v)}` : null))
    .filter(Boolean)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="maGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#378ADD" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(r => (
        <line key={r} x1="0" y1={H * r} x2={W} y2={H * r}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Area fill */}
      <polygon
        points={`0,${H} ${pricePts} ${W},${H}`}
        fill="url(#maGrad)"
      />
      {/* Price line */}
      <polyline points={pricePts} fill="none" stroke="#378ADD" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* SMA line */}
      <polyline points={smaPts} fill="none" stroke="#EF9F27" strokeWidth="2"
        strokeDasharray="5,3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Legend */}
      <rect x="12" y="8" width="10" height="3" fill="#378ADD" rx="1" />
      <text x="26" y="14" fill="#8A96B0" fontSize="10" fontFamily="DM Sans, sans-serif">Price</text>
      <rect x="72" y="8" width="10" height="3" fill="#EF9F27" rx="1" />
      <text x="86" y="14" fill="#8A96B0" fontSize="10" fontFamily="DM Sans, sans-serif">5-period MA</text>
    </svg>
  );
}

function DarvasChart() {
  const W = 400, H = 160;

  // Candles: [x, open, high, low, close] — normalised to 0-1 range
  const candles = [
    [0.05, 0.35, 0.45, 0.28, 0.42],
    [0.12, 0.42, 0.52, 0.38, 0.50],
    [0.19, 0.50, 0.58, 0.45, 0.55],
    [0.26, 0.55, 0.62, 0.50, 0.60],
    [0.33, 0.60, 0.68, 0.55, 0.65],  // box top formed here
    [0.40, 0.65, 0.67, 0.58, 0.62],
    [0.47, 0.62, 0.67, 0.57, 0.64],
    [0.54, 0.64, 0.67, 0.60, 0.61],  // consolidation inside box
    [0.61, 0.61, 0.65, 0.55, 0.58],
    [0.68, 0.58, 0.62, 0.52, 0.60],
    [0.75, 0.60, 0.75, 0.58, 0.73],  // breakout
    [0.82, 0.73, 0.82, 0.70, 0.80],
    [0.89, 0.80, 0.88, 0.76, 0.85],
  ];

  const toX = (r) => r * W;
  const toY = (r) => H - r * (H - 20) - 8;
  const cW = 14;

  // Box coords
  const boxX1 = toX(0.33), boxX2 = toX(0.68);
  const boxTop = toY(0.68), boxBot = toY(0.52);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(r => (
        <line key={r} x1="0" y1={H * r} x2={W} y2={H * r}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Darvas Box */}
      <rect x={boxX1} y={boxTop} width={boxX2 - boxX1} height={boxBot - boxTop}
        fill="rgba(55,138,221,0.08)" stroke="#378ADD" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={boxX1 + 4} y={boxTop - 4} fill="#378ADD" fontSize="9" fontFamily="DM Sans, sans-serif">Darvas Box</text>
      {/* Breakout arrow */}
      <line x1={toX(0.68)} y1={toY(0.65)} x2={toX(0.75)} y2={toY(0.72)}
        stroke="#00C896" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x={toX(0.75) + 2} y={toY(0.74)} fill="#00C896" fontSize="9" fontFamily="DM Sans, sans-serif">Breakout ↑</text>
      {/* Candles */}
      {candles.map(([rx, o, h, l, c], i) => {
        const cx = toX(rx);
        const isUp = c >= o;
        const col = isUp ? '#00C896' : '#F04E4E';
        return (
          <g key={i}>
            <line x1={cx} y1={toY(h)} x2={cx} y2={toY(l)} stroke={col} strokeWidth="1.5" />
            <rect
              x={cx - cW / 2} y={Math.min(toY(o), toY(c))}
              width={cW} height={Math.max(2, Math.abs(toY(o) - toY(c)))}
              fill={isUp ? col : col} stroke={col} strokeWidth="0.5" rx="1"
            />
          </g>
        );
      })}
    </svg>
  );
}

function RSIChart() {
  const W = 400, H = 120;
  const rsiValues = [45,52,60,68,72,78,80,75,70,65,60,55,48,42,38,35,40,45,50,55,60,58,62,65,70];

  const x = (i) => (i / (rsiValues.length - 1)) * W;
  const y = (v) => H - (v / 100) * (H - 10) - 4;

  const pts = rsiValues.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const obY = y(70), osY = y(30), midY = y(50);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Overbought / oversold zones */}
      <rect x="0" y={obY} width={W} height={y(100) - obY}
        fill="rgba(240,78,78,0.08)" />
      <rect x="0" y={osY} width={W} height={y(0) - osY}
        fill="rgba(0,200,150,0.08)" />
      {/* Zone lines */}
      <line x1="0" y1={obY} x2={W} y2={obY}
        stroke="rgba(240,78,78,0.5)" strokeWidth="1" strokeDasharray="4,3" />
      <line x1="0" y1={midY} x2={W} y2={midY}
        stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1="0" y1={osY} x2={W} y2={osY}
        stroke="rgba(0,200,150,0.5)" strokeWidth="1" strokeDasharray="4,3" />
      {/* Labels */}
      <text x="4" y={obY - 4} fill="#F04E4E" fontSize="9" fontFamily="DM Sans, sans-serif">Overbought (70)</text>
      <text x="4" y={osY + 12} fill="#00C896" fontSize="9" fontFamily="DM Sans, sans-serif">Oversold (30)</text>
      {/* RSI line */}
      <polyline points={pts} fill="none" stroke="#8B5CF6" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Current dot */}
      <circle cx={x(rsiValues.length - 1)} cy={y(rsiValues[rsiValues.length - 1])} r="4"
        fill="#8B5CF6" />
    </svg>
  );
}

function FibChart() {
  const W = 400, H = 160;

  // Price path: swing low → swing high → retracement
  const pts = '0,140 40,120 80,100 120,75 160,50 200,30 240,45 280,60 320,50 360,55 400,52';

  // Fib levels (0 = low price at bottom, 1 = high at top)
  const low = 140, high = 30, priceRange = low - high;
  const fibLevels = [
    { ratio: 0,     label: '0%',    color: '#8A96B0' },
    { ratio: 0.236, label: '23.6%', color: '#EF9F27' },
    { ratio: 0.382, label: '38.2%', color: '#00C896' },
    { ratio: 0.500, label: '50.0%', color: '#378ADD' },
    { ratio: 0.618, label: '61.8%', color: '#F04E4E' },
    { ratio: 1,     label: '100%',  color: '#8A96B0' },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Fib retracement zones */}
      {fibLevels.map(({ ratio, label, color }) => {
        const lineY = high + ratio * priceRange;
        return (
          <g key={label}>
            <line x1="0" y1={lineY} x2={W} y2={lineY}
              stroke={color} strokeWidth="1" strokeDasharray="5,4" opacity="0.7" />
            <text x={W - 4} y={lineY - 3} fill={color} fontSize="9"
              fontFamily="DM Sans, sans-serif" textAnchor="end">{label}</text>
          </g>
        );
      })}
      {/* Fill between 38.2% and 61.8% (golden zone) */}
      <rect x="0" y={high + 0.382 * priceRange} width={W}
        height={(0.618 - 0.382) * priceRange}
        fill="rgba(55,138,221,0.06)" />
      {/* Price line */}
      <polyline points={pts} fill="none" stroke="#378ADD" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Golden zone label */}
      <text x="8" y={high + 0.5 * priceRange + 4} fill="rgba(55,138,221,0.8)"
        fontSize="9" fontFamily="DM Sans, sans-serif">Golden Zone</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tab content definitions
// ---------------------------------------------------------------------------
const TABS = [
  {
    id:    'ma',
    label: 'Moving Average',
    short: 'MA',
    icon:  '📈',
    color: '#378ADD',
    tagline: 'Smooth out price noise and identify trends',
    description: `A Moving Average (MA) calculates the average closing price of a security over a
      specified number of periods. By smoothing out short-term price fluctuations, it helps traders
      identify the underlying trend direction — uptrend, downtrend, or sideways.`,
    types: [
      { name: 'Simple MA (SMA)', desc: 'Equal weight to each period. Clear, easy to interpret, slower to react.' },
      { name: 'Exponential MA (EMA)', desc: 'More weight on recent prices. Reacts faster to new price action.' },
      { name: 'Weighted MA (WMA)', desc: 'Linear weighting — most recent price gets the highest weight.' },
    ],
    signals: [
      { signal: 'Golden Cross', detail: 'Short-period MA crosses above long-period MA → bullish signal.' },
      { signal: 'Death Cross',  detail: 'Short-period MA crosses below long-period MA → bearish signal.' },
      { signal: 'Price vs MA',  detail: 'Price above MA = bullish bias; price below MA = bearish bias.' },
    ],
    params: [
      { param: 'Period', value: '20 (short-term), 50 (medium), 200 (long-term)' },
      { param: 'Source', value: 'Close, Open, High, Low, or HL/2' },
      { param: 'Type',   value: 'SMA, EMA, WMA' },
    ],
    Chart: MAChart,
  },
  {
    id:    'darvas',
    label: 'Darvas Box',
    short: 'Darvas',
    icon:  '📦',
    color: '#EF9F27',
    tagline: 'Identify breakout opportunities from consolidation boxes',
    description: `Developed by Nicolas Darvas in the 1950s, the Darvas Box theory identifies stocks
      that are consolidating in a "box" (range) and flags potential breakout opportunities. A new box
      is drawn when price sets a new high and then pulls back, forming a ceiling and a floor.`,
    types: [
      { name: 'Box Formation',  desc: 'A new high is set; if price does not exceed it for 3 sessions, the top of the box is confirmed.' },
      { name: 'Box Floor',      desc: 'The lowest low during the box formation period sets the support floor.' },
      { name: 'Nested Boxes',   desc: 'Multiple stacked boxes on a chart indicate a strong sustained trend.' },
    ],
    signals: [
      { signal: 'Breakout Buy',     detail: 'Price closes above the box top with increased volume → enter long.' },
      { signal: 'Breakdown Sell',   detail: 'Price closes below the box floor → exit or short.' },
      { signal: 'Stop Loss',        detail: 'Typically placed just below the floor of the current box.' },
    ],
    params: [
      { param: 'Lookback',      value: '3–5 sessions to confirm box top/bottom' },
      { param: 'Volume filter', value: 'Volume should be above average on breakout' },
      { param: 'Timeframe',     value: 'Daily charts are most commonly used' },
    ],
    Chart: DarvasChart,
  },
  {
    id:    'rsi',
    label: 'RSI',
    short: 'RSI',
    icon:  '⚡',
    color: '#8B5CF6',
    tagline: 'Measure momentum and detect overbought / oversold conditions',
    description: `The Relative Strength Index (RSI), developed by J. Welles Wilder, is a momentum
      oscillator that measures the speed and magnitude of recent price changes on a scale of 0–100.
      It identifies when an asset may be overbought (>70) or oversold (<30).`,
    types: [
      { name: 'Standard RSI',  desc: '14-period RSI is the most commonly used setting for daily charts.' },
      { name: 'Short RSI',     desc: '2–7 period RSI is more sensitive; used for short-term swing trading.' },
      { name: 'RSI Divergence', desc: 'Price makes new high/low but RSI does not — signals potential reversal.' },
    ],
    signals: [
      { signal: 'Overbought (>70)', detail: 'Asset may be overvalued; potential pullback or reversal ahead.' },
      { signal: 'Oversold (<30)',   detail: 'Asset may be undervalued; potential bounce or reversal ahead.' },
      { signal: 'Centreline (50)', detail: 'RSI crossing 50 from below is bullish; from above is bearish.' },
    ],
    params: [
      { param: 'Period',           value: '14 (default); 2–7 for short-term, 21+ for long-term' },
      { param: 'Overbought level', value: '70 (conservative) or 80 (aggressive)' },
      { param: 'Oversold level',   value: '30 (conservative) or 20 (aggressive)' },
    ],
    Chart: RSIChart,
  },
  {
    id:    'fib',
    label: 'Fibonacci Retracement',
    short: 'Fibonacci',
    icon:  '🌀',
    color: '#00C896',
    tagline: 'Pinpoint potential support and resistance using natural ratios',
    description: `Fibonacci Retracement uses horizontal lines derived from the Fibonacci sequence
      to indicate potential support and resistance levels where price may pause or reverse. The key
      ratios — 23.6%, 38.2%, 50%, and 61.8% — are drawn between a significant swing high and low.`,
    types: [
      { name: 'Retracement',  desc: 'Levels drawn from swing high to low (or low to high) to find pullback support.' },
      { name: 'Extension',    desc: 'Levels beyond 100% used to project potential take-profit targets.' },
      { name: 'Time Zones',   desc: 'Vertical Fibonacci intervals highlighting potential turning points in time.' },
    ],
    signals: [
      { signal: '61.8% (Golden Ratio)', detail: 'The strongest retracement level; deep pullbacks often reverse here.' },
      { signal: '38.2% – 50%',          detail: '"Golden zone" — common area for pullbacks in a healthy uptrend.' },
      { signal: '23.6%',                detail: 'Shallow retracement level indicating a very strong underlying trend.' },
    ],
    params: [
      { param: 'Key levels',  value: '23.6%, 38.2%, 50%, 61.8%, 78.6%' },
      { param: 'Swing points', value: 'Identify a clear swing high and swing low on any timeframe' },
      { param: 'Confirmation', value: 'Use with candlestick patterns or volume for higher confidence' },
    ],
    Chart: FibChart,
  },
];

// ---------------------------------------------------------------------------
// TradingIndicatorPage
// ---------------------------------------------------------------------------
export default function TradingIndicatorPage() {
  const [activeTab, setActiveTab] = useState('ma');

  const tab = TABS.find(t => t.id === activeTab);

  return (
    <div>
      {/* ── PAGE HERO ─────────────────────────────────────────── */}
      <div className="indicator-hero">
        <div className="indicator-hero-inner">
          <div className="section-eyebrow">Technical Analysis</div>
          <h1 className="indicator-hero-title">Trading Indicators</h1>
          <p className="indicator-hero-sub">
            Learn how professional traders use technical indicators to find entry and exit points on the ASX.
          </p>
        </div>
      </div>

      {/* ── TAB NAV ──────────────────────────────────────────── */}
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

      {/* ── TAB CONTENT ──────────────────────────────────────── */}
      <div className="indicator-content">

        {/* Header */}
        <div className="indicator-header">
          <div className="indicator-header-left">
            <div className="indicator-tag" style={{ background: `${tab.color}22`, color: tab.color }}>
              {tab.icon} {tab.short}
            </div>
            <h2 className="indicator-title">{tab.label}</h2>
            <p className="indicator-tagline">{tab.tagline}</p>
            <p className="indicator-desc">{tab.description}</p>
          </div>

          {/* Chart */}
          <div className="indicator-chart-card">
            <div className="indicator-chart-label">
              <span style={{ color: tab.color }}>■</span>&nbsp;{tab.label} — example chart
            </div>
            <tab.Chart />
          </div>
        </div>

        {/* Three-column info grid */}
        <div className="indicator-info-grid">

          {/* Types */}
          <div className="indicator-info-card">
            <div className="indicator-info-title">Variants &amp; Types</div>
            <div className="indicator-info-list">
              {tab.types.map(({ name, desc }) => (
                <div key={name} className="indicator-info-item">
                  <div className="indicator-info-item-name" style={{ color: tab.color }}>{name}</div>
                  <div className="indicator-info-item-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signals */}
          <div className="indicator-info-card">
            <div className="indicator-info-title">Trading Signals</div>
            <div className="indicator-info-list">
              {tab.signals.map(({ signal, detail }) => (
                <div key={signal} className="indicator-info-item">
                  <div className="indicator-signal-badge" style={{ background: `${tab.color}22`, color: tab.color }}>
                    {signal}
                  </div>
                  <div className="indicator-info-item-desc">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="indicator-info-card">
            <div className="indicator-info-title">Key Parameters</div>
            <div className="indicator-info-list">
              {tab.params.map(({ param, value }) => (
                <div key={param} className="indicator-param-row">
                  <div className="indicator-param-key">{param}</div>
                  <div className="indicator-param-val">{value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
