// ============================================================
// PayCalculatorPage.jsx — Australian Pay Calculator
//
// Features:
//   - Gross income input (annual, monthly, fortnightly, weekly, daily, hourly)
//   - Pay frequency selector
//   - Hours per week (for hourly rate calc)
//   - Residency status (resident / non-resident / working holiday)
//   - Tax-free threshold toggle
//   - Medicare levy (with low-income reduction)
//   - HECS/HELP debt repayment
//   - Super contributions (employer 11.5% SGC)
//   - Results: income tax, medicare, HECS, super, net pay
//   - All figures shown across annual / monthly / fortnightly / weekly
// ============================================================

import React, { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// 2025–26 ATO individual income tax brackets (Stage 3 rates)
// Source: ato.gov.au/tax-rates-and-codes/tax-rates-for-individuals
// ---------------------------------------------------------------------------
const RESIDENT_BRACKETS = [
  { min: 0,        max: 18_200,  base: 0,      rate: 0     },
  { min: 18_201,   max: 45_000,  base: 0,      rate: 0.19  },
  { min: 45_001,   max: 135_000, base: 5_092,  rate: 0.30  },
  { min: 135_001,  max: 190_000, base: 32_092, rate: 0.37  },
  { min: 190_001,  max: Infinity,base: 52_442, rate: 0.45  },
];

// 2025–26 non-resident brackets (no tax-free threshold; first band stays 32.5%)
const NON_RESIDENT_BRACKETS = [
  { min: 0,        max: 135_000, base: 0,      rate: 0.325 },
  { min: 135_001,  max: 190_000, base: 43_875, rate: 0.37  },
  { min: 190_001,  max: Infinity,base: 64_225, rate: 0.45  },
];

// Working holiday maker — first $45k at 15%, then resident rates above
const WHM_BRACKETS = [
  { min: 0,        max: 45_000,  base: 0,      rate: 0.15  },
  { min: 45_001,   max: 135_000, base: 6_750,  rate: 0.30  },
  { min: 135_001,  max: 190_000, base: 33_750, rate: 0.37  },
  { min: 190_001,  max: Infinity,base: 54_100, rate: 0.45  },
];

// Low Income Tax Offset (LITO) — resident only, unchanged for 2025–26
function calcLITO(income) {
  if (income <= 37_500) return 700;
  if (income <= 45_000) return 700 - (income - 37_500) * 0.05;
  if (income <= 66_667) return 325 - (income - 45_000) * 0.015;
  return 0;
}

// Medicare levy 2025–26: 2% above $32,500; shade-in from $26,000
const MEDICARE_RATE             = 0.02;
const MEDICARE_SHADE_IN_LOWER   = 26_000; // below this → no levy
const MEDICARE_SHADE_IN_UPPER   = 32_500; // above this → full 2%

// HECS/HELP compulsory repayment thresholds 2025–26 (indexed from 2025–26)
// Minimum repayment income: $56,152
const HECS_THRESHOLDS = [
  { min: 0,         rate: 0     },
  { min: 56_152,    rate: 0.010 },
  { min: 64_726,    rate: 0.020 },
  { min: 68_622,    rate: 0.025 },
  { min: 72_762,    rate: 0.030 },
  { min: 77_344,    rate: 0.035 },
  { min: 82_122,    rate: 0.040 },
  { min: 87_287,    rate: 0.045 },
  { min: 92_503,    rate: 0.050 },
  { min: 98_053,    rate: 0.055 },
  { min: 104_049,   rate: 0.060 },
  { min: 110_512,   rate: 0.065 },
  { min: 117_337,   rate: 0.070 },
  { min: 124_588,   rate: 0.075 },
  { min: 132_260,   rate: 0.080 },
  { min: 140_381,   rate: 0.085 },
  { min: 149_047,   rate: 0.090 },
  { min: 158_256,   rate: 0.095 },
  { min: 168_116,   rate: 0.100 },
];

function calcTax(income, brackets) {
  for (const b of [...brackets].reverse()) {
    if (income > b.min - 1) {
      return b.base + (income - (b.min - 1)) * b.rate;
    }
  }
  return 0;
}

function calcMedicare(income, resident) {
  if (!resident) return 0;
  if (income <= MEDICARE_SHADE_IN_LOWER) return 0;
  if (income <= MEDICARE_SHADE_IN_UPPER) {
    return (income - MEDICARE_SHADE_IN_LOWER) * 0.1;
  }
  return income * MEDICARE_RATE;
}

function calcHECS(income) {
  for (const t of [...HECS_THRESHOLDS].reverse()) {
    if (income >= t.min) return income * t.rate;
  }
  return 0;
}

const DEFAULT_SUPER_RATE = 12; // 12% SGC from 1 July 2025 (2025–26)

const FREQUENCIES = [
  { id: 'annual',      label: 'Annual',      perYear: 1       },
  { id: 'monthly',     label: 'Monthly',     perYear: 12      },
  { id: 'fortnightly', label: 'Fortnightly', perYear: 26      },
  { id: 'weekly',      label: 'Weekly',      perYear: 52      },
  { id: 'daily',       label: 'Daily',       perYear: 260     },
  { id: 'hourly',      label: 'Hourly',      perYear: null    }, // depends on hours
];

function fmt(n) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ResultRow({ label, annual, color, bold }) {
  return (
    <div className={`pay-result-row${bold ? ' bold' : ''}`} style={color ? { color } : {}}>
      <span className="pay-result-label">{label}</span>
      <span className="pay-result-val">${fmt(annual)}</span>
      <span className="pay-result-val">${fmt(annual / 12)}</span>
      <span className="pay-result-val">${fmt(annual / 26)}</span>
      <span className="pay-result-val">${fmt(annual / 52)}</span>
    </div>
  );
}

export default function PayCalculatorPage() {
  const [grossInput, setGrossInput]     = useState('80000');
  const [frequency, setFrequency]       = useState('annual');
  const [hoursPerWeek, setHoursPerWeek] = useState('38');
  const [residency, setResidency]       = useState('resident');
  const [taxFreeThreshold, setTaxFreeThreshold] = useState(true);
  const [includeHECS, setIncludeHECS]   = useState(false);
  const [superInclusive, setSuperInclusive] = useState(false); // salary package or on-top
  const [superRate,      setSuperRate]      = useState(String(DEFAULT_SUPER_RATE));

  const results = useMemo(() => {
    const raw = parseFloat(grossInput.replace(/,/g, '')) || 0;
    if (raw <= 0) return null;

    // Convert input to annual gross
    const freq = FREQUENCIES.find(f => f.id === frequency);
    const hours = parseFloat(hoursPerWeek) || 38;
    const perYear = freq.perYear ?? (hours * 52);
    const annualGross = raw * perYear;

    // Super
    const superRateFrac = (parseFloat(superRate) || DEFAULT_SUPER_RATE) / 100;
    let annualSalary = annualGross;
    let superAmount = 0;
    if (superInclusive) {
      // salary packages super — gross already includes super
      annualSalary = annualGross / (1 + superRateFrac);
      superAmount  = annualGross - annualSalary;
    } else {
      superAmount  = annualGross * superRateFrac;
    }

    // Income tax
    let brackets = RESIDENT_BRACKETS;
    if (residency === 'non-resident') brackets = NON_RESIDENT_BRACKETS;
    if (residency === 'whm') brackets = WHM_BRACKETS;

    let tax = calcTax(annualSalary, brackets);

    // LITO (resident only, tax-free threshold applies)
    if (residency === 'resident' && taxFreeThreshold) {
      const lito = calcLITO(annualSalary);
      tax = Math.max(0, tax - lito);
    }

    // Medicare
    const medicare = calcMedicare(annualSalary, residency === 'resident');

    // HECS
    const hecs = includeHECS ? calcHECS(annualSalary) : 0;

    const totalDeductions = tax + medicare + hecs;
    const netIncome = annualSalary - totalDeductions;

    return { annualGross, annualSalary, tax, medicare, hecs, superAmount, netIncome, totalDeductions };
  }, [grossInput, frequency, hoursPerWeek, residency, taxFreeThreshold, includeHECS, superInclusive, superRate]);

  const activeTaxRate = results
    ? ((results.tax / results.annualSalary) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="pay-page">
      {/* Header */}
      <div className="pay-header page-hero">
        <div className="section-eyebrow">Personal Finance</div>
        <h1 className="pay-title">Australian Pay Calculator</h1>
        <p className="pay-subtitle">Calculate your take-home pay after income tax, Medicare levy, HECS/HELP and super — based on 2025–26 ATO rates.</p>
      </div>

      <div className="pay-body">
        {/* ── INPUTS ── */}
        <div className="pay-inputs">
          <h2 className="pay-section-heading">Your Income</h2>

          {/* Gross income */}
          <div className="pay-field">
            <label className="pay-label">Gross Income</label>
            <div className="pay-input-row">
              <span className="pay-prefix">$</span>
              <input
                className="pay-input"
                type="number"
                min="0"
                value={grossInput}
                onChange={e => setGrossInput(e.target.value)}
                placeholder="e.g. 80000"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="pay-field">
            <label className="pay-label">Pay Frequency</label>
            <div className="pay-freq-grid">
              {FREQUENCIES.map(f => (
                <button
                  key={f.id}
                  className={`pay-freq-btn${frequency === f.id ? ' active' : ''}`}
                  onClick={() => setFrequency(f.id)}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Hours per week — only relevant for hourly */}
          {frequency === 'hourly' && (
            <div className="pay-field">
              <label className="pay-label">Hours per Week</label>
              <div className="pay-input-row">
                <input
                  className="pay-input"
                  type="number"
                  min="1"
                  max="168"
                  value={hoursPerWeek}
                  onChange={e => setHoursPerWeek(e.target.value)}
                />
                <span className="pay-suffix">hrs</span>
              </div>
            </div>
          )}

          <h2 className="pay-section-heading" style={{marginTop:28}}>Tax Settings</h2>

          {/* Residency */}
          <div className="pay-field">
            <label className="pay-label">Residency Status</label>
            <div className="pay-select-group">
              {[
                { id:'resident',     label:'Australian Resident' },
                { id:'non-resident', label:'Non-Resident' },
                { id:'whm',          label:'Working Holiday' },
              ].map(r => (
                <button
                  key={r.id}
                  className={`pay-select-btn${residency === r.id ? ' active' : ''}`}
                  onClick={() => setResidency(r.id)}
                >{r.label}</button>
              ))}
            </div>
          </div>

          {/* Tax-free threshold */}
          {residency === 'resident' && (
            <div className="pay-toggle-row">
              <div>
                <div className="pay-toggle-label">Claim Tax-Free Threshold</div>
                <div className="pay-toggle-sub">First $18,200 is tax-free for residents</div>
              </div>
              <button
                className={`pay-toggle${taxFreeThreshold ? ' on' : ''}`}
                onClick={() => setTaxFreeThreshold(v => !v)}
              >
                <span className="pay-toggle-knob" />
              </button>
            </div>
          )}

          {/* HECS */}
          <div className="pay-toggle-row">
            <div>
              <div className="pay-toggle-label">HECS / HELP Debt</div>
              <div className="pay-toggle-sub">Compulsory repayment via ATO</div>
            </div>
            <button
              className={`pay-toggle${includeHECS ? ' on' : ''}`}
              onClick={() => setIncludeHECS(v => !v)}
            >
              <span className="pay-toggle-knob" />
            </button>
          </div>

          {/* Super rate */}
          <div className="pay-field">
            <label className="pay-label">Super Rate (SGC)</label>
            <div className="pay-input-row">
              <input
                className="pay-input"
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={superRate}
                onChange={e => setSuperRate(e.target.value)}
                placeholder="12"
              />
              <span className="pay-suffix">%</span>
            </div>
            <div className="pay-field-hint" style={{ marginTop: 4, fontSize: '.75rem', color: 'var(--text2)' }}>
              Default 12.0% SGC (2025–26)
            </div>
          </div>

          {/* Super inclusive toggle */}
          <div className="pay-toggle-row">
            <div>
              <div className="pay-toggle-label">Super Inclusive (Salary Package)</div>
              <div className="pay-toggle-sub">Off = super paid on top of gross; On = super included in gross</div>
            </div>
            <button
              className={`pay-toggle${superInclusive ? ' on' : ''}`}
              onClick={() => setSuperInclusive(v => !v)}
            >
              <span className="pay-toggle-knob" />
            </button>
          </div>

          {/* Disclaimer */}
          <p className="pay-disclaimer">
            Estimates based on 2025–26 ATO rates. Does not include state taxes, salary sacrifice, private health rebate, or other offsets. For personal advice speak to a registered tax agent.
          </p>
        </div>

        {/* ── RESULTS ── */}
        <div className="pay-results">
          {results ? (
            <>
              {/* Summary cards */}
              <div className="pay-summary-cards">
                <div className="pay-summary-card highlight">
                  <div className="pay-summary-top">Annual Take-Home</div>
                  <div className="pay-summary-amount">${fmt(results.netIncome)}</div>
                  <div className="pay-summary-sub">${fmt(results.netIncome / 12)} / month</div>
                </div>
                <div className="pay-summary-card">
                  <div className="pay-summary-top">Effective Tax Rate</div>
                  <div className="pay-summary-amount">{activeTaxRate}%</div>
                  <div className="pay-summary-sub">Income tax only</div>
                </div>
                <div className="pay-summary-card">
                  <div className="pay-summary-top">Total Tax &amp; Levies</div>
                  <div className="pay-summary-amount">${fmt(results.totalDeductions)}</div>
                  <div className="pay-summary-sub">Tax + Medicare{results.hecs > 0 ? ' + HECS' : ''}</div>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="pay-breakdown">
                <div className="pay-breakdown-header">
                  <span>Breakdown</span>
                  <span>Annual</span>
                  <span>Monthly</span>
                  <span>Fortnightly</span>
                  <span>Weekly</span>
                </div>

                <ResultRow label="Gross Income"     annual={results.annualSalary} bold />
                <div className="pay-divider" />
                <ResultRow label="Income Tax"       annual={-results.tax}      color="var(--danger)" />
                <ResultRow label="Medicare Levy"    annual={-results.medicare} color="var(--danger)" />
                {results.hecs > 0 && (
                  <ResultRow label="HECS / HELP"    annual={-results.hecs}     color="var(--danger)" />
                )}
                <div className="pay-divider" />
                <ResultRow label="Net Income"       annual={results.netIncome}  color="var(--success)" bold />
                <div className="pay-divider" />
                <ResultRow label={`Super (${(parseFloat(superRate) || DEFAULT_SUPER_RATE).toFixed(1)}% SGC)`} annual={results.superAmount} color="var(--primary)" />
              </div>

              {/* Tax breakdown bar */}
              <div className="pay-bar-wrap">
                <div className="pay-bar-label-row">
                  <span>Income breakdown</span>
                </div>
                <div className="pay-bar">
                  {(() => {
                    const total = results.annualSalary;
                    const netPct     = (results.netIncome / total * 100).toFixed(1);
                    const taxPct     = (results.tax / total * 100).toFixed(1);
                    const medPct     = (results.medicare / total * 100).toFixed(1);
                    const hecsPct    = (results.hecs / total * 100).toFixed(1);
                    return (
                      <>
                        <div className="pay-bar-seg net"      style={{width:`${netPct}%`}}  title={`Take-home ${netPct}%`} />
                        <div className="pay-bar-seg tax"      style={{width:`${taxPct}%`}}  title={`Income Tax ${taxPct}%`} />
                        <div className="pay-bar-seg medicare" style={{width:`${medPct}%`}}  title={`Medicare ${medPct}%`} />
                        {results.hecs > 0 && (
                          <div className="pay-bar-seg hecs"   style={{width:`${hecsPct}%`}} title={`HECS ${hecsPct}%`} />
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="pay-bar-legend">
                  <span><span className="pay-legend-dot net" />Take-home</span>
                  <span><span className="pay-legend-dot tax" />Income Tax</span>
                  <span><span className="pay-legend-dot medicare" />Medicare</span>
                  {results.hecs > 0 && <span><span className="pay-legend-dot hecs" />HECS</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="pay-empty">Enter your income to see results.</div>
          )}
        </div>
      </div>
    </div>
  );
}
