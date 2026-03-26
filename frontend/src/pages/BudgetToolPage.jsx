// ============================================================
// BudgetToolPage.jsx — Monthly Budget Planner
//
// Sections:
//   - Income  (multiple rows, add/remove)
//   - Expenses grouped by category (add/remove rows)
//   - Savings goals (add/remove)
//   - Number of months projection
//
// Results:
//   - Monthly income / expenses / net surplus
//   - Projected total saved over N months
//   - Per-category expense breakdown bar
//
// Export:
//   - Download full budget as .xlsx (SheetJS)
// ============================================================

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

// ── helpers ──────────────────────────────────────────────────
let _id = 1;
const uid = () => String(_id++);

const num = (v) => parseFloat(String(v).replace(/,/g, '')) || 0;
const fmt = (n) => n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EXPENSE_CATEGORIES = [
  'Housing',
  'Transport',
  'Groceries',
  'Utilities',
  'Insurance',
  'Health',
  'Entertainment',
  'Subscriptions',
  'Education',
  'Personal Care',
  'Clothing',
  'Dining Out',
  'Travel',
  'Gifts & Donations',
  'Other',
];

const DEFAULT_INCOME = [
  { id: uid(), label: 'Salary / Wages',     amount: '' },
  { id: uid(), label: 'Side Income',         amount: '' },
];

const DEFAULT_EXPENSES = [
  { id: uid(), label: 'Rent / Mortgage',     amount: '', category: 'Housing'       },
  { id: uid(), label: 'Electricity',         amount: '', category: 'Utilities'     },
  { id: uid(), label: 'Internet',            amount: '', category: 'Utilities'     },
  { id: uid(), label: 'Groceries',           amount: '', category: 'Groceries'     },
  { id: uid(), label: 'Car Loan / Fuel',     amount: '', category: 'Transport'     },
  { id: uid(), label: 'Health Insurance',    amount: '', category: 'Insurance'     },
  { id: uid(), label: 'Streaming Services', amount: '', category: 'Subscriptions' },
  { id: uid(), label: 'Dining Out',          amount: '', category: 'Dining Out'    },
];

const DEFAULT_SAVINGS = [
  { id: uid(), label: 'Emergency Fund',      amount: '' },
  { id: uid(), label: 'Investment / Super',  amount: '' },
];

// ── sub-components ────────────────────────────────────────────
function SectionHeader({ title, onAdd, addLabel = '+ Add Row' }) {
  return (
    <div className="budget-section-header">
      <span className="budget-section-title">{title}</span>
      <button className="budget-add-btn" onClick={onAdd}>{addLabel}</button>
    </div>
  );
}

function IncomeRow({ row, onChange, onRemove }) {
  return (
    <div className="budget-row">
      <input
        className="budget-input budget-input--label"
        placeholder="Income source"
        value={row.label}
        onChange={e => onChange(row.id, 'label', e.target.value)}
      />
      <div className="budget-amount-wrap">
        <span className="budget-prefix">$</span>
        <input
          className="budget-input budget-input--amount"
          type="number"
          min="0"
          placeholder="0.00"
          value={row.amount}
          onChange={e => onChange(row.id, 'amount', e.target.value)}
        />
        <span className="budget-suffix">/ mo</span>
      </div>
      <button className="budget-remove-btn" onClick={() => onRemove(row.id)} title="Remove">×</button>
    </div>
  );
}

