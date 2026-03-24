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

import { AuthProvider }  from './context/AuthContext';  // Global auth state wrapper
import { ThemeProvider } from './context/ThemeContext'; // Light / dark theme
import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import ProtectedRoute  from './components/ProtectedRoute';

import PublicPage            from './pages/PublicPage';            // Accessible by everyone
import LoginPage             from './pages/LoginPage';             // Login form for admins
import AdminPage             from './pages/AdminPage';             // Only accessible when authenticated
import TradingIndicatorPage  from './pages/TradingIndicatorPage';  // Trading indicators guide
import ProfitLossPage        from './pages/ProfitLossPage';         // Profit/Loss calculator
import PayCalculatorPage          from './pages/PayCalculatorPage';           // Australian Pay Calculator
import CompoundingCalculatorPage  from './pages/CompoundingCalculatorPage';  // Money Compounding Calculator
import BudgetToolPage            from './pages/BudgetToolPage';              // Budget Planner
import DCACalculatorPage         from './pages/DCACalculatorPage';           // Dollar Cost Averaging Calculator
import ASXPriceChartPage        from './pages/ASXPriceChartPage';            // Live ASX Price Chart
import ScreenerPage             from './pages/ScreenerPage';                  // ASX Stock Screener

export default function App() {
  return (
    // AuthProvider wraps everything so every component in the tree can
    // call useAuth() to get user/token/login/logout
    <ThemeProvider>
    <AuthProvider>
      {/* BrowserRouter enables client-side routing.
          It listens to the browser's URL bar and re-renders without full page reloads. */}
      <BrowserRouter>
        {/* Navbar sits outside Routes so it renders on every page */}
        <Navbar />

        <main className="main-content" style={{position:'relative',zIndex:1}}>
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
            <Route path="/indicators"             element={<TradingIndicatorPage />} />
            <Route path="/calculator"             element={<ProfitLossPage />} />
            <Route path="/pay-calculator"         element={<PayCalculatorPage />} />
            <Route path="/compounding-calculator" element={<CompoundingCalculatorPage />} />
            <Route path="/budget"                 element={<BudgetToolPage />} />
            <Route path="/dca-calculator"         element={<DCACalculatorPage />} />
            <Route path="/asx-chart"              element={<ASXPriceChartPage />} />
            <Route path="/screener"               element={<ScreenerPage />} />
            <Route path="*"                       element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
