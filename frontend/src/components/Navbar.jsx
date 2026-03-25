// ============================================================
// components/Navbar.jsx — Top navigation bar.
//
// Renders different links based on authentication state:
//   Logged out: Home | Login
//   Logged in:  Home | Admin Dashboard | Logout (username)
// ============================================================

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null); // 'investing' | 'trading' | null
  const closeTimer = useRef(null);

  const openDropdown  = (name) => { clearTimeout(closeTimer.current); setOpenMenu(name); };
  const closeDropdown = ()     => { closeTimer.current = setTimeout(() => setOpenMenu(null), 120); };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      {/* Left side: brand + primary nav links */}
      <div className="nav-left">
        <Link to="/" className="nav-brand">
          <svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true" style={{flexShrink:0}}>
            <rect width="40" height="40" rx="10" fill={theme === 'light' ? '#1C3553' : '#1A2838'}/>
            <circle cx="20" cy="20" r="13" fill="none" stroke="#D4A017" strokeWidth="1.5"/>
            <circle cx="20" cy="20" r="9" fill="#D4A017" opacity={theme === 'light' ? '0.25' : '0.15'}/>
            <line x1="20" y1="26" x2="20" y2="15" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M16 19 L20 15 L24 19" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="15.5" y1="22" x2="24.5" y2="22" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.8"/>
            <line x1="15.5" y1="25" x2="24.5" y2="25" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.8"/>
          </svg>
          <div className="nav-brand-text">
            <span className="nav-brand-name">Smart Money <span className="nav-brand-asx">Method</span></span>
            <span className="nav-brand-sub">Australia</span>
          </div>
        </Link>

        <div className="nav-links nav-links-left">
          <Link to="/">Home</Link>

          {/* Share/ETF Investing dropdown */}
          <div
            className={`nav-dropdown${openMenu === 'investing' ? ' open' : ''}`}
            onMouseEnter={() => openDropdown('investing')}
            onMouseLeave={closeDropdown}
          >
            <button className="nav-dropdown-trigger">
              Share & ETF Investing
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{marginLeft:4}}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {openMenu === 'investing' && (
              <div className="nav-dropdown-menu" onMouseEnter={() => openDropdown('investing')} onMouseLeave={closeDropdown}>
                <Link to="/dca-calculator" className="nav-dropdown-item" onClick={() => setOpenMenu(null)}>
                  <span className="nav-dropdown-icon">📉</span>
                  <div>
                    <div className="nav-dropdown-label">Dollar Cost Averaging</div>
                    <div className="nav-dropdown-sub">Simulate DCA Method for any ASX stock and ETF Funds</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Share Trading dropdown */}
          <div
            className={`nav-dropdown${openMenu === 'trading' ? ' open' : ''}`}
            onMouseEnter={() => openDropdown('trading')}
            onMouseLeave={closeDropdown}
          >
            <button className="nav-dropdown-trigger">
              Share Trading
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{marginLeft:4}}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {openMenu === 'trading' && (
              <div className="nav-dropdown-menu" onMouseEnter={() => openDropdown('trading')} onMouseLeave={closeDropdown}>
                <Link to="/indicators" className="nav-dropdown-item" onClick={() => setOpenMenu(null)}>
                  <span className="nav-dropdown-icon">📊</span>
                  <div>
                    <div className="nav-dropdown-label">Technical Indicators</div>
                    <div className="nav-dropdown-sub">Price Action Analysis using Moving Average (MA), Darvas Box, RSI & Fibonacci Retracement</div>
                  </div>
                </Link>
                <Link to="/calculator" className="nav-dropdown-item" onClick={() => setOpenMenu(null)}>
                  <span className="nav-dropdown-icon">📈</span>
                  <div>
                    <div className="nav-dropdown-label">P/L Calculator</div>
                    <div className="nav-dropdown-sub">Calculate your Trading Profit & Loss</div>
                  </div>
                </Link>
                <Link to="/trading-grounds" className="nav-dropdown-item" onClick={() => setOpenMenu(null)}>
                  <span className="nav-dropdown-icon">🎯</span>
                  <div>
                    <div className="nav-dropdown-label">Trading Grounds</div>
                    <div className="nav-dropdown-sub">Simulate BUY & SELL on a live candlestick chart</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Link to="/charts">Chart &amp; Screener</Link>
          <Link to="/pay-calculator">Pay Calculator</Link>
          <Link to="/compounding-calculator">Compounding Calculator</Link>
          <Link to="/budget">Budget Planner</Link>
        </div>
      </div>

      {/* Right side: theme toggle + auth */}
      <div className="nav-links">
        {/* Theme toggle */}
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            /* Sun icon — switch to light */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Moon icon — switch to dark */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
            </svg>
          )}
        </button>
        {user && (
          <>
            <Link to="/admin">Admin Dashboard</Link>
            <button className="btn-logout" onClick={handleLogout}>
              Logout ({user.username})
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
