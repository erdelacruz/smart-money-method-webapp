// ============================================================
// App.jsx — Root component: sets up routing and auth context.
//
// React Router v6 concepts used here:
//   BrowserRouter  — enables URL-based navigation using the History API
//   Routes         — container that renders the first matching <Route>
//   Route          — maps a URL path to a component
//
// ChartsPage is rendered outside <Routes> and kept always mounted so
// the TradingView screener iframe is never destroyed — preserving filters
// when the user navigates to other pages and comes back.
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import ProtectedRoute  from './components/ProtectedRoute';
import AdBanner        from './components/AdBanner';

import PublicPage            from './pages/PublicPage';
import LoginPage             from './pages/LoginPage';
import AdminPage             from './pages/AdminPage';
import ProfitLossPage        from './pages/ProfitLossPage';
import PayCalculatorPage          from './pages/PayCalculatorPage';
import CompoundingCalculatorPage  from './pages/CompoundingCalculatorPage';
import BudgetToolPage            from './pages/BudgetToolPage';
import DCACalculatorPage         from './pages/DCACalculatorPage';
import ChartsPage               from './pages/ChartsPage';
import TradingGroundsPage       from './pages/TradingGroundsPage';
import BacktestingPage          from './pages/BacktestingPage';
import BlogListPage             from './pages/BlogListPage';
import BlogPostPage             from './pages/BlogPostPage';
import BlogEditorPage           from './pages/BlogEditorPage';

// ---------------------------------------------------------------------------
// Inner app — needs useLocation so must live inside BrowserRouter
// ---------------------------------------------------------------------------
function AppInner() {
  const location = useLocation();
  const isCharts = location.pathname === '/charts';
  const hideAds  = location.pathname === '/login'
    || location.pathname === '/admin'
    || location.pathname.startsWith('/admin/');

  return (
    <>
      <Navbar />

      {/* ChartsPage is always mounted (never unmounted) so the TradingView
          screener iframe stays alive and preserves filter state across
          navigation. CSS display controls visibility. */}
      <div style={{ display: isCharts ? 'block' : 'none' }}>
        <ChartsPage isVisible={isCharts} />
      </div>

      <main
        className="main-content"
        style={{ position: 'relative', zIndex: 1, display: isCharts ? 'none' : 'block' }}
      >
        <Routes>
          <Route path="/"       element={<PublicPage />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/calculator"             element={<ProfitLossPage />} />
          <Route path="/pay-calculator"         element={<PayCalculatorPage />} />
          <Route path="/compounding-calculator" element={<CompoundingCalculatorPage />} />
          <Route path="/budget"                 element={<BudgetToolPage />} />
          <Route path="/dca-calculator"         element={<DCACalculatorPage />} />
          <Route path="/trading-grounds"        element={<TradingGroundsPage />} />
          <Route path="/backtesting"            element={<BacktestingPage />} />
          <Route path="/learn"                       element={<Navigate to="/learn/blog" replace />} />
          <Route path="/learn/trading-strategy"  element={<BlogListPage type="Trading Strategy" />} />
          <Route path="/learn/investing-strategy" element={<BlogListPage type="Investing Strategy" />} />
          <Route path="/learn/blog"              element={<BlogListPage type="Blog" />} />
          <Route path="/learn/:slug"             element={<BlogPostPage />} />
          <Route
            path="/admin/blog/new"
            element={
              <ProtectedRoute>
                <BlogEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/blog/edit/:id"
            element={
              <ProtectedRoute>
                <BlogEditorPage />
              </ProtectedRoute>
            }
          />
          {/* Charts route: handled by always-mounted ChartsPage above */}
          <Route path="/charts"                 element={null} />
          {/* Legacy redirects */}
          <Route path="/asx-chart"              element={<Navigate to="/charts" replace />} />
          <Route path="/screener"               element={<Navigate to="/charts" replace />} />
          <Route path="*"                       element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideAds && (
        <AdBanner
          adSlot="1823951895"
          adFormat="horizontal"
        />
      )}

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
