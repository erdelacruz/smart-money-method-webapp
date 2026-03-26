// ============================================================
// routes/scores.js — Trading Grounds leaderboard
//
// Endpoints:
//   POST /api/scores/trading-grounds  — submit final score
//   GET  /api/scores/trading-grounds  — fetch top 20 leaderboard
// ============================================================

import express from 'express';
import { getDB } from '../db.js';

const router     = express.Router();
const COLLECTION = 'trading_grounds_score';
const TOP_N      = 10;

// ---------------------------------------------------------------------------
// POST /api/scores/trading-grounds
// Body: { name, totalProfitPct, totalAmount }
// Inserts score, then trims collection to top-20 by totalAmount.
// ---------------------------------------------------------------------------
router.post('/trading-grounds', async (req, res) => {
  try {
    const { name, totalProfitPct, totalAmount } = req.body;
    if (!name || totalAmount == null) return res.status(400).json({ error: 'name and totalAmount are required.' });

    const col = getDB().collection(COLLECTION);

    await col.insertOne({
      name:           String(name).trim().slice(0, 32),
      totalProfitPct: +Number(totalProfitPct).toFixed(2),
      totalAmount:    +Number(totalAmount).toFixed(2),
      playedAt:       new Date().toISOString(),
    });

    // Keep only top-N by totalAmount — remove the rest
    const all = await col.find({}).sort({ totalAmount: -1 }).toArray();
    if (all.length > TOP_N) {
      const idsToRemove = all.slice(TOP_N).map(s => s._id);
      await col.deleteMany({ _id: { $in: idsToRemove } });
    }

    res.json({ message: 'Score saved.' });
  } catch (err) {
    console.error('[scores/trading-grounds POST]', err.message);
    res.status(500).json({ error: 'Failed to save score.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/scores/trading-grounds
// Returns the top-20 leaderboard, ranked by totalAmount desc.
// ---------------------------------------------------------------------------
router.get('/trading-grounds', async (req, res) => {
  try {
    const scores = await getDB()
      .collection(COLLECTION)
      .find({}, { projection: { _id: 0 } })
      .sort({ totalAmount: -1 })
      .limit(TOP_N)
      .toArray();

    res.json({ scores });
  } catch (err) {
    console.error('[scores/trading-grounds GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

export default router;
