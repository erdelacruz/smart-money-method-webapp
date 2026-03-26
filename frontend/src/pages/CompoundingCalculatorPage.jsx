// ============================================================
// CompoundingCalculatorPage.jsx — Money Compounding Calculator
//
// Inputs:
//   - Initial balance
//   - Monthly contribution
//   - Annual interest rate (savings account %)
//   - Number of years
//
// Outputs:
//   - Total balance at end of period
//   - Total contributions made
//   - Total interest earned
//   - Year-by-year breakdown table
//   - Visual growth bar chart
// ============================================================

import React, { useState, useMemo } from 'react';

function fmt(n) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${fmt(n)}`;
}

// Monthly compounding: balance grows each month then contribution is added
function calcCompounding(initial, monthlyContrib, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const rows = [];

  let balance = initial;
  let totalContributions = initial;
  let totalInterest = 0;

  for (let y = 1; y <= years; y++) {
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate;
      balance += interest + monthlyContrib;
      yearInterest += interest;
      totalContributions += monthlyContrib;
      totalInterest += interest;
    }
    rows.push({
      year: y,
      balance,
      yearInterest,
      totalContributions,
      totalInterest,
    });
  }

  return { rows, finalBalance: balance, totalContributions, totalInterest };
}

export default function CompoundingCalculatorPage() {
  const [initialBalance,    setInitialBalance]    = useState('10000');
  const [monthlyContrib,    setMonthlyContrib]    = useState('500');
  const [annualRate,        setAnnualRate]         = useState('5.00');
  const [years,             setYears]              = useState('10');

  const result = useMemo(() => {
    const initial  = parseFloat(initialBalance.replace(/,/g, ''))  || 0;
    const contrib  = parseFloat(monthlyContrib.replace(/,/g, ''))  || 0;
    const rate     = parseFloat(annualRate)   || 0;
    const yrs      = Math.min(Math.max(parseInt(years) || 1, 1), 50);
    return calcCompounding(initial, contrib, rate, yrs);
  }, [initialBalance, monthlyContrib, annualRate, years]);

  const maxBalance = result ? Math.max(...result.rows.map(r => r.balance)) : 1;

  return (
    <div className="comp-page">
      {/* Header */}
      <div className="comp-header page-hero">
        <div className="section-eyebrow">Personal Finance</div>
        <h1 className="comp-title">Money Compounding Calculator</h1>
        <p className="comp-subtitle">
          See how your savings grow over time with monthly compounding. Enter your starting balance,
          regular contributions and savings account interest rate to project your total wealth.
        </p>
      </div>

      <div className="comp-body">
        {/* ── INPUTS ── */}
        <div className="comp-inputs">
          <h2 className="comp-section-heading">Your Details</h2>

          <div className="comp-field">
            <label className="comp-label">Initial Balance</label>
            <div className="comp-input-row">
              <span className="comp-prefix">$</span>
              <input
                className="comp-input"
                type="number"
                min="0"
                value={initialBalance}
                onChange={e => setInitialBalance(e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>

          <div className="comp-field">
            <label className="comp-label">Monthly Contribution</label>
            <div className="comp-input-row">
              <span className="comp-prefix">$</span>
              <input
                className="comp-input"
                type="number"
                min="0"
                value={monthlyContrib}
                onChange={e => setMonthlyContrib(e.target.value)}
                placeholder="500"
              />
            </div>
          </div>

          <div className="comp-field">
            <label className="comp-label">Annual Interest Rate</label>
            <div className="comp-input-row">
              <input
                className="comp-input"
                type="number"
                min="0"
                max="30"
                step="0.01"
                value={annualRate}
                onChange={e => setAnnualRate(e.target.value)}
                placeholder="5.00"
              />
              <span className="comp-suffix">% p.a.</span>
            </div>
            <div className="comp-field-hint">Interest compounded monthly</div>
          </div>

          <div className="comp-field">
            <label className="comp-label">Number of Years</label>
            <div className="comp-input-row">
              <input
                className="comp-input"
                type="number"
                min="1"
                max="50"
                value={years}
                onChange={e => setYears(e.target.value)}
                placeholder="10"
              />
              <span className="comp-suffix">yrs</span>
            </div>
            {/* Quick year presets */}
            <div className="comp-year-presets">
              {[5, 10, 15, 20, 30].map(y => (
                <button
                  key={y}
                  className={`comp-preset-btn${parseInt(years) === y ? ' active' : ''}`}
                  onClick={() => setYears(String(y))}
                >{y}yr</button>
              ))}
            </div>
          </div>

          <p className="comp-disclaimer">
            Calculations use monthly compounding. Results are illustrative only and do not account for
            taxes, fees, inflation or changes in interest rates. Past performance is not indicative of future returns.
          </p>
        </div>

        {/* ── RESULTS ── */}
        <div className="comp-results">
          {result && (
            <>
              {/* Summary cards */}
              <div className="comp-summary-cards">
                <div className="comp-summary-card highlight">
                  <div className="comp-summary-top">Total Balance</div>
                  <div className="comp-summary-amount">${fmt(result.finalBalance)}</div>
                  <div className="comp-summary-sub">After {years} year{parseInt(years) !== 1 ? 's' : ''}</div>
                </div>
                <div className="comp-summary-card">
                  <div className="comp-summary-top">Total Contributions</div>
                  <div className="comp-summary-amount">${fmt(result.totalContributions)}</div>
                  <div className="comp-summary-sub">Initial + monthly deposits</div>
                </div>
                <div className="comp-summary-card interest">
                  <div className="comp-summary-top">Total Interest Earned</div>
                  <div className="comp-summary-amount interest-amt">${fmt(result.totalInterest)}</div>
                  <div className="comp-summary-sub">
                    {((result.totalInterest / result.totalContributions) * 100).toFixed(1)}% return on contributions
                  </div>
                </div>
              </div>

              {/* Visual bar chart — balance per year */}
              <div className="comp-chart-wrap">
                <div className="comp-chart-title">Balance Growth Over Time</div>
                <div className="comp-chart">
                  {result.rows.map(row => {
                    const contribH = (row.totalContributions / maxBalance * 100).toFixed(1);
                    const interestH = ((row.balance - row.totalContributions) / maxBalance * 100).toFixed(1);
                    const showLabel = result.rows.length <= 20 || row.year % 5 === 0 || row.year === 1;
                    return (
                      <div key={row.year} className="comp-bar-col">
                        <div className="comp-bar-tooltip">
                          <strong>Year {row.year}</strong>
                          <span>Balance: ${fmt(row.balance)}</span>
                          <span>Contributions: ${fmt(row.totalContributions)}</span>
                          <span>Interest: ${fmt(row.totalInterest)}</span>
                        </div>
                        <div className="comp-bar-stack">
                          <div className="comp-bar-interest" style={{ height: `${interestH}%` }} />
                          <div className="comp-bar-contrib"  style={{ height: `${contribH}%` }} />
                        </div>
                        {showLabel && <div className="comp-bar-xlabel">Yr {row.year}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="comp-chart-legend">
                  <span><span className="comp-legend-dot contrib" />Contributions</span>
                  <span><span className="comp-legend-dot interest" />Interest Earned</span>
                </div>
              </div>

              {/* Year-by-year table */}
              <div className="comp-table-wrap">
                <div className="comp-table-title">Year-by-Year Breakdown</div>
                <div className="comp-table">
                  <div className="comp-table-head">
                    <span>Year</span>
                    <span>Interest This Year</span>
                    <span>Total Contributions</span>
                    <span>Total Interest</span>
                    <span>Balance</span>
                  </div>
                  {result.rows.map(row => (
                    <div key={row.year} className="comp-table-row">
                      <span className="comp-table-year">Year {row.year}</span>
                      <span className="comp-table-val interest-col">${fmt(row.yearInterest)}</span>
                      <span className="comp-table-val">${fmt(row.totalContributions)}</span>
                      <span className="comp-table-val interest-col">${fmt(row.totalInterest)}</span>
                      <span className="comp-table-val bold">${fmt(row.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
