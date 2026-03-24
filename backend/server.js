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
import express from 'express';
import cors    from 'cors';

// Local module imports require the full file extension (.js) in ES modules.
// CommonJS (require) resolved extensions automatically; ES modules do not.
import authRoutes  from './routes/auth.js';   // POST /api/auth/login, GET /api/auth/me
import statsRoutes from './routes/stats.js';  // POST /api/stats/visit, GET /api/stats/visitors
import asxRoutes   from './routes/asx.js';    // GET /api/asx/search, GET /api/asx/prices

// Create an Express application instance — this is our server object
const app  = express();

// Define the port number the server will listen on
const PORT = 5000;

// ---------------------------------------------------------------------------
// MIDDLEWARE — runs on every request before it reaches a route handler
// ---------------------------------------------------------------------------

// Allow requests from the Vite dev server (http://localhost:5173).
// In production you'd replace the origin with your actual domain.
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Parse incoming JSON request bodies so req.body is available in route handlers
app.use(express.json());

// ---------------------------------------------------------------------------
// ROUTES — each router is mounted under a base path prefix
// ---------------------------------------------------------------------------

// Authentication routes: login, token verification
app.use('/api/auth', authRoutes);

// Visitor stats routes: record visits, fetch counts for admin
app.use('/api/stats', statsRoutes);

// ASX data routes: autocomplete search + historical prices (proxy to TipRanks)
app.use('/api/asx', asxRoutes);

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
