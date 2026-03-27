// ============================================================
// pages/AdminPage.jsx — Admin dashboard (protected route).
//
// Only renders when the user is authenticated (enforced by ProtectedRoute).
//
// Features:
//   - Fetches and displays live visitor stats from GET /api/stats/visitors
//   - Shows total visits, unique visitors, and recent visit timestamps
//   - Auto-refreshes every 10 seconds so stats stay current
//   - Manual "Refresh" button for on-demand updates
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
//
// X-axis: Jan → Dec (12 fixed bars)
// Y-axis: visit count per month, auto-scaled
// Features: horizontal grid, y/x axis labels, hover highlight + tooltip.
// Pure SVG + React state — no external charting library.
// ---------------------------------------------------------------------------
function VisitTimeline({ monthlyStats }) {
  const [hoverIdx, setHoverIdx] = React.useState(null);
  const svgRef = React.useRef(null);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const totalCounts  = monthlyStats.map(m => m.total);
  const uniqueCounts = monthlyStats.map(m => m.unique);
  const maxVal       = Math.max(...totalCounts, 1);

  // ── SVG layout constants ────────────────────────────────────────────────
  const W = 480, H = 215;
  const ML = 36, MR = 20, MT = 18, MB = 62; // extra bottom margin for legend
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const PAIR_W  = (PW / 12) * 0.27; // width of each bar in a pair
  const PAIR_GAP = 2.5;             // gap between the two bars in a pair
  const SLOT_W  = PW / 12;

  const slotCenter = i => ML + SLOT_W * i + SLOT_W / 2;
  const yAt        = v => MT + PH * (1 - v / maxVal);
  const AXIS_Y     = MT + PH;

  // ── Y-axis: 4 evenly spaced grid levels ────────────────────────────────
  const yLevels = [0, 1, 2, 3].map(i => Math.round((i / 3) * maxVal));

  // ── Mouse tracking → nearest slot ──────────────────────────────────────
  const onMouseMove = e => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) / rect.width * W;
    let near = 0, best = Infinity;
    totalCounts.forEach((_, i) => {
      const d = Math.abs(slotCenter(i) - mx);
      if (d < best) { best = d; near = i; }
    });
    setHoverIdx(near);
  };

  // Flip tooltip left when near right edge
  const tooltipX = idx => (slotCenter(idx) > W - 140 ? slotCenter(idx) - 132 : slotCenter(idx) + 10);

  // Legend row Y position (below x-axis labels)
  const LEGEND_Y = H - MB + 34;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* ── Horizontal grid lines + y-axis labels ── */}
      {yLevels.map((v, i) => (
        <g key={i}>
          <line x1={ML} y1={yAt(v)} x2={W - MR} y2={yAt(v)} stroke="#EBEEF3" strokeWidth="1" />
          <text x={ML - 7} y={yAt(v) + 4} fontSize="10" fill="#8A94A6" textAnchor="end">{v}</text>
        </g>
      ))}

      {/* ── Paired bars (total + unique) per month ── */}
      {MONTHS.map((_, i) => {
        const cx      = slotCenter(i);
        const isHover = hoverIdx === i;

        const totalH  = (totalCounts[i] / maxVal) * PH;
        const uniqueH = (uniqueCounts[i] / maxVal) * PH;

        return (
          <g key={i}>
            {/* Total visits — left bar */}
            <rect
              x={cx - PAIR_W - PAIR_GAP / 2}
              y={AXIS_Y - totalH}
              width={PAIR_W}
              height={totalH || 1}
              rx="2"
              fill={isHover ? '#185FA5' : '#378ADD'}
              fillOpacity={isHover ? 1 : 0.85}
            />
            {/* Unique visits — right bar */}
            <rect
              x={cx + PAIR_GAP / 2}
              y={AXIS_Y - uniqueH}
              width={PAIR_W}
              height={uniqueH || 1}
              rx="2"
              fill={isHover ? '#0D1117' : '#1A2235'}
              fillOpacity={isHover ? 1 : 0.75}
            />
          </g>
        );
      })}

      {/* ── X-axis month labels ── */}
      {MONTHS.map((label, i) => (
        <text key={i} x={slotCenter(i)} y={H - MB + 18} fontSize="9.5" fill="#8A94A6" textAnchor="middle">
          {label}
        </text>
      ))}

      {/* ── Legend ── */}
      <rect x={ML}      y={LEGEND_Y} width={10} height={10} rx="2" fill="#378ADD" fillOpacity="0.85" />
      <text x={ML + 14} y={LEGEND_Y + 9} fontSize="10" fill="#5A6478">Total Visits</text>
      <rect x={ML + 95} y={LEGEND_Y} width={10} height={10} rx="2" fill="#1A2235" fillOpacity="0.75" />
      <text x={ML + 109} y={LEGEND_Y + 9} fontSize="10" fill="#5A6478">Unique Visits</text>

      {/* ── Hover tooltip ── */}
      {hoverIdx !== null && (totalCounts[hoverIdx] > 0 || uniqueCounts[hoverIdx] > 0) && (() => {
        const tx     = tooltipX(hoverIdx);
        const barTop = yAt(totalCounts[hoverIdx] || 1);
        const ty     = (barTop + AXIS_Y) / 2 - 22;
        return (
          <>
            <rect x={tx} y={ty} width={122} height={42} rx="6"
              fill="white" stroke="#e2e8f0" strokeWidth="1"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.10))' }}
            />
            <text x={tx + 10} y={ty + 16} fontSize="10.5" fill="#378ADD" fontWeight="700">
              {MONTHS[hoverIdx]}: {totalCounts[hoverIdx]} visits
            </text>
            <text x={tx + 10} y={ty + 32} fontSize="10.5" fill="#1A2235" fontWeight="700">
              {uniqueCounts[hoverIdx]} unique
            </text>
          </>
        );
      })()}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// BreakdownBars — horizontal bar chart from pre-aggregated { label: count } map.
