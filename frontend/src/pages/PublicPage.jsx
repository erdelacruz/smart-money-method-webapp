import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Persist a visitor UUID in localStorage for backend tracking
// ---------------------------------------------------------------------------
function getOrCreateVisitorId() {
  const key = 'visitorId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const STOCKS = [
  { sym:'BHP', name:'BHP Group',               price:45.20,  chg:1.44,  pct:3.29,  vol:'8.2M',  cap:'$232B', sec:'Materials',  trend:[42,43,42.5,44,43.8,44.9,45.2] },
  { sym:'CBA', name:'Commonwealth Bank',        price:118.50, chg:1.24,  pct:1.06,  vol:'4.2M',  cap:'$198B', sec:'Financials', trend:[115,116,115.5,117,116.8,117.5,118.5] },
  { sym:'CSL', name:'CSL Limited',              price:285.00, chg:-2.10, pct:-0.73, vol:'1.1M',  cap:'$136B', sec:'Healthcare', trend:[290,288,289,287,286,286.5,285] },
  { sym:'NAB', name:'National Australia Bank',  price:35.80,  chg:0.45,  pct:1.27,  vol:'6.8M',  cap:'$112B', sec:'Financials', trend:[34.8,35,34.9,35.2,35.4,35.6,35.8] },
  { sym:'WES', name:'Wesfarmers',               price:72.50,  chg:-0.80, pct:-1.09, vol:'2.4M',  cap:'$82B',  sec:'Consumer',   trend:[74,73.5,73.8,73,72.8,72.6,72.5] },
  { sym:'FMG', name:'Fortescue',                price:22.80,  chg:0.95,  pct:4.35,  vol:'12.1M', cap:'$70B',  sec:'Materials',  trend:[21.2,21.5,21.8,22,22.3,22.6,22.8] },
  { sym:'MQG', name:'Macquarie Group',          price:195.00, chg:2.30,  pct:1.19,  vol:'890K',  cap:'$66B',  sec:'Financials', trend:[190,191,192,193,193.5,194,195] },
  { sym:'XRO', name:'Xero',                     price:142.00, chg:-1.50, pct:-1.05, vol:'560K',  cap:'$21B',  sec:'Technology', trend:[145,144,143.5,143,142.8,142.3,142] },
];

const TICKER_ITEMS = [
  { sym:'XJO', price:'7,842.30', chg:'+0.84%', up:true  },
  { sym:'BHP', price:'$45.20',   chg:'+3.29%', up:true  },
  { sym:'CBA', price:'$118.50',  chg:'+1.06%', up:true  },
  { sym:'CSL', price:'$285.00',  chg:'-0.73%', up:false },
  { sym:'FMG', price:'$22.80',   chg:'+4.35%', up:true  },
  { sym:'NAB', price:'$35.80',   chg:'+1.27%', up:true  },
  { sym:'WES', price:'$72.50',   chg:'-1.09%', up:false },
  { sym:'MQG', price:'$195.00',  chg:'+1.19%', up:true  },
  { sym:'TLS', price:'$4.25',    chg:'+0.24%', up:true  },
  { sym:'RIO', price:'$125.40',  chg:'+2.10%', up:true  },
  { sym:'WOW', price:'$38.90',   chg:'-0.51%', up:false },
  { sym:'QAN', price:'$8.45',    chg:'+1.80%', up:true  },
];

