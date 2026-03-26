// ============================================================
// DCACalculatorPage.jsx — Dollar Cost Averaging Calculator
//
// Uses real ASX historical price data via the backend proxy:
//   GET /api/asx/search?q=<code>       — autocomplete ticker search
//   GET /api/asx/prices?ticker=X&from=YYYY-MM&to=YYYY-MM — price history
//
// Inputs:  ASX code (searchable), start/end month-year,
//          initial investment, monthly contribution, annual increase %
// Outputs: Portfolio value chart, summary cards, monthly breakdown table
// ============================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// ── Helpers ───────────────────────────────────────────────────
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MIN_YEAR   = 2006;
const MAX_YEAR   = new Date().getFullYear();
const fmt  = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(1)}K` : `$${fmt(n)}`;

// ── DCA computation ───────────────────────────────────────────
// prices: [ { year, month, close } ]
function computeDCA(prices, initialInv, monthlyInv, annualIncrease) {
  if (!prices.length) return [];
  let dcaShares = 0, dcaInvested = 0;
  return prices.map((p, i) => {
    const yr     = Math.floor(i / 12);
    const contrib = monthlyInv * Math.pow(1 + annualIncrease / 100, yr);
    if (i === 0 && initialInv > 0) {
      dcaShares   += initialInv / p.close;
      dcaInvested += initialInv;
    }
    dcaShares   += contrib / p.close;
    dcaInvested += contrib;
    return {
      year: p.year, month: p.month, price: p.close,
      dcaShares, dcaInvested,
      dcaValue: dcaShares * p.close,
    };
  });
}

// ── Month-Year Picker ─────────────────────────────────────────
function MonthYearPicker({ year, month, onChange }) {
  const [open,     setOpen]     = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keep viewYear in sync when prop changes externally (e.g. presets)
  useEffect(() => setViewYear(year), [year]);

  const select = (m) => { onChange(viewYear, m); setOpen(false); };

  return (
    <div ref={ref} className="dca-mypicker-wrap">
      <button className="dca-mypicker-btn" onClick={() => setOpen(v => !v)}>
        <span>{MONTHS[month - 1]} {year}</span>
        <span className="dca-mypicker-arrow">▾</span>
      </button>
      {open && (
        <div className="dca-mypicker-dropdown">
          <div className="dca-mypicker-nav">
            <button onClick={() => setViewYear(y => Math.max(MIN_YEAR, y - 1))}>‹</button>
            <span>{viewYear}</span>
            <button onClick={() => setViewYear(y => Math.min(MAX_YEAR, y + 1))}>›</button>
          </div>
          <div className="dca-mypicker-months">
            {MONTHS.map((name, i) => (
              <button
                key={name}
                className={`dca-mypicker-month${year === viewYear && month === i + 1 ? ' selected' : ''}`}
                onClick={() => select(i + 1)}
              >{name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ticker Search Input ────────────────────────────────────────
function TickerSearch({ value, onChange }) {
  const [query,       setQuery]       = useState(value ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q) => {
    if (!q || q.length < 1) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/asx/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => {
        setSuggestions(d.results || []);
        setOpen(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInput = (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const select = (ticker) => {
    setQuery(ticker);
    setOpen(false);
    setSuggestions([]);
    onChange(ticker);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="dca-input dca-ticker-input"
        value={query}
        maxLength={6}
        placeholder="e.g. BHP"
        onChange={handleInput}
        onKeyDown={e => { if (e.key === 'Enter') { setOpen(false); onChange(query); } }}
        onBlur={() => { if (query && query !== value) onChange(query); }}
        autoComplete="off"
      />
      {loading && <div className="dca-search-loading">Searching…</div>}
      {open && suggestions.length > 0 && (
        <div className="dca-suggestions">
          {suggestions.map(s => (
            <button key={s.ticker} className="dca-suggestion-item" onClick={() => select(s.ticker)}>
              <span className="dca-sug-ticker">{s.ticker}</span>
              <span className="dca-sug-name">{s.name}</span>
              <span className="dca-sug-type">{s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SVG Line Chart ────────────────────────────────────────────
function DCAChart({ data }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  if (!data.length) return null;

  const PAD = { top: 20, right: 20, bottom: 40, left: 68 };
  const W = 800, H = 300;
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top  - PAD.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.dcaValue, d.dcaInvested))) * 1.05;
  const range  = maxVal || 1;

  const xOf = (i) => PAD.left + (i / (data.length - 1)) * CW;
  const yOf = (v) => PAD.top  + CH - (v / range) * CH;

  const linePts  = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d[key])}`).join(' ');
  const areaPath = (key) =>
    `${linePts(key)} L${xOf(data.length - 1)},${PAD.top + CH} L${xOf(0)},${PAD.top + CH} Z`;

  const yTicks  = Array.from({ length: 5 }, (_, i) => (maxVal * i) / 4);
  const xLabels = data.reduce((acc, d, i) => {
    if (d.month === 1 || i === 0) acc.push({ i, label: String(d.year) });
    return acc;
  }, []);

  const handleMouseMove = useCallback((e) => {
    const svg  = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (W / rect.width) - PAD.left;
    const idx  = Math.round((mx / CW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover(idx);
  }, [data.length, CW]);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="dcaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#D4A017" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#D4A017" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#378ADD" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#378ADD" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yOf(v)} x2={W - PAD.right} y2={yOf(v)}
              stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            <text x={PAD.left - 8} y={yOf(v) + 4} textAnchor="end"
              fill="#8A96B0" fontSize="10" fontFamily="DM Mono, monospace">
              {fmtK(v)}
            </text>
          </g>
        ))}

        {xLabels.map(({ i, label }) => (
          <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle"
            fill="#8A96B0" fontSize="10" fontFamily="DM Sans, sans-serif">
            {label}
          </text>
        ))}

        <path d={areaPath('dcaInvested')} fill="url(#invGrad)" />
        <path d={areaPath('dcaValue')}    fill="url(#dcaGrad)" />
        <path d={linePts('dcaInvested')}  fill="none" stroke="#378ADD" strokeWidth="1.5" strokeDasharray="4,3" />
        <path d={linePts('dcaValue')}     fill="none" stroke="#D4A017" strokeWidth="2" />

        {hover !== null && (
          <>
            <line x1={xOf(hover)} y1={PAD.top} x2={xOf(hover)} y2={PAD.top + CH}
              stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={xOf(hover)} cy={yOf(data[hover].dcaValue)}    r="4" fill="#D4A017" />
            <circle cx={xOf(hover)} cy={yOf(data[hover].dcaInvested)} r="4" fill="#378ADD" />
          </>
        )}
      </svg>

      {hover !== null && (() => {
        const d = data[hover];
        return (
          <div className="dca-tooltip">
            <div className="dca-tooltip-date">{MONTHS[d.month - 1]} {d.year}</div>
            <div className="dca-tooltip-row"><span className="dca-tt-dot" style={{background:'#D4A017'}} />Portfolio Value <strong>${fmt(d.dcaValue)}</strong></div>
            <div className="dca-tooltip-row"><span className="dca-tt-dot" style={{background:'#378ADD'}} />Invested <strong>${fmt(d.dcaInvested)}</strong></div>
            <div className="dca-tooltip-row"><span className="dca-tt-dot" style={{background:'transparent'}} />Share Price <strong>${fmt(d.price)}</strong></div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function DCACalculatorPage() {
  const [ticker,         setTicker]         = useState('NDQ');
  const [startYear,      setStartYear]      = useState(2020);
  const [startMonth,     setStartMonth]     = useState(1);
  const [endYear,        setEndYear]        = useState(2025);
  const [endMonth,       setEndMonth]       = useState(12);
  const [initialInv,     setInitialInv]     = useState('1000');
  const [monthlyInv,     setMonthlyInv]     = useState('200');
  const [annualIncrease, setAnnualIncrease] = useState('0');
  const [showTable,      setShowTable]      = useState(true);

  // Price fetch state
  const [prices,  setPrices]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Fetch prices from the backend whenever ticker / date range changes
  useEffect(() => {
    if (!ticker) return;
    const from = `${startYear}-${String(startMonth).padStart(2, '0')}`;
    const to   = `${endYear}-${String(endMonth).padStart(2, '0')}`;

    let cancelled = false;
    setLoading(true);
    setError('');
    setPrices([]);
    fetch(`/api/asx/prices?ticker=${encodeURIComponent(ticker)}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setPrices(d.prices || []);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e.message || 'Failed to load price data.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticker, startYear, startMonth, endYear, endMonth]);

  const data = useMemo(() =>
    computeDCA(
      prices,
      parseFloat(initialInv)     || 0,
      parseFloat(monthlyInv)     || 0,
      parseFloat(annualIncrease) || 0,
    ),
    [prices, initialInv, monthlyInv, annualIncrease]
  );

  const last        = data[data.length - 1];
  const dcaReturn   = last ? ((last.dcaValue - last.dcaInvested) / last.dcaInvested) * 100 : 0;
  const totalGain   = last ? last.dcaValue - last.dcaInvested : 0;
  const numMonths   = data.length;
  const sharesOwned = last ? last.dcaShares : 0;

  const applyPreset = (sy, sm, ey, em) => {
    setStartYear(sy); setStartMonth(sm); setEndYear(ey); setEndMonth(em);
  };

  return (
    <div className="dca-page">
      <div className="dca-header page-hero">
        <div className="section-eyebrow">Share & ETF Investing</div>
        <h1 className="dca-title">Dollar Cost Averaging Calculator</h1>
        <p className="dca-subtitle">
          See how regular investing into any ASX stock and ETFs would have grown using real historical prices.
          Enter your parameters and explore the power of consistent contributions over time.
        </p>
      </div>

      <div className="dca-body">
        {/* ── INPUTS ── */}
        <div className="dca-inputs">
          <div className="dca-inputs-title">Parameters</div>

          <div className="dca-field">
            <label className="dca-label">Code</label>
            <TickerSearch value={ticker} onChange={setTicker} />
            <div className="dca-field-hint">Type to search ASX-listed stocks or ETFs</div>
          </div>

          <div className="dca-field">
            <label className="dca-label">Initial Investment</label>
            <div className="dca-input-row">
              <span className="dca-prefix">$</span>
              <input className="dca-input" type="number" min="0" value={initialInv}
                onChange={e => setInitialInv(e.target.value)} placeholder="1000" />
            </div>
          </div>

          <div className="dca-field">
            <label className="dca-label">Monthly Contribution</label>
            <div className="dca-input-row">
              <span className="dca-prefix">$</span>
              <input className="dca-input" type="number" min="0" value={monthlyInv}
                onChange={e => setMonthlyInv(e.target.value)} placeholder="200" />
              <span className="dca-suffix">/ mo</span>
            </div>
          </div>

          <div className="dca-field">
            <label className="dca-label">Annual Contribution Increase</label>
            <div className="dca-input-row">
              <input className="dca-input" type="number" min="0" max="50" step="0.5"
                value={annualIncrease} onChange={e => setAnnualIncrease(e.target.value)} placeholder="0" />
              <span className="dca-suffix">% / yr</span>
            </div>
            <div className="dca-field-hint">Increase monthly contribution each year</div>
          </div>

          <div className="dca-date-grid">
            <div className="dca-field">
              <label className="dca-label">Start Date</label>
              <MonthYearPicker
                year={startYear} month={startMonth}
                onChange={(y, m) => { setStartYear(y); setStartMonth(m); }}
              />
            </div>
            <div className="dca-field">
              <label className="dca-label">End Date</label>
              <MonthYearPicker
                year={endYear} month={endMonth}
                onChange={(y, m) => { setEndYear(y); setEndMonth(m); }}
              />
            </div>
          </div>

          <div className="dca-presets">
            {(() => {
              const cy = MAX_YEAR, cm = new Date().getMonth() + 1;
              return [
                { label:'3Y',  sy:cy-3, sm:cm, ey:cy, em:cm },
                { label:'5Y',  sy:cy-5, sm:cm, ey:cy, em:cm },
                { label:'10Y', sy:cy-10,sm:cm, ey:cy, em:cm },
                { label:'15Y', sy:cy-15,sm:cm, ey:cy, em:cm },
              ];
            })().map(p => (
              <button
                key={p.label}
                className={`dca-preset-btn${startYear===p.sy&&startMonth===p.sm&&endYear===p.ey&&endMonth===p.em?' active':''}`}
                onClick={() => applyPreset(p.sy, p.sm, p.ey, p.em)}
              >{p.label}</button>
            ))}
          </div>

          <p className="dca-disclaimer">
            Historical price data is for informational purposes only.
            Not financial advice.
          </p>
        </div>

        {/* ── RESULTS ── */}
        <div className="dca-results">

          {/* Loading / error state */}
          {loading && (
            <div className="dca-status-banner loading">
              <span className="dca-status-spinner" />
              Fetching {ticker} price history…
            </div>
          )}
          {!loading && error && (
            <div className="dca-status-banner error">
              {error}
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <>
              {/* Summary cards */}
              <div className="dca-summary-grid">
                <div className="dca-stat-card highlight">
                  <div className="dca-stat-label">Portfolio Value</div>
                  <div className="dca-stat-val gold">{fmtK(last.dcaValue)}</div>
                  <div className="dca-stat-sub">Final DCA portfolio value</div>
                </div>
                <div className="dca-stat-card">
                  <div className="dca-stat-label">Total Invested</div>
                  <div className="dca-stat-val">{fmtK(last.dcaInvested)}</div>
                  <div className="dca-stat-sub">Over {numMonths} months</div>
                </div>
                <div className={`dca-stat-card ${dcaReturn >= 0 ? 'positive' : 'negative'}`}>
                  <div className="dca-stat-label">Total Return</div>
                  <div className={`dca-stat-val ${dcaReturn >= 0 ? 'green' : 'red'}`}>
                    {dcaReturn >= 0 ? '+' : ''}{dcaReturn.toFixed(1)}%
                  </div>
                  <div className="dca-stat-sub">Return on invested capital</div>
                </div>
                <div className={`dca-stat-card ${totalGain >= 0 ? 'positive' : 'negative'}`}>
                  <div className="dca-stat-label">Total Gain</div>
                  <div className={`dca-stat-val ${totalGain >= 0 ? 'green' : 'red'}`}>
                    {totalGain >= 0 ? '+' : ''}{fmtK(Math.abs(totalGain))}
                  </div>
                  <div className="dca-stat-sub">Profit above amount invested</div>
                </div>
              </div>

              {/* Extra stats */}
              <div className="dca-extra-stats">
                <div className="dca-extra-item">
                  <span className="dca-extra-label">Shares Owned</span>
                  <span className="dca-extra-val">{sharesOwned.toFixed(4)}</span>
                </div>
                <div className="dca-extra-item">
                  <span className="dca-extra-label">Avg Cost / Share</span>
                  <span className="dca-extra-val">${fmt(last.dcaInvested / last.dcaShares)}</span>
                </div>
                <div className="dca-extra-item">
                  <span className="dca-extra-label">Final Share Price</span>
                  <span className="dca-extra-val">${fmt(last.price)}</span>
                </div>
                <div className="dca-extra-item">
                  <span className="dca-extra-label">Period</span>
                  <span className="dca-extra-val">{numMonths} months</span>
                </div>
              </div>

              {/* Chart */}
              <div className="dca-chart-card">
                <div className="dca-chart-header">
                  <div className="dca-chart-title">
                    {ticker}.AX — Portfolio Growth over {numMonths} Months
                  </div>
                  <div className="dca-chart-legend">
                    <span><span className="dca-leg-line gold-line" />DCA Value</span>
                    <span><span className="dca-leg-line inv-line"  />Invested</span>
                  </div>
                </div>
                <DCAChart data={data} />
              </div>

              {/* Monthly breakdown table */}
              <div className="dca-table-wrap">
                <button className="dca-table-toggle" onClick={() => setShowTable(v => !v)}>
                  {showTable ? '▲ Hide' : '▼ Show'} Monthly Breakdown ({data.length} rows)
                </button>
                {showTable && (
                  <div className="dca-table-scroll">
                    <table className="dca-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Price</th>
                          <th>Shares (cum.)</th>
                          <th>Total Invested</th>
                          <th>Portfolio Value</th>
                          <th>Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((d, i) => {
                          const ret = ((d.dcaValue - d.dcaInvested) / d.dcaInvested) * 100;
                          return (
                            <tr key={i}>
                              <td>{MONTHS[d.month - 1]} {d.year}</td>
                              <td>${fmt(d.price)}</td>
                              <td>{d.dcaShares.toFixed(4)}</td>
                              <td>${fmt(d.dcaInvested)}</td>
                              <td className={d.dcaValue >= d.dcaInvested ? 'td-pos' : 'td-neg'}>
                                ${fmt(d.dcaValue)}
                              </td>
                              <td className={ret >= 0 ? 'td-pos' : 'td-neg'}>
                                {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Empty state — no data yet or after error */}
          {!loading && !error && data.length === 0 && (
            <div className="dca-empty">
              <div className="dca-empty-icon">📉</div>
              <div className="dca-empty-title">No price data loaded</div>
              <div className="dca-empty-sub">
                Enter an ASX code and date range, then wait for price data to load.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
