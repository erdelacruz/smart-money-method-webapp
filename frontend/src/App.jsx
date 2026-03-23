// ============================================================
// App.jsx — Root component: sets up routing and auth context.
//
// React Router v6 concepts used here:
//   BrowserRouter  — enables URL-based navigation using the History API
//   Routes         — container that renders the first matching <Route>
//   Route          — maps a URL path to a component
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext'; // Global auth state wrapper
import Navbar          from './components/Navbar';    // Navigation bar shown on every page
import ProtectedRoute  from './components/ProtectedRoute'; // Guards admin routes

import PublicPage            from './pages/PublicPage';            // Accessible by everyone
import LoginPage             from './pages/LoginPage';             // Login form for admins
import AdminPage             from './pages/AdminPage';             // Only accessible when authenticated
import TradingIndicatorPage  from './pages/TradingIndicatorPage';  // Trading indicators guide
import ProfitLossPage        from './pages/ProfitLossPage';         // Profit/Loss calculator

export default function App() {
  return (
    // AuthProvider wraps everything so every component in the tree can
    // call useAuth() to get user/token/login/logout
    <AuthProvider>
      {/* BrowserRouter enables client-side routing.
          It listens to the browser's URL bar and re-renders without full page reloads. */}
      <BrowserRouter>
        {/* Navbar sits outside Routes so it renders on every page */}
        <Navbar />

        <main className="main-content" style={{position:'relative',zIndex:1}}>
          <Routes>
            {/* Public route — no auth required, anyone can visit */}
            <Route path="/"       element={<PublicPage />} />

            {/* Login route — the form that issues a JWT on success */}
            <Route path="/login"  element={<LoginPage />} />

            {/* Admin route — wrapped in ProtectedRoute which redirects
                unauthenticated visitors to /login */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Trading Indicators educational guide */}
            <Route path="/indicators" element={<TradingIndicatorPage />} />

            {/* Profit/Loss Calculator */}
            <Route path="/calculator" element={<ProfitLossPage />} />

            {/* Catch-all: redirect any unknown URL back to the home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
