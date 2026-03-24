// ============================================================
// routes/asx.js — ASX data routes (mock data)
//
// Endpoints:
//   GET /api/asx/search?q=<ASX_CODE>
//       → Autocomplete search, returns only ASX-listed tickers
//
//   GET /api/asx/prices?ticker=<ASX_CODE>&from=YYYY-MM&to=YYYY-MM
//       → Historical monthly close prices for a given date range
//       → Only BHP is supported in the current mock dataset
// ============================================================

import express   from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR  = join(__dirname, '../mock');

// Load mock datasets once at startup
const { stocks: ASX_STOCKS } = JSON.parse(readFileSync(join(MOCK_DIR, 'asx-search.json'), 'utf8'));
const { prices: BHP_PRICES  } = JSON.parse(readFileSync(join(MOCK_DIR, 'bhp-prices.json'),  'utf8'));

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/asx/search?q=BHP
// Filters the mock stock list by ticker or company name prefix.
// ---------------------------------------------------------------------------
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim().toUpperCase();
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });

  const results = ASX_STOCKS
    .filter(s =>
      s.ticker.toUpperCase().includes(q) ||
      s.companyName.toUpperCase().includes(q)
    )
    .slice(0, 8)
    .map(s => ({
      ticker: s.ticker,
      name:   s.companyName,
      market: s.market,
      type:   s.type,
    }));

  return res.json({ results });
});

// ---------------------------------------------------------------------------
// GET /api/asx/prices?ticker=BHP&from=2020-01&to=2025-12
//
// Returns one data point per month (last trading day close) within [from, to].
// Only BHP is available in the current mock dataset.
//
// Response shape:
//   { ticker, from, to, prices: [ { year, month, date, close }, ... ] }
// ---------------------------------------------------------------------------
router.get('/prices', (req, res) => {
  const ticker = (req.query.ticker || '').trim().toUpperCase();
  const from   = (req.query.from   || '').trim(); // "YYYY-MM"
  const to     = (req.query.to     || '').trim(); // "YYYY-MM"

  if (!ticker) return res.status(400).json({ error: 'Query parameter "ticker" is required.' });
  if (!from || !to) return res.status(400).json({ error: 'Query parameters "from" and "to" (YYYY-MM) are required.' });

  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear,   toMonth  ] = to.split('-').map(Number);

  if (!fromYear || !fromMonth || !toYear || !toMonth) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM.' });
  }

  // Only BHP is mocked — other tickers return 404
  if (ticker !== 'BHP') {
    return res.status(404).json({ error: `No mock price data available for ${ticker}. Only BHP is supported.` });
  }

  // Build a map: "YYYY-MM" → last close seen in that month (iterating chronologically)
  const monthMap = new Map();
  for (const p of BHP_PRICES) {
    const [y, m] = p.date.split('-').map(Number);
    if (!y || !m) continue;

    // Filter to requested range
    if (y < fromYear || (y === fromYear && m < fromMonth)) continue;
    if (y > toYear   || (y === toYear   && m > toMonth))   continue;

    monthMap.set(`${y}-${String(m).padStart(2, '0')}`, {
      year:  y,
      month: m,
      date:  p.date,
      close: +p.close,
    });
  }

  const prices = Array.from(monthMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  if (!prices.length) {
    return res.status(404).json({
      error: `No price data for ${ticker} in the requested range (${from} – ${to}).`,
    });
  }

  return res.json({ ticker, from, to, prices });
});

export default router;
