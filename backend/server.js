// ============================================================
// server.js — Entry point for the Node.js Foundation Web App backend.
// Responsibilities:
//   1. Configure Express middleware (CORS, JSON parsing)
//   2. Mount route handlers for auth and stats
//   3. Start the HTTP server
// ============================================================

// ES module import syntax — replaces CommonJS require().
// "import X from 'pkg'" is the ES module equivalent of "const X = require('pkg')".
// The "type": "module" field in package.json tells Node to treat all .js files
// in this package as ES modules, enabling this syntax.
import 'dotenv/config';
import express from 'express';
import cors    from 'cors';

import { connectDB } from './db.js';
import authRoutes    from './routes/auth.js';
import statsRoutes   from './routes/stats.js';
import asxRoutes     from './routes/asx.js';
import scoresRoutes  from './routes/scores.js';

const app  = express();
const PORT = 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth',   authRoutes);
app.use('/api/stats',  statsRoutes);
app.use('/api/asx',    asxRoutes);
app.use('/api/scores', scoresRoutes);

// Connect to MongoDB Atlas then start listening
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