const FEATURES = [
  { icon:'📊', bg:'rgba(55,138,221,0.12)',  title:'TradingView Charts',            tag:'Embedded widget', desc:'Full interactive OHLC candlestick charts powered by TradingView. Access 100+ technical indicators, drawing tools, and multiple timeframes from 1 minute to monthly.' },
  { icon:'⚡', bg:'rgba(0,200,150,0.1)',    title:'Real-Time Quotes',              tag:'ASX live feed',   desc:'Live bid/ask spreads, last traded prices, volume and market depth for every ASX-listed security. Data refreshes every 15 seconds throughout the trading day.' },
  { icon:'🔍', bg:'rgba(239,159,39,0.1)',   title:'Stock Screener',               tag:'200+ filters',    desc:'Filter 2,200+ ASX stocks by sector, market cap, P/E ratio, dividend yield, 52-week performance and dozens of fundamental metrics to find your next opportunity.' },
  { icon:'💼', bg:'rgba(240,78,78,0.1)',    title:'Portfolio Tracker',             tag:'Multi-portfolio', desc:'Track your holdings, cost basis, unrealised gains and dividend income in one place. Import trades from your broker or enter them manually.' },
  { icon:'🔔', bg:'rgba(139,92,246,0.1)',   title:'Price Alerts',                  tag:'Instant notify',  desc:'Set price, volume and news alerts for any ASX stock. Get notified via email or push notification the moment your trigger is hit — even while markets are closed.' },
  { icon:'📰', bg:'rgba(20,200,200,0.1)',   title:'Market News & Announcements',   tag:'ASX feed',        desc:'Stream ASX company announcements, earnings reports and market news in real time. Filtered by your watchlist so you never miss a material disclosure.' },
];

const STEPS = [
  { n:'01', title:'Create your account',  desc:'Sign up free in under 60 seconds — no credit card, no broker required.' },
  { n:'02', title:'Build your watchlist', desc:'Search and add any ASX stock to your personalised watchlist for fast access.' },
  { n:'03', title:'Analyse with charts',  desc:'Open TradingView charts, apply indicators, and draw your own technical analysis.' },
  { n:'04', title:'Track your portfolio', desc:'Log your holdings and monitor performance, dividends and P&L in real time.' },
];

