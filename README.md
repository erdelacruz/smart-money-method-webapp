# Smart Money Method Australia

Node.js + Express backend with JWT authentication and a Vite/React frontend.

## Quick Start

### 1. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Run the backend (Terminal 1)
```bash
cd backend
npm run dev        # uses nodemon for auto-restart
# or
npm start          # plain node
```
Backend runs on **http://localhost:5000**

### 3. Run the frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs on **http://localhost:5173**

---

## Admin credentials
| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

---

## Pages
| URL      | Access | Description |
|----------|--------|-------------|
| `/`      | Public | Landing page — visit is tracked automatically |
| `/login` | Public | Admin login form |
| `/admin` | Admin  | Visitor stats dashboard (requires login) |

## API Endpoints
| Method | Path                   | Auth     | Description |
|--------|------------------------|----------|-------------|
| POST   | `/api/auth/login`      | None     | Returns a JWT token |
| GET    | `/api/auth/me`         | Bearer   | Verify token / restore session |
| POST   | `/api/stats/visit`     | None     | Record a public page visit (fingerprint built server-side) |
| GET    | `/api/stats/visitors`  | Bearer   | Fetch visitor stats (admin) |

---

## Deployment (Vercel)

A `vercel.json` is included at the root. It builds the Vite frontend as a static site and routes `/api/*` requests to the Express backend as a serverless function.

**Required before deploying:**
1. Add `export default app;` at the bottom of `backend/server.js`
2. Set the `FRONTEND_URL` environment variable in Vercel to your deployed domain and update the CORS origin in `backend/server.js` accordingly
