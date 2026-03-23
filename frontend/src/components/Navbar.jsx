// ============================================================
// components/Navbar.jsx — Top navigation bar.
//
// Renders different links based on authentication state:
//   Logged out: Home | Login
//   Logged in:  Home | Admin Dashboard | Logout (username)
// ============================================================

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  // user: the logged-in user object or null
  // logout: function from AuthContext that clears auth state
  const { user, logout } = useAuth();

  // useNavigate returns a function that navigates programmatically.
  // Used here to redirect to /login after logging out.
  const navigate = useNavigate();

  // Handle logout button click
  const handleLogout = () => {
    logout();           // Clear state and localStorage token
    navigate('/login'); // Redirect to login page
  };

  return (
    <nav className="navbar">
      {/* Left side: brand + primary nav links */}
      <div className="nav-left">
        {/* App brand / home link */}
        <Link to="/" className="nav-brand">
          {/* Icon: dark rounded square with stock-chart line */}
          <svg width="36" height="36" viewBox="0 0 56 56" aria-hidden="true" style={{flexShrink:0}}>
            <rect width="56" height="56" rx="12" fill="#1A2235"/>
            <polyline points="10,40 20,24 30,30 46,12" fill="none" stroke="#378ADD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="46" cy="12" r="3.5" fill="#378ADD"/>
            <line x1="10" y1="46" x2="46" y2="46" stroke="#378ADD" strokeWidth="1" opacity="0.3"/>
          </svg>
          {/* Wordmark + tagline */}
          <div className="nav-brand-text">
            <span className="nav-brand-name">Trade<span className="nav-brand-asx">ASX</span></span>
            <span className="nav-brand-sub">Australian Stock Exchange</span>
          </div>
        </Link>

        {/* Primary links — always visible, grouped left */}
        <div className="nav-links nav-links-left">
          <Link to="/">Home</Link>
          <Link to="/indicators">Indicators</Link>
          <Link to="/calculator">P&amp;L Calculator</Link>
        </div>
      </div>

      {/* Right side: auth-related links */}
      <div className="nav-links">
        {user ? (
          // === Logged-in state ===
          <>
            {/* Link to the admin dashboard — only shown when authenticated */}
            <Link to="/admin">Admin Dashboard</Link>

            {/* Logout button — displays the username so the user knows who is logged in */}
            <button className="btn-logout" onClick={handleLogout}>
              Logout ({user.username})
            </button>
          </>
        ) : (
          // === Logged-out state ===
          <Link to="/login" className="nav-user-icon" aria-label="Login">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}