// ---------------------------------------------------------------------------
function BreakdownBars({ statsMap }) {
  const entries = Object.entries(statsMap || {}).sort((a, b) => b[1] - a[1]);
  const max     = entries[0]?.[1] || 1;

  if (!entries.length) return <p style={{ fontSize: '.8rem', color: '#8A94A6' }}>No data yet.</p>;

  return (
    <div className="breakdown-bars">
      {entries.map(([label, count]) => (
        <div key={label} className="breakdown-row">
          <span className="breakdown-label" title={label}>{label}</span>
          <div className="breakdown-track">
            <div className="breakdown-fill" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="breakdown-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  // Read the logged-in user info and the JWT token from global auth state
  const { user, token } = useAuth();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'stats');

  // Blog state
  const [blogPosts,     setBlogPosts]     = useState([]);
  const [blogLoading,   setBlogLoading]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, title }

  // stats: the visitor data object returned by the backend, or null before first fetch
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);  // True while fetching
  const [error,   setError]   = useState('');     // Error message if fetch fails

  // ---------------------------------------------------------------------------
  // fetchStats — calls the protected GET /api/stats/visitors endpoint.
  //
  // useCallback memoizes the function so it doesn't get recreated on every render.
  // This matters because we pass fetchStats to useEffect's dependency array;
  // without useCallback it would cause an infinite re-render loop.
  // ---------------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/visitors', {
        headers: {
          // Send the JWT in the Authorization header — the backend's verifyToken
          // middleware reads this to confirm the user is authenticated.
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Unauthorized'); // 401 if token expired

      const data = await res.json();
      setStats(data);   // Update stats state — triggers a re-render of the UI
      setError('');     // Clear any previous error
    } catch {
      setError('Failed to load visitor stats. Please refresh.');
    } finally {
      setLoading(false); // Hide the loading indicator
    }
  }, [token]); // Re-create this function only if the token changes

  // ---------------------------------------------------------------------------
  // Initial fetch + auto-refresh every 10 seconds.
  //
  // setInterval schedules fetchStats to run repeatedly.
  // The cleanup function (returned from useEffect) calls clearInterval when
  // the component unmounts, preventing memory leaks and stale updates.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchStats(); // Fetch immediately on mount

    // Schedule auto-refresh every 10 000 ms (10 seconds)
    const interval = setInterval(fetchStats, 10000);

    // Cleanup: stop the interval when the component unmounts (e.g. user navigates away)
    return () => clearInterval(interval);
  }, [fetchStats]); // Re-run if fetchStats changes (i.e. if the token changes)

  // Fetch blog posts when Content tab is active
  useEffect(() => {
    if (activeTab !== 'content') return;
    setBlogLoading(true);
    fetch('/api/blog/admin/all', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setBlogPosts(data.posts || []); setBlogLoading(false); })
      .catch(() => setBlogLoading(false));
  }, [activeTab, token]);

  const deletePost = async (id, title) => {
    setConfirmDelete({ id, title });
  };

  const confirmDeletePost = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/blog/${confirmDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setBlogPosts(posts => posts.filter(p => p._id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="admin-page">

      {/* ── Hero Banner ── */}
      <div className="admin-hero page-hero">
        <div className="section-eyebrow">Administration</div>
        <h1 className="admin-hero-title">Admin Dashboard</h1>
        <p className="admin-hero-sub">Welcome back, <strong>{user?.username}</strong></p>
      </div>

      <div className="admin-body">

      {/* ── Tab bar ── */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === 'stats' ? ' active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Analytics
        </button>
        <button
          className={`admin-tab${activeTab === 'content' ? ' active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          ✍️ Content
        </button>
      </div>

      {/* Manual refresh button — useful when the admin wants instant stats */}
      {activeTab === 'stats' && (
      <button className="btn-primary refresh-btn" onClick={fetchStats}>
        Refresh Stats
      </button>
      )}

      {/* ── Content tab ── */}
      {activeTab === 'content' && (
        <div className="blog-admin-panel">
          <div className="blog-admin-toolbar">
            <h2>Blog Posts</h2>
            <Link to="/admin/blog/new" className="btn-primary">+ New Post</Link>
          </div>

          {blogLoading && <p className="loading-text">Loading posts…</p>}

          {!blogLoading && blogPosts.length === 0 && (
            <div className="blog-empty">
              <p>No posts yet. <Link to="/admin/blog/new">Create your first post →</Link></p>
            </div>
          )}

          {!blogLoading && blogPosts.length > 0 && (
            <div className="blog-admin-table-wrap">
              <table className="blog-admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map(post => (
                    <tr key={post._id}>
                      <td className="blog-table-title">{post.title}</td>
                      <td>{post.category}</td>
                      <td>
                        <span className={`blog-status-badge ${post.published ? 'published' : 'draft'}`}>
                          {post.published ? '🟢 Published' : '⚪ Draft'}
                        </span>
                      </td>
                      <td className="blog-table-date">
                        {new Date(post.createdAt).toLocaleDateString('en-AU')}
                      </td>
                      <td className="blog-table-actions">
                        <Link to={`/admin/blog/edit/${post._id}`} className="blog-action-btn" aria-label={`Edit "${post.title}"`}>Edit</Link>
                        {post.published && (
                          <Link to={`/learn/${post.slug}`} target="_blank" className="blog-action-btn" aria-label={`View "${post.title}"`}>View</Link>
                        )}
                        <button
                          className="blog-action-btn danger"
                          onClick={() => deletePost(post._id, post.title)}
                          aria-label={`Delete "${post.title}"`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Graph Dashboard ────────────────────────────────────────────────
          Rendered as soon as we have at least one visit to display.
          Four panels: activity timeline + three breakdown bar charts.
          All charts are pure SVG / CSS — no external library required.
      ──────────────────────────────────────────────────────────────────── */}
      {activeTab === 'stats' && stats && stats.monthlyStats && stats.uniqueVisitors > 0 && (
        <div className="charts-section">
          {/* KPI cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.totalVisits}</span>
              <span className="stat-label">Total Visits</span>
              <p className="stat-desc">Every load of the public page, including return visitors.</p>
            </div>
            <div className="stat-card highlight">
              <span className="stat-number">{stats.uniqueVisitors}</span>
              <span className="stat-label">Unique Visitors</span>
              <p className="stat-desc">Distinct browsers that have visited the public page.</p>
            </div>
            <div className="stat-card">
              <span className="stat-number">
                {stats.uniqueVisitors > 0 ? (stats.totalVisits / stats.uniqueVisitors).toFixed(1) : '0'}
              </span>
              <span className="stat-label">Visits / Visitor</span>
              <p className="stat-desc">Average number of times each unique visitor has loaded the page.</p>
            </div>
          </div>

          <div className="charts-grid">

            {/* Visit Activity — smooth dual-line chart over bucketed time slots */}
            <div className="chart-card chart-card--wide">
              <p className="chart-title">Visit Activity</p>
              <VisitTimeline monthlyStats={stats.monthlyStats} />
            </div>

            {/* Browser breakdown */}
            <div className="chart-card">
              <p className="chart-title">Browsers</p>
              <BreakdownBars statsMap={stats.browserStats} />
            </div>

            {/* OS breakdown */}
            <div className="chart-card">
              <p className="chart-title">Operating Systems</p>
              <BreakdownBars statsMap={stats.osStats} />
            </div>

            {/* Country breakdown */}
            <div className="chart-card">
              <p className="chart-title">Countries</p>
              <BreakdownBars statsMap={stats.countryStats} />
            </div>

          </div>
        </div>
      )}

      {/* Show loading text on the very first load (before stats arrive) */}
      {activeTab === 'stats' && loading && !stats && <p className="loading-text">Loading stats…</p>}

      {/* Error banner — shown when the fetch fails */}
      {activeTab === 'stats' && error && <p className="error-banner">{error}</p>}

      {/* Stats section — only rendered once we have data */}
      {activeTab === 'stats' && stats && (
        <>
          {/* Recent activity feed */}
          <div className="recent-visits">
            <h2>All Unique Visitors ({stats.recentVisits.length})</h2>
            {stats.recentVisits.length === 0 ? (
              <p className="no-data">No visits recorded yet. Go visit the public page!</p>
            ) : (
              <ul className="visit-list">
                {/*
                  Each item in recentVisits is now an object:
                  { timestamp, os, browser, country }
                  Previously it was just a plain timestamp string.
                */}
                {stats.recentVisits.map((visit, index) => (
                  <li key={index} className="visit-item">
                    <span className="visit-icon">👤</span>

                    <div className="visit-details">
                      <div className="visit-time-row">
                        <span className="visit-time">
                          First seen: {new Date(visit.firstSeen).toLocaleString()}
                        </span>
                        <span className="visit-time visit-lastseen">
                          Last seen: {new Date(visit.lastSeen).toLocaleString()}
                        </span>
                      </div>

                      <div className="visit-meta">
                        <span className="meta-chip">
                          <span className="meta-icon">🖥️</span>
                          {visit.os || 'Unknown OS'}
                        </span>
                        <span className="meta-chip">
                          <span className="meta-icon">🌐</span>
                          {visit.browser || 'Unknown Browser'}
                        </span>
                        <span className="meta-chip">
                          <span className="meta-icon">📍</span>
                          {visit.country || 'Unknown'}
                        </span>
                        <span className="meta-chip">
                          <span className="meta-icon">🕐</span>
                          {visit.timezone || 'N/A'}
                        </span>
                        <span className="meta-chip meta-chip--visits">
                          <span className="meta-icon">🔁</span>
                          {visit.visitCount} {visit.visitCount === 1 ? 'visit' : 'visits'}
                        </span>
                      </div>
                    </div>

                    {index === 0 && <span className="badge-new">Latest</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Auto-refresh notice */}
          <p className="auto-refresh-note">
            Stats auto-refresh every 10 seconds.
          </p>
        </>
      )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '32px 28px', maxWidth: 420, width: '90%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 36, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
              Delete Post?
            </h3>
            <p style={{ margin: 0, fontSize: '.9rem', color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6 }}>
              You are about to permanently delete<br />
              <strong style={{ color: 'var(--text)' }}>"{confirmDelete.title}"</strong>.<br />
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontWeight: 600,
                fontSize: '.9rem', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button onClick={confirmDeletePost} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: '#E53E3E', color: '#fff', fontWeight: 700,
                fontSize: '.9rem', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