// ---------------------------------------------------------------------------
// Sparkline SVG for the market table
// ---------------------------------------------------------------------------
function Sparkline({ data }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const W = 60, H = 24;
  const pts = data.map((v, i) =>
    `${i * (W / (data.length - 1))},${H - ((v - min) / range) * (H - 4) + 2}`
  ).join(' ');
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg viewBox="0 0 60 24" style={{ width: 60, height: 24, display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points={pts} fill="none" stroke={isUp ? '#00C896' : '#F04E4E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PublicPage
// ---------------------------------------------------------------------------
export default function PublicPage() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab,    setActiveTab]    = useState('1W');

  // Record visit on mount — skip for logged-in admin users
  useEffect(() => {
    if (user) return;
    const visitorId = getOrCreateVisitorId();
    fetch('/api/stats/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    }).catch(() => console.warn('Could not record visit — is the backend running?'));
  }, [user]);

  const filteredStocks = STOCKS.filter(s =>
    activeFilter === 'All' ||
    s.sec === activeFilter ||
    (activeFilter === 'Tech' && s.sec === 'Technology')
  );

  return (
    <div>


      {/* ── HERO ────────────────────────────────────────────── */}
      <section>
        <div className="hero">
          <div className="hero-left">
            <div className="hero-badge">Australia's #1 money method</div>
            <h1>
              The financial toolkit<br />
              <em>every Australian needs.</em>
            </h1>
            <p className="hero-desc">
              Understand your take-home pay, build a bulletproof budget and savings, harness the power of compounding, and learn how to trade and invest — all in one smart platform.
            </p>
          </div>

          <div className="hero-visual">
            {/* Floating badge — top right */}
            <div className="mini-card" style={{ top: '-20px', right: '-10px' }}>
              <div className="mini-card-icon" style={{ background: 'rgba(0,200,150,0.12)' }}>💰</div>
              <div className="mini-card-text">
                <div className="mini-card-title">Interest earned</div>
                <div className="mini-card-sub">$14,283 over 5 yrs</div>
              </div>
            </div>

            {/* Savings growth chart card */}
            <div className="hero-chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-stock-name">Savings Growth</div>
                  <div className="chart-stock-sub">$500 / month · 5% p.a. interest</div>
                </div>
                <div className="chart-price-block">
                  <div className="chart-price">$44,283</div>
                  <div className="chart-change">▲ after 5 years</div>
                </div>
              </div>

              {/* Year labels row */}
              <div className="savings-chart-years">
                {['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5'].map(y => (
                  <span key={y}>{y}</span>
                ))}
              </div>

              {/* Stacked bar chart — contributions vs interest */}
              <div className="savings-chart-bars">
                {[
                  { contrib: 6000,  interest: 154   },
                  { contrib: 12000, interest: 618   },
                  { contrib: 18000, interest: 1400  },
                  { contrib: 24000, interest: 2510  },
                  { contrib: 30000, interest: 3871  },
                ].map((d, i) => {
                  const total   = d.contrib + d.interest;
                  const maxVal  = 33871;
                  const contPct = (d.contrib  / maxVal * 100).toFixed(1);
                  const intPct  = (d.interest / maxVal * 100).toFixed(1);
                  return (
                    <div key={i} className="savings-bar-col">
                      <div className="savings-bar-stack">
                        <div className="savings-bar-interest" style={{ height: `${intPct}%` }} />
                        <div className="savings-bar-contrib"  style={{ height: `${contPct}%` }} />
                      </div>
                      <div className="savings-bar-val">${(total/1000).toFixed(0)}K</div>
                    </div>
                  );
                })}
              </div>

              {/* Legend + summary stats */}
              <div className="savings-chart-footer">
                <div className="savings-chart-legend">
                  <span><span className="savings-dot contrib" />Contributions</span>
                  <span><span className="savings-dot interest" />Interest</span>
                </div>
                <div className="chart-mini-stats" style={{ marginTop: 0 }}>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Deposited</div>
                    <div className="chart-mini-stat-val">$30,000</div>
                  </div>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Interest</div>
                    <div className="chart-mini-stat-val" style={{ color:'var(--success)' }}>$14,283</div>
                  </div>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Rate</div>
                    <div className="chart-mini-stat-val">5% p.a.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge — bottom left */}
            <div className="mini-card" style={{ bottom: '-16px', left: '-10px' }}>
              <div className="mini-card-icon" style={{ background: 'rgba(212,160,23,0.12)' }}>🏦</div>
              <div className="mini-card-text">
                <div className="mini-card-title">Savings up 47.6%</div>
                <div className="mini-card-sub">vs. no interest</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── TOOLS ───────────────────────────────────────────── */}
      <section className="tools-section">
        <div className="section-eyebrow">Financial Tools</div>
        <h2 className="section-title">Tools to help you manage your money</h2>
        <div className="tools-grid">
          {[
            { icon:'📈', title:'Trading P/L Calculator',  href:'/calculator',             desc:'Calculate your profit or loss on any trade. Enter your entry price, exit price, quantity and brokerage to see your net return instantly.' },
            { icon:'💵', title:'Pay Calculator',           href:'/pay-calculator',         desc:'Work out your take-home pay after tax, Medicare levy and super contributions. Supports weekly, fortnightly and monthly pay cycles.' },
            { icon:'📋', title:'Budget Planner',           href:'/budget',                 desc:'Plan your monthly budget by tracking income and expenses across categories. Visualise where your money goes and find opportunities to save.' },
            { icon:'📊', title:'Compounding Calculator',   href:'/compounding-calculator', desc:'See the power of compound interest over time. Enter a starting amount, regular contributions, interest rate and time horizon to project your wealth.' },
            { icon:'📉', title:'DCA Calculator',           href:'/dca-calculator',         desc:'Simulate dollar cost averaging for any ASX stock. Enter regular contributions and see how your portfolio would have grown over time.' },
            { icon:'📊', title:'Chart & Screener',        href:'/charts',                 desc:'Live price charts and stock screener for ASX shares and Australian ETFs. Search any symbol and filter by market cap, price, and volume.' },
            { icon:'🕯️', title:'Trading Simulator',       href:'/trading-grounds',        desc:'Practice BUY & SELL on a live candlestick simulator with no real money. Add indicators, draw trend lines, and track your paper trading P&L.' },
          ].map(tool => (
            <div key={tool.title} className="tool-card">
              <div className="tool-icon">{tool.icon}</div>
              <div className="tool-title">{tool.title}</div>
              <div className="tool-desc">{tool.desc}</div>
              <Link to={tool.href} className="tool-btn">Open Tool →</Link>
            </div>
          ))}
        </div>
      </section>



    </div>
  );
}
