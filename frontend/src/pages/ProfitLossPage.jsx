// ============================================================
// ProfitLossPage.jsx — ASX Profit / Loss Calculator
//
// Features:
//   - ASX stock code search input
//   - Broker preset fee structures (CommSec, SelfWealth, Stake, nabtrade, Custom)
//   - Buy calculator: shares × price + brokerage + GST = total cost
//   - Sell calculator: shares × price − brokerage − GST = net proceeds
//   - P&L summary: gross profit, total fees paid, net P&L, return %
// ============================================================

import React, { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Broker fee presets
// Each preset defines how brokerage is calculated:
//   type "flat"    — fixed dollar fee per trade
//   type "tiered"  — fee depends on trade value; each tier has a max trade
//                    value and either a flat fee OR a percentage (pct)
// ---------------------------------------------------------------------------
const BROKERS = [
  {
    id: 'commsec',
    name: 'CommSec',
    color: '#FFD700',
    desc: 'Min $10 / 0.12% online',
    type: 'tiered',
    tiers: [
      { max: 1_000,      fee: 10.00 },
      { max: 10_000,     pct: 0.0012 },
      { max: 25_000,     pct: 0.0010 },
      { max: Infinity,   pct: 0.0008 },
    ],
  },
  {
    id: 'selfwealth',
    name: 'SelfWealth',
    color: '#378ADD',
    desc: 'Flat $9.50 per trade',
    type: 'flat',
    fee: 9.50,
  },
  {
    id: 'stake',
    name: 'Stake',
    color: '#00C896',
    desc: 'Flat $3.00 per trade',
    type: 'flat',
    fee: 3.00,
  },
  {
    id: 'nabtrade',
    name: 'nabtrade',
    color: '#EF9F27',
    desc: 'Min $14.95 / 0.10%',
    type: 'tiered',
    tiers: [
      { max: 5_000,      fee: 14.95 },
      { max: 20_000,     pct: 0.0010 },
      { max: Infinity,   pct: 0.0008 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    color: '#8B5CF6',
    desc: 'Enter your own fees',
    type: 'custom',
  },
];

// Calculate brokerage for a given trade value and broker preset
function calcBrokerage(tradeValue, broker) {
  if (tradeValue <= 0) return 0;
  if (broker.type === 'flat') return broker.fee;
  if (broker.type === 'tiered') {
    for (const tier of broker.tiers) {
      if (tradeValue <= tier.max) {
        return tier.fee != null ? tier.fee : tradeValue * tier.pct;
      }
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Row inside a calculator panel showing a label + value
function CalcRow({ label, value, highlight, muted, prefix = '$' }) {
  return (
    <div className={`plc-row${highlight ? ' plc-row--highlight' : ''}${muted ? ' plc-row--muted' : ''}`}>
      <span className="plc-row-label">{label}</span>
      <span className="plc-row-value">
        {prefix}{typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  );
}

// Individual buy or sell panel
function TradePanel({ side, shares, setShares, price, setPrice, customFee, setCustomFee, broker, gstRate }) {
  const tradeValue   = shares * price;
  const isCustom     = broker.id === 'custom';
  const brokerage    = isCustom ? (parseFloat(customFee) || 0) : calcBrokerage(tradeValue, broker);
  const gst          = brokerage * gstRate;
  const totalFees    = brokerage + gst;
  const netAmount    = side === 'buy'
    ? tradeValue + totalFees      // cost to buy
    : tradeValue - totalFees;     // proceeds from sell

  const accentColor  = side === 'buy' ? '#22c55e' : '#f97316';
  const label        = side === 'buy' ? 'Buy' : 'Sell';

  return (
    <div className="plc-panel">
      <div className="plc-panel-header" style={{ borderColor: accentColor }}>
        <span className="plc-panel-badge" style={{ background: `${accentColor}22`, color: accentColor }}>
          {label}
        </span>
        <span className="plc-panel-title">{side === 'buy' ? 'Buy Trade' : 'Sell Trade'}</span>
      </div>

      <div className="plc-inputs">
        <div className="plc-input-group">
          <label className="plc-label">Number of Shares</label>
          <input
            type="number"
            className="plc-input"
            placeholder="e.g. 500"
            min="0"
            value={shares === '' ? '' : shares}
            onChange={e => setShares(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div className="plc-input-group">
          <label className="plc-label">Price per Share (AUD)</label>
          <div className="plc-input-prefix-wrap">
            <span className="plc-input-prefix">$</span>
            <input
              type="number"
              className="plc-input plc-input--prefixed"
              placeholder="e.g. 12.50"
              min="0"
              step="0.01"
              value={price === '' ? '' : price}
              onChange={e => setPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>
        {isCustom && (
          <div className="plc-input-group">
            <label className="plc-label">Brokerage Fee (AUD)</label>
            <div className="plc-input-prefix-wrap">
              <span className="plc-input-prefix">$</span>
              <input
                type="number"
                className="plc-input plc-input--prefixed"
                placeholder="e.g. 9.50"
                min="0"
                step="0.01"
                value={customFee}
                onChange={e => setCustomFee(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="plc-breakdown">
        <CalcRow label="Trade Value"    value={tradeValue}  muted />
        <CalcRow label="Brokerage Fee"  value={brokerage}   muted />
        <CalcRow label={`GST (${(gstRate * 100).toFixed(0)}% on brokerage)`} value={gst} muted />
        <div className="plc-divider" />
        <CalcRow
          label={side === 'buy' ? 'Total Cost (Net Buy)' : 'Net Proceeds (Net Sell)'}
          value={netAmount}
          highlight
        />
      </div>

      {/* Return computed values to parent via a hidden mechanism — we use a render-prop-like approach */}
      {/* Actually, we'll expose values via the parent's useMemo instead */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function ProfitLossPage() {
  const [asxCode,    setAsxCode]    = useState('');
  const [brokerId,   setBrokerId]   = useState('selfwealth');
  const [gstEnabled, setGstEnabled] = useState(true);

  // Buy side state
  const [buyShares,     setBuyShares]     = useState('');
  const [buyPrice,      setBuyPrice]      = useState('');
  const [buyCustomFee,  setBuyCustomFee]  = useState('');

  // Sell side state
  const [sellShares,    setSellShares]    = useState('');
  const [sellPrice,     setSellPrice]     = useState('');
  const [sellCustomFee, setSellCustomFee] = useState('');

  const broker  = BROKERS.find(b => b.id === brokerId);
  const gstRate = gstEnabled ? 0.10 : 0;

  // Derived values for P&L summary
  const summary = useMemo(() => {
    const bShares = Number(buyShares)  || 0;
    const bPrice  = Number(buyPrice)   || 0;
    const sShares = Number(sellShares) || 0;
    const sPrice  = Number(sellPrice)  || 0;

    const buyValue   = bShares * bPrice;
    const sellValue  = sShares * sPrice;

    const buyBrok    = broker.id === 'custom'
      ? (parseFloat(buyCustomFee)  || 0)
      : calcBrokerage(buyValue,  broker);
    const sellBrok   = broker.id === 'custom'
      ? (parseFloat(sellCustomFee) || 0)
      : calcBrokerage(sellValue, broker);

    const buyGst     = buyBrok  * gstRate;
    const sellGst    = sellBrok * gstRate;

    const totalBuyFees  = buyBrok  + buyGst;
    const totalSellFees = sellBrok + sellGst;

    const netBuyCost   = buyValue  + totalBuyFees;
    const netSellProc  = sellValue - totalSellFees;

    const grossPL      = sellValue - buyValue;
    const totalFees    = totalBuyFees + totalSellFees;
    const netPL        = netSellProc  - netBuyCost;
    const returnPct    = netBuyCost > 0 ? (netPL / netBuyCost) * 100 : 0;

    const hasData = bShares > 0 && bPrice > 0 && sShares > 0 && sPrice > 0;

    return { grossPL, totalFees, netPL, returnPct, netBuyCost, netSellProc, hasData };
  }, [buyShares, buyPrice, buyCustomFee, sellShares, sellPrice, sellCustomFee, broker, gstRate]);

  const handleReset = () => {
    setAsxCode('');
    setBuyShares(''); setBuyPrice(''); setBuyCustomFee('');
    setSellShares(''); setSellPrice(''); setSellCustomFee('');
  };

  return (
    <div className="plc-wrapper">
      {/* ── PAGE HERO ─────────────────────────────────────────── */}
      <div className="plc-hero page-hero">
        <div className="plc-hero-inner">
          <div className="section-eyebrow">Share Trading</div>
          <h1 className="plc-hero-title">Profit / Loss Calculator</h1>
          <p className="plc-hero-sub">
            Calculate your net buy cost, net sell proceeds, brokerage fees, GST, and overall
            profit or loss for any ASX-listed stock.
          </p>
        </div>
      </div>

      <div className="plc-page">

        {/* ── STOCK CODE SEARCH ─────────────────────────────── */}
        <div className="plc-search-row">
          <div className="plc-search-wrap">
            <svg className="plc-search-icon" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="plc-search-input"
              type="text"
              placeholder="Enter ASX code (e.g. BHP, CBA, ANZ)"
              value={asxCode}
              onChange={e => setAsxCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
            />
            {asxCode && (
              <span className="plc-search-badge">{asxCode}</span>
            )}
          </div>
          <button className="plc-reset-btn" onClick={handleReset} title="Reset all fields">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        </div>

        {/* ── BROKER SELECTOR ───────────────────────────────── */}
        <div className="plc-section">
          <div className="plc-section-header">
            <span className="plc-section-title">Broker &amp; Fees</span>
            <label className="plc-toggle-wrap">
              <span className="plc-toggle-label">GST on brokerage (10%)</span>
              <button
                className={`plc-toggle${gstEnabled ? ' plc-toggle--on' : ''}`}
                onClick={() => setGstEnabled(v => !v)}
                aria-pressed={gstEnabled}
              >
                <span className="plc-toggle-thumb" />
              </button>
            </label>
          </div>

          <div className="plc-broker-grid">
            {BROKERS.map(b => (
              <button
                key={b.id}
                className={`plc-broker-card${brokerId === b.id ? ' plc-broker-card--active' : ''}`}
                style={brokerId === b.id ? { '--broker-color': b.color } : {}}
                onClick={() => setBrokerId(b.id)}
              >
                <span className="plc-broker-name" style={brokerId === b.id ? { color: b.color } : {}}>
                  {b.name}
                </span>
                <span className="plc-broker-desc">{b.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CALCULATOR PANELS ─────────────────────────────── */}
        <div className="plc-panels">

          {/* BUY PANEL */}
          <div className="plc-panel">
            <div className="plc-panel-header" style={{ borderColor: '#22c55e' }}>
              <span className="plc-panel-badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                Buy
              </span>
              <span className="plc-panel-title">Buy Trade</span>
            </div>

            <div className="plc-inputs">
              <div className="plc-input-group">
                <label className="plc-label">Number of Shares</label>
                <input type="number" className="plc-input" placeholder="e.g. 500"
                  min="0" value={buyShares}
                  onChange={e => setBuyShares(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="plc-input-group">
                <label className="plc-label">Buy Price per Share (AUD)</label>
                <div className="plc-input-prefix-wrap">
                  <span className="plc-input-prefix">$</span>
                  <input type="number" className="plc-input plc-input--prefixed"
                    placeholder="e.g. 12.50" min="0" step="0.01" value={buyPrice}
                    onChange={e => setBuyPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
              {brokerId === 'custom' && (
                <div className="plc-input-group">
                  <label className="plc-label">Brokerage Fee (AUD)</label>
                  <div className="plc-input-prefix-wrap">
                    <span className="plc-input-prefix">$</span>
                    <input type="number" className="plc-input plc-input--prefixed"
                      placeholder="e.g. 9.50" min="0" step="0.01" value={buyCustomFee}
                      onChange={e => setBuyCustomFee(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Breakdown */}
            {(() => {
              const bShares   = Number(buyShares)  || 0;
              const bPrice    = Number(buyPrice)   || 0;
              const tradeVal  = bShares * bPrice;
              const brok      = brokerId === 'custom'
                ? (parseFloat(buyCustomFee) || 0)
                : calcBrokerage(tradeVal, broker);
              const gst       = brok * gstRate;
              const netCost   = tradeVal + brok + gst;
              return (
                <div className="plc-breakdown">
                  <div className="plc-row plc-row--muted">
                    <span className="plc-row-label">Trade Value</span>
                    <span className="plc-row-value">${tradeVal.toFixed(2)}</span>
                  </div>
                  <div className="plc-row plc-row--muted">
                    <span className="plc-row-label">Brokerage Fee</span>
                    <span className="plc-row-value">${brok.toFixed(2)}</span>
                  </div>
                  {gstEnabled && (
                    <div className="plc-row plc-row--muted">
                      <span className="plc-row-label">GST (10% on brokerage)</span>
                      <span className="plc-row-value">${gst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="plc-divider" />
                  <div className="plc-row plc-row--highlight">
                    <span className="plc-row-label">Total Cost (Net Buy)</span>
                    <span className="plc-row-value" style={{ color: '#22c55e' }}>${netCost.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SELL PANEL */}
          <div className="plc-panel">
            <div className="plc-panel-header" style={{ borderColor: '#f97316' }}>
              <span className="plc-panel-badge" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                Sell
              </span>
              <span className="plc-panel-title">Sell Trade</span>
            </div>

            <div className="plc-inputs">
              <div className="plc-input-group">
                <label className="plc-label">Number of Shares</label>
                <input type="number"
                  className={`plc-input${sellShares !== '' && buyShares !== '' && Number(sellShares) > Number(buyShares) ? ' plc-input--error' : ''}`}
                  placeholder="e.g. 500"
                  min="0"
                  max={buyShares !== '' ? buyShares : undefined}
                  value={sellShares}
                  onChange={e => setSellShares(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                {sellShares !== '' && buyShares !== '' && Number(sellShares) > Number(buyShares) && (
                  <span className="plc-input-error-msg">Cannot exceed bought shares ({Number(buyShares).toLocaleString()})</span>
                )}
              </div>
              <div className="plc-input-group">
                <label className="plc-label">Sell Price per Share (AUD)</label>
                <div className="plc-input-prefix-wrap">
                  <span className="plc-input-prefix">$</span>
                  <input type="number" className="plc-input plc-input--prefixed"
                    placeholder="e.g. 15.00" min="0" step="0.01" value={sellPrice}
                    onChange={e => setSellPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
              {brokerId === 'custom' && (
                <div className="plc-input-group">
                  <label className="plc-label">Brokerage Fee (AUD)</label>
                  <div className="plc-input-prefix-wrap">
                    <span className="plc-input-prefix">$</span>
                    <input type="number" className="plc-input plc-input--prefixed"
                      placeholder="e.g. 9.50" min="0" step="0.01" value={sellCustomFee}
                      onChange={e => setSellCustomFee(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Breakdown */}
            {(() => {
              const sShares   = Number(sellShares) || 0;
              const sPrice    = Number(sellPrice)  || 0;
              const tradeVal  = sShares * sPrice;
              const brok      = brokerId === 'custom'
                ? (parseFloat(sellCustomFee) || 0)
                : calcBrokerage(tradeVal, broker);
              const gst       = brok * gstRate;
              const netProc   = tradeVal - brok - gst;
              return (
                <div className="plc-breakdown">
                  <div className="plc-row plc-row--muted">
                    <span className="plc-row-label">Trade Value</span>
                    <span className="plc-row-value">${tradeVal.toFixed(2)}</span>
                  </div>
                  <div className="plc-row plc-row--muted">
                    <span className="plc-row-label">Brokerage Fee</span>
                    <span className="plc-row-value">${brok.toFixed(2)}</span>
                  </div>
                  {gstEnabled && (
                    <div className="plc-row plc-row--muted">
                      <span className="plc-row-label">GST (10% on brokerage)</span>
                      <span className="plc-row-value">${gst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="plc-divider" />
                  <div className="plc-row plc-row--highlight">
                    <span className="plc-row-label">Net Proceeds (Net Sell)</span>
                    <span className="plc-row-value" style={{ color: '#f97316' }}>${netProc.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── P&L SUMMARY ───────────────────────────────────── */}
        <div className={`plc-summary${!summary.hasData ? ' plc-summary--empty' : ''}`}>
          <div className="plc-summary-header">
            <div className="plc-summary-title">
              {asxCode ? (
                <>
                  <span className="plc-summary-code">{asxCode}</span>
                  <span> — Profit / Loss Summary</span>
                </>
              ) : (
                'Profit / Loss Summary'
              )}
            </div>
            {!summary.hasData && (
              <span className="plc-summary-hint">Fill in both buy and sell sides above to see results</span>
            )}
          </div>

          <div className="plc-summary-grid">
            <div className="plc-stat-card">
              <div className="plc-stat-label">Net Buy Cost</div>
              <div className="plc-stat-value plc-stat-value--blue">
                ${summary.netBuyCost.toFixed(2)}
              </div>
              <div className="plc-stat-sub">Total capital out (incl. fees)</div>
            </div>

            <div className="plc-stat-card">
              <div className="plc-stat-label">Net Sell Proceeds</div>
              <div className="plc-stat-value plc-stat-value--green">
                ${summary.netSellProc.toFixed(2)}
              </div>
              <div className="plc-stat-sub">Total received (after fees)</div>
            </div>

            <div className="plc-stat-card">
              <div className="plc-stat-label">Total Fees Paid</div>
              <div className="plc-stat-value plc-stat-value--gold">
                ${summary.totalFees.toFixed(2)}
              </div>
              <div className="plc-stat-sub">Brokerage + GST (buy &amp; sell)</div>
            </div>

            <div className={`plc-stat-card plc-stat-card--result ${summary.netPL >= 0 ? 'plc-stat-card--profit' : 'plc-stat-card--loss'}`}>
              <div className="plc-stat-label">Net Profit / Loss</div>
              <div className={`plc-stat-value plc-stat-value--large ${summary.netPL >= 0 ? 'plc-stat-value--profit' : 'plc-stat-value--loss'}`}>
                {summary.netPL >= 0 ? '+' : ''}${summary.netPL.toFixed(2)}
              </div>
              <div className="plc-stat-sub">
                {summary.netPL >= 0
                  ? `+${summary.returnPct.toFixed(2)}% return on investment`
                  : `${summary.returnPct.toFixed(2)}% return on investment`}
              </div>
            </div>
          </div>

          {/* Gross vs Net comparison bar */}
          {summary.hasData && (
            <div className="plc-breakdown-note">
              <span className="plc-breakdown-note-item">
                <span className="plc-dot" style={{ background: 'var(--text2)' }} />
                Gross P&amp;L (before fees): &nbsp;
                <strong style={{ color: summary.grossPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {summary.grossPL >= 0 ? '+' : ''}${summary.grossPL.toFixed(2)}
                </strong>
              </span>
              <span className="plc-breakdown-note-sep">·</span>
              <span className="plc-breakdown-note-item">
                <span className="plc-dot" style={{ background: 'var(--gold)' }} />
                Fees drag: &nbsp;
                <strong style={{ color: 'var(--gold)' }}>-${summary.totalFees.toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ── FEE REFERENCE TABLE ───────────────────────────── */}
        <div className="plc-section plc-ref-section">
          <div className="plc-section-title" style={{ marginBottom: '1rem' }}>
            Australian Broker Fee Reference
          </div>
          <div className="plc-ref-table-wrap">
            <table className="plc-ref-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th>Trade ≤ $1,000</th>
                  <th>Trade ≤ $5,000</th>
                  <th>Trade ≤ $10,000</th>
                  <th>Trade ≤ $25,000</th>
                  <th>Trade &gt; $25,000</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="plc-ref-broker" style={{ color: '#FFD700' }}>CommSec</span></td>
                  <td>$10.00</td>
                  <td>$10.00</td>
                  <td>0.12%</td>
                  <td>0.10%</td>
                  <td>0.08%</td>
                </tr>
                <tr>
                  <td><span className="plc-ref-broker" style={{ color: '#378ADD' }}>SelfWealth</span></td>
                  <td>$9.50</td>
                  <td>$9.50</td>
                  <td>$9.50</td>
                  <td>$9.50</td>
                  <td>$9.50</td>
                </tr>
                <tr>
                  <td><span className="plc-ref-broker" style={{ color: '#00C896' }}>Stake</span></td>
                  <td>$3.00</td>
                  <td>$3.00</td>
                  <td>$3.00</td>
                  <td>$3.00</td>
                  <td>$3.00</td>
                </tr>
                <tr>
                  <td><span className="plc-ref-broker" style={{ color: '#EF9F27' }}>nabtrade</span></td>
                  <td>$14.95</td>
                  <td>$14.95</td>
                  <td>0.10%</td>
                  <td>0.10%</td>
                  <td>0.08%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="plc-ref-note">
            All fees exclude GST. GST (10%) is charged on brokerage by Australian brokers.
            Fees are indicative only — verify with your broker before trading.
          </p>
        </div>

      </div>
    </div>
  );
}