function ExpenseRow({ row, onChange, onRemove }) {
  return (
    <div className="budget-row">
      <input
        className="budget-input budget-input--label"
        placeholder="Expense item"
        value={row.label}
        onChange={e => onChange(row.id, 'label', e.target.value)}
      />
      <select
        className="budget-select"
        value={row.category}
        onChange={e => onChange(row.id, 'category', e.target.value)}
      >
        {EXPENSE_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <div className="budget-amount-wrap">
        <span className="budget-prefix">$</span>
        <input
          className="budget-input budget-input--amount"
          type="number"
          min="0"
          placeholder="0.00"
          value={row.amount}
          onChange={e => onChange(row.id, 'amount', e.target.value)}
        />
        <span className="budget-suffix">/ mo</span>
      </div>
      <button className="budget-remove-btn" onClick={() => onRemove(row.id)} title="Remove">×</button>
    </div>
  );
}

function SavingsRow({ row, onChange, onRemove }) {
  return (
    <div className="budget-row">
      <input
        className="budget-input budget-input--label"
        placeholder="Savings goal"
        value={row.label}
        onChange={e => onChange(row.id, 'label', e.target.value)}
      />
      <div className="budget-amount-wrap">
        <span className="budget-prefix">$</span>
        <input
          className="budget-input budget-input--amount"
          type="number"
          min="0"
          placeholder="0.00"
          value={row.amount}
          onChange={e => onChange(row.id, 'amount', e.target.value)}
        />
        <span className="budget-suffix">/ mo</span>
      </div>
      <button className="budget-remove-btn" onClick={() => onRemove(row.id)} title="Remove">×</button>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function BudgetToolPage() {
  const [income,   setIncome]   = useState(DEFAULT_INCOME);
  const [expenses, setExpenses] = useState(DEFAULT_EXPENSES);
  const [savings,  setSavings]  = useState(DEFAULT_SAVINGS);
  const [months,   setMonths]   = useState('12');

  // ── row mutators ──────────────────────────────────────────
  const updateRow  = (setter) => (id, field, value) =>
    setter(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const removeRow  = (setter) => (id) =>
    setter(rows => rows.filter(r => r.id !== id));

  const addIncome  = () => setIncome(r  => [...r,  { id: uid(), label: '', amount: '' }]);
  const addExpense = () => setExpenses(r => [...r, { id: uid(), label: '', amount: '', category: 'Other' }]);
  const addSavings = () => setSavings(r => [...r,  { id: uid(), label: '', amount: '' }]);

  // ── computed ──────────────────────────────────────────────
  const results = useMemo(() => {
    const totalIncome   = income.reduce((s, r)   => s + num(r.amount), 0);
    const totalExpenses = expenses.reduce((s, r) => s + num(r.amount), 0);
    const totalSavings  = savings.reduce((s, r)  => s + num(r.amount), 0);
    const monthlySurplus = totalIncome - totalExpenses - totalSavings;
    const m = Math.max(parseInt(months) || 1, 1);
    const projectedSaved = (totalSavings + Math.max(monthlySurplus, 0)) * m;

    // Category breakdown
    const byCategory = {};
    for (const row of expenses) {
      const a = num(row.amount);
      if (a > 0) byCategory[row.category] = (byCategory[row.category] || 0) + a;
    }
    const categoryList = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1]);

    return { totalIncome, totalExpenses, totalSavings, monthlySurplus, projectedSaved, categoryList, months: m };
  }, [income, expenses, savings, months]);

  // ── Excel export ──────────────────────────────────────────
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // ---- Summary sheet ----
    const summaryData = [
      ['Smart Money Method — Budget Summary'],
      [],
      ['Period', `${results.months} month${results.months !== 1 ? 's' : ''}`],
      [],
      ['MONTHLY OVERVIEW',         'Per Month',        `Over ${results.months} month(s)`],
      ['Total Income',              results.totalIncome,   results.totalIncome   * results.months],
      ['Total Expenses',            results.totalExpenses, results.totalExpenses * results.months],
      ['Savings Contributions',     results.totalSavings,  results.totalSavings  * results.months],
      ['Net Surplus / Deficit',     results.monthlySurplus, results.monthlySurplus * results.months],
      [],
      ['Projected Total Saved',     '',                 results.projectedSaved],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ---- Income sheet ----
    const incomeData = [
      ['INCOME', 'Monthly Amount'],
      ...income.filter(r => r.label || num(r.amount) > 0)
               .map(r => [r.label || '(unnamed)', num(r.amount)]),
      [],
      ['TOTAL', results.totalIncome],
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{ wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Income');

    // ---- Expenses sheet ----
    const expenseData = [
      ['EXPENSE ITEM', 'Category', 'Monthly Amount'],
      ...expenses.filter(r => r.label || num(r.amount) > 0)
                 .map(r => [r.label || '(unnamed)', r.category, num(r.amount)]),
      [],
      ['TOTAL', '', results.totalExpenses],
    ];
    const wsExpenses = XLSX.utils.aoa_to_sheet(expenseData);
    wsExpenses['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

    // ---- Savings sheet ----
    const savingsData = [
      ['SAVINGS GOAL', 'Monthly Amount', `Over ${results.months} Month(s)`],
      ...savings.filter(r => r.label || num(r.amount) > 0)
                .map(r => [r.label || '(unnamed)', num(r.amount), num(r.amount) * results.months]),
      [],
      ['TOTAL', results.totalSavings, results.totalSavings * results.months],
    ];
    const wsSavings = XLSX.utils.aoa_to_sheet(savingsData);
    wsSavings['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSavings, 'Savings');

    // ---- Category Breakdown sheet ----
    const catData = [
      ['EXPENSE CATEGORY', 'Monthly Amount', '% of Expenses'],
      ...results.categoryList.map(([cat, amt]) => [
        cat,
        amt,
        results.totalExpenses > 0
          ? `${((amt / results.totalExpenses) * 100).toFixed(1)}%`
          : '0%',
      ]),
    ];
    const wsCat = XLSX.utils.aoa_to_sheet(catData);
    wsCat['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'Category Breakdown');

    XLSX.writeFile(wb, `budget-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const surplusPositive = results.monthlySurplus >= 0;

  // Category bar colours
  const CAT_COLORS = [
    '#378ADD','#D4A017','#00C896','#F04E4E','#8B5CF6',
    '#F09A4E','#06B6D4','#EC4899','#84CC16','#6B7280',
  ];

  return (
    <div className="budget-page">
      {/* Header */}
      <div className="budget-header page-hero">
        <div className="section-eyebrow">Personal Finance</div>
        <h1 className="budget-title">Budget Planner</h1>
        <p className="budget-subtitle">
          Enter your monthly income, expenses and savings goals to see your net surplus and
          project how much you'll save over time. Export everything to Excel when you're done.
        </p>
      </div>

      <div className="budget-body">
        {/* ── LEFT COLUMN: inputs ── */}
        <div className="budget-inputs-col">

          {/* Months */}
          <div className="budget-card">
            <div className="budget-card-title">Projection Period</div>
            <div className="budget-months-row">
              <label className="budget-months-label">Number of months to project</label>
              <div className="budget-amount-wrap">
                <input
                  className="budget-input budget-input--amount"
                  type="number"
                  min="1"
                  max="360"
                  value={months}
                  onChange={e => setMonths(e.target.value)}
                  style={{ width: 80 }}
                />
                <span className="budget-suffix">months</span>
              </div>
              <div className="budget-month-presets">
                {[3, 6, 12, 24, 36].map(m => (
                  <button
                    key={m}
                    className={`budget-preset-btn${parseInt(months) === m ? ' active' : ''}`}
                    onClick={() => setMonths(String(m))}
                  >{m}mo</button>
                ))}
              </div>
            </div>
          </div>

          {/* Income */}
          <div className="budget-card">
            <SectionHeader title="💰 Income" onAdd={addIncome} />
            <div className="budget-rows">
              {income.map(r => (
                <IncomeRow
                  key={r.id} row={r}
                  onChange={updateRow(setIncome)}
                  onRemove={removeRow(setIncome)}
                />
              ))}
            </div>
            <div className="budget-card-total">
              <span>Monthly Total</span>
              <span className="budget-total-val income-col">${fmt(results.totalIncome)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="budget-card">
            <SectionHeader title="🧾 Expenses (Bills)" onAdd={addExpense} />
            <div className="budget-rows">
              {expenses.map(r => (
                <ExpenseRow
                  key={r.id} row={r}
                  onChange={updateRow(setExpenses)}
                  onRemove={removeRow(setExpenses)}
                />
              ))}
            </div>
            <div className="budget-card-total">
              <span>Monthly Total</span>
              <span className="budget-total-val expense-col">${fmt(results.totalExpenses)}</span>
            </div>
          </div>

          {/* Savings */}
          <div className="budget-card">
            <SectionHeader title="🏦 Savings Goals" onAdd={addSavings} />
            <div className="budget-rows">
              {savings.map(r => (
                <SavingsRow
                  key={r.id} row={r}
                  onChange={updateRow(setSavings)}
                  onRemove={removeRow(setSavings)}
                />
              ))}
            </div>
            <div className="budget-card-total">
              <span>Monthly Total</span>
              <span className="budget-total-val savings-col">${fmt(results.totalSavings)}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: results ── */}
        <div className="budget-results-col">

          {/* Summary cards */}
          <div className="budget-summary-grid">
            <div className="budget-summary-card">
              <div className="budget-summary-label">Monthly Income</div>
              <div className="budget-summary-val income-col">${fmt(results.totalIncome)}</div>
              <div className="budget-summary-sub">Total earnings per month</div>
            </div>
            <div className="budget-summary-card">
              <div className="budget-summary-label">Monthly Expenses</div>
              <div className="budget-summary-val expense-col">${fmt(results.totalExpenses)}</div>
              <div className="budget-summary-sub">Total bills per month</div>
            </div>
            <div className="budget-summary-card">
              <div className="budget-summary-label">Savings Contributions</div>
              <div className="budget-summary-val savings-col">${fmt(results.totalSavings)}</div>
              <div className="budget-summary-sub">Committed savings per month</div>
            </div>
            <div className={`budget-summary-card${surplusPositive ? ' surplus' : ' deficit'}`}>
              <div className="budget-summary-label">Monthly {surplusPositive ? 'Surplus' : 'Deficit'}</div>
              <div className={`budget-summary-val ${surplusPositive ? 'income-col' : 'expense-col'}`}>
                {surplusPositive ? '+' : ''}${fmt(results.monthlySurplus)}
              </div>
              <div className="budget-summary-sub">After expenses &amp; savings</div>
            </div>
          </div>

          {/* Projected savings banner */}
          <div className="budget-projection-banner">
            <div className="budget-projection-left">
              <div className="budget-projection-label">Projected Total Saved</div>
              <div className="budget-projection-sub">
                Over <strong>{results.months}</strong> month{results.months !== 1 ? 's' : ''} —
                includes savings contributions{surplusPositive ? ' + surplus' : ''}
              </div>
            </div>
            <div className="budget-projection-amount">${fmt(results.projectedSaved)}</div>
          </div>

          {/* Monthly income bar */}
          <div className="budget-bar-card">
            <div className="budget-bar-card-title">Monthly Income Allocation</div>
            {results.totalIncome > 0 ? (
              <>
                <div className="budget-alloc-bar">
                  {results.totalExpenses > 0 && (
                    <div
                      className="budget-alloc-seg expenses"
                      style={{ width: `${Math.min((results.totalExpenses / results.totalIncome) * 100, 100).toFixed(1)}%` }}
                      title={`Expenses ${((results.totalExpenses / results.totalIncome) * 100).toFixed(1)}%`}
                    />
                  )}
                  {results.totalSavings > 0 && (
                    <div
                      className="budget-alloc-seg savings"
                      style={{ width: `${Math.min((results.totalSavings / results.totalIncome) * 100, 100).toFixed(1)}%` }}
                      title={`Savings ${((results.totalSavings / results.totalIncome) * 100).toFixed(1)}%`}
                    />
                  )}
                  {results.monthlySurplus > 0 && (
                    <div
                      className="budget-alloc-seg surplus"
                      style={{ width: `${Math.min((results.monthlySurplus / results.totalIncome) * 100, 100).toFixed(1)}%` }}
                      title={`Surplus ${((results.monthlySurplus / results.totalIncome) * 100).toFixed(1)}%`}
                    />
                  )}
                </div>
                <div className="budget-alloc-legend">
                  {results.totalExpenses > 0 && (
                    <span><span className="budget-legend-dot expenses" />
                      Expenses ({((results.totalExpenses / results.totalIncome) * 100).toFixed(1)}%)
                    </span>
                  )}
                  {results.totalSavings > 0 && (
                    <span><span className="budget-legend-dot savings" />
                      Savings ({((results.totalSavings / results.totalIncome) * 100).toFixed(1)}%)
                    </span>
                  )}
                  {results.monthlySurplus > 0 && (
                    <span><span className="budget-legend-dot surplus" />
                      Surplus ({((results.monthlySurplus / results.totalIncome) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="budget-empty-note">Enter income to see allocation</div>
            )}
          </div>

          {/* Expense category breakdown */}
          {results.categoryList.length > 0 && (
            <div className="budget-bar-card">
              <div className="budget-bar-card-title">Expense Breakdown by Category</div>
              <div className="budget-cat-list">
                {results.categoryList.map(([cat, amt], i) => {
                  const pct = results.totalExpenses > 0
                    ? ((amt / results.totalExpenses) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={cat} className="budget-cat-row">
                      <div className="budget-cat-meta">
                        <span className="budget-cat-name">{cat}</span>
                        <span className="budget-cat-amt">${fmt(amt)}</span>
                        <span className="budget-cat-pct">{pct}%</span>
                      </div>
                      <div className="budget-cat-bar-track">
                        <div
                          className="budget-cat-bar-fill"
                          style={{ width: `${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* N-month projection table */}
          <div className="budget-bar-card">
            <div className="budget-bar-card-title">
              {results.months}-Month Projection
            </div>
            <div className="budget-proj-table">
              <div className="budget-proj-head">
                <span>Item</span>
                <span>Per Month</span>
                <span>Over {results.months} Month{results.months !== 1 ? 's' : ''}</span>
              </div>
              {[
                { label: 'Total Income',           val: results.totalIncome,    cls: 'income-col'  },
                { label: 'Total Expenses',          val: results.totalExpenses,  cls: 'expense-col' },
                { label: 'Savings Contributions',   val: results.totalSavings,   cls: 'savings-col' },
                { label: 'Net Surplus / Deficit',   val: results.monthlySurplus, cls: surplusPositive ? 'income-col' : 'expense-col', bold: true },
              ].map(row => (
                <div key={row.label} className={`budget-proj-row${row.bold ? ' bold' : ''}`}>
                  <span className="budget-proj-label">{row.label}</span>
                  <span className={`budget-proj-val ${row.cls}`}>
                    {row.val < 0 ? '-' : ''}${fmt(Math.abs(row.val))}
                  </span>
                  <span className={`budget-proj-val ${row.cls}`}>
                    {row.val < 0 ? '-' : ''}${fmt(Math.abs(row.val) * results.months)}
                  </span>
                </div>
              ))}
              <div className="budget-proj-divider" />
              <div className="budget-proj-row bold">
                <span className="budget-proj-label">Projected Total Saved</span>
                <span className="budget-proj-val savings-col">${fmt(results.projectedSaved / results.months)}</span>
                <span className="budget-proj-val savings-col highlight">${fmt(results.projectedSaved)}</span>
              </div>
            </div>
          </div>

          {/* Export button */}
          <button className="budget-export-btn" onClick={exportToExcel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Budget as Excel (.xlsx)
          </button>

          <p className="budget-disclaimer">
            All figures are estimates based on the values you entered. This tool does not store any data —
            everything stays in your browser. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
