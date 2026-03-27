import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth }  from '../context/AuthContext';

export default function Footer() {
  const { theme } = useTheme();
  const { user }  = useAuth();

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <svg width="32" height="32" viewBox="0 0 40 40">
              <rect width="40" height="40" rx="10" fill={theme === 'light' ? '#1C3553' : '#1A2838'}/>
              <circle cx="20" cy="20" r="13" fill="none" stroke="#D4A017" strokeWidth="1.5"/>
              <circle cx="20" cy="20" r="9" fill="#D4A017" opacity="0.15"/>
              <line x1="20" y1="26" x2="20" y2="15" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M16 19 L20 15 L24 19" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="15.5" y1="22" x2="24.5" y2="22" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
              <line x1="15.5" y1="25" x2="24.5" y2="25" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
            </svg>
            <div className="footer-brand-name">Smart Money <span>Method</span></div>
          </div>
          <div className="footer-brand-desc">A complete suite of financial tools designed for Australians — model your income, plan your budget, simulate investment strategies, and trade with confidence, all in one platform.</div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Smart Money Method Australia. All rights reserved.</span>
        <div className="footer-legal">
          <a href="#privacy-policy" className="footer-link" aria-label="Privacy Policy (coming soon)">Privacy Policy</a>
          <a href="#terms-of-service" className="footer-link" aria-label="Terms of Service (coming soon)">Terms of Service</a>
          <a href="#disclaimer" className="footer-link" aria-label="Disclaimer (coming soon)">Disclaimer</a>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span>Data provided for informational purposes only.</span>
          {!user && (
            <Link to="/login" className="footer-login-icon" aria-label="Login">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
