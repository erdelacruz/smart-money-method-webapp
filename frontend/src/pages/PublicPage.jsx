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
// Hero trading chart — mini candlestick data (BHP.AX paper trade)
// ---------------------------------------------------------------------------
const TRADE_CANDLES = [
  {o:112.20,h:113.10,l:111.80,c:112.90},{o:112.90,h:113.80,l:112.50,c:113.50},
  {o:113.50,h:113.90,l:112.80,c:113.10},{o:113.10,h:114.20,l:112.90,c:114.00},
  {o:114.00,h:114.80,l:113.60,c:114.60},{o:114.60,h:115.40,l:114.20,c:115.10},
  {o:115.10,h:115.30,l:114.20,c:114.50},{o:114.50,h:115.20,l:114.10,c:115.00},
  {o:115.00,h:116.00,l:114.80,c:115.70},{o:115.70,h:116.80,l:115.40,c:116.50},
  {o:116.50,h:117.60,l:116.20,c:117.20},{o:117.20,h:117.80,l:116.50,c:116.90},
  {o:116.90,h:117.50,l:116.60,c:117.10},{o:117.10,h:118.60,l:116.90,c:118.50},
];

function TradingMiniChart({ candles }) {
  const W = 260, H = 100;
  const PAD = { l: 4, r: 4, t: 6, b: 6 };
  const cw = W - PAD.l - PAD.r, ch = H - PAD.t - PAD.b;
  const allP = candles.flatMap(c => [c.h, c.l]);
  const min = Math.min(...allP), max = Math.max(...allP), range = max - min || 1;
  const n = candles.length, slotW = cw / n, bodyW = slotW * 0.55;
  const yOf = v => PAD.t + ch - ((v - min) / range) * ch;
  const cx  = i => PAD.l + i * slotW + slotW / 2;
  const sma = candles.map((_, i) => {
    if (i < 4) return null;
    const avg = candles.slice(i - 4, i + 1).reduce((s, c) => s + c.c, 0) / 5;
    return `${i === 4 ? 'M' : 'L'}${cx(i)},${yOf(avg)}`;
  }).filter(Boolean).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', minHeight: 100 }}>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={PAD.l} y1={PAD.t + ch * (1 - t)} x2={W - PAD.r} y2={PAD.t + ch * (1 - t)}
          stroke="rgba(138,155,176,0.15)" strokeWidth="0.8" />
      ))}
      <path d={sma} fill="none" stroke="rgba(212,160,23,0.75)" strokeWidth="1.3" />
      {candles.map((c, i) => {
        const up = c.c >= c.o, col = up ? '#00C896' : '#F04E4E';
        const by = yOf(Math.max(c.o, c.c)), bh = Math.max(yOf(Math.min(c.o, c.c)) - by, 1);
        return (
          <g key={i}>
            <line x1={cx(i)} y1={yOf(c.h)} x2={cx(i)} y2={yOf(c.l)} stroke={col} strokeWidth="0.9" />
            <rect x={cx(i) - bodyW / 2} y={by} width={bodyW} height={bh} fill={col} rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hero DCA chart — NDQ.AX monthly DCA simulation (Jan 2020 – Dec 2021)
// ---------------------------------------------------------------------------
const NDQ_DCA_DATA = [
  {invested:1500, value:1520},{invested:2000, value:2100},{invested:2500, value:2750},
  {invested:3000, value:3500},{invested:3500, value:4350},{invested:4000, value:5200},
  {invested:4500, value:6400},{invested:5000, value:7300},{invested:5500, value:9600},
  {invested:6000, value:11300},{invested:6500, value:13900},{invested:7000, value:15700},
  {invested:7500, value:12100},{invested:8000, value:10600},{invested:8500, value:9900},
  {invested:9000, value:10300},{invested:9500, value:12600},{invested:10000,value:15100},
  {invested:10500,value:18200},{invested:11000,value:21200},{invested:11500,value:24700},
  {invested:12000,value:27700},{invested:12500,value:30200},{invested:13000,value:33500},
];

function DCAMiniChart({ data }) {
  const W = 260, H = 100;
  const PAD = { l: 4, r: 4, t: 8, b: 8 };
  const cw = W - PAD.l - PAD.r, ch = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => Math.max(d.value, d.invested))) * 1.02;
  const n = data.length;
  const xOf = i => PAD.l + (i / (n - 1)) * cw;
  const yOf = v => PAD.t + ch - (v / maxVal) * ch;
  const valuePts    = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.value)}`).join(' ');
  const investedPts = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.invested)}`).join(' ');
  const areaPath    = `${valuePts} L${xOf(n-1)},${PAD.t+ch} L${xOf(0)},${PAD.t+ch} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <defs>
        <linearGradient id="heroNdqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#D4A017" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={PAD.l} y1={PAD.t + ch*(1-t)} x2={W-PAD.r} y2={PAD.t + ch*(1-t)}
          stroke="rgba(138,155,176,0.15)" strokeWidth="0.8" />
      ))}
      <path d={areaPath}    fill="url(#heroNdqGrad)" />
      <path d={investedPts} fill="none" stroke="rgba(55,138,221,0.55)" strokeWidth="1.3" strokeDasharray="3,2" />
      <path d={valuePts}    fill="none" stroke="#D4A017" strokeWidth="2" />
    </svg>
  );
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
  const [heroSlide,    setHeroSlide]    = useState(0); // 0 = savings, 1 = trading
  const [leaderboard,  setLeaderboard]  = useState([]);

  useEffect(() => {
    const id = setInterval(() => setHeroSlide(s => (s + 1) % 3), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/scores/trading-grounds')
      .then(r => r.json())
      .then(d => setLeaderboard(d.scores || []))
      .catch(() => {});
  }, []);

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
            {/* Floating badge — top right (context-aware) */}
            <div className="mini-card" style={{ top: '-20px', right: '-10px' }}>
              {heroSlide === 0 ? (
                <>
                  <div className="mini-card-icon" style={{ background: 'rgba(0,200,150,0.12)' }}>💰</div>
                  <div className="mini-card-text">
                    <div className="mini-card-title">Interest earned</div>
                    <div className="mini-card-sub">$14,283 over 5 yrs</div>
                  </div>
                </>
              ) : heroSlide === 1 ? (
                <>
                  <div className="mini-card-icon" style={{ background: 'rgba(0,200,150,0.12)' }}>📈</div>
                  <div className="mini-card-text">
                    <div className="mini-card-title">Open position</div>
                    <div className="mini-card-sub">CBA.AX · 20 shares</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mini-card-icon" style={{ background: 'rgba(55,138,221,0.12)' }}>📊</div>
                  <div className="mini-card-text">
                    <div className="mini-card-title">DCA gain</div>
                    <div className="mini-card-sub">+$20,500 over 24 mo</div>
                  </div>
                </>
              )}
            </div>

            {/* Slide container */}
            <div className="hero-slides">
              {/* ── Savings growth card ── */}
              <div className={`hero-chart-card hero-slide${heroSlide === 0 ? ' hero-slide-active' : ' hero-slide-inactive'}`}>
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
                <div className="savings-chart-years">
                  {['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5'].map(y => <span key={y}>{y}</span>)}
                </div>
                <div className="savings-chart-bars">
                  {[
                    { contrib: 6000,  interest: 154  },
                    { contrib: 12000, interest: 618  },
                    { contrib: 18000, interest: 1400 },
                    { contrib: 24000, interest: 2510 },
                    { contrib: 30000, interest: 3871 },
                  ].map((d, i) => {
                    const total = d.contrib + d.interest, maxVal = 33871;
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

              {/* ── Trading chart card ── */}
              <div className={`hero-chart-card hero-slide${heroSlide === 1 ? ' hero-slide-active' : ' hero-slide-inactive'}`}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-stock-name">CBA.AX</div>
                    <div className="chart-stock-sub">Commonwealth Bank · Entry $112.20</div>
                  </div>
                  <div className="chart-price-block">
                    <div className="chart-price">$118.50</div>
                    <div className="chart-change" style={{ color: 'var(--success)' }}>▲ +5.60%</div>
                  </div>
                </div>
                <div className="hero-trade-chart-grow">
                  <TradingMiniChart candles={TRADE_CANDLES} />
                </div>
                <div className="chart-mini-stats" style={{ marginTop: 10 }}>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Entry</div>
                    <div className="chart-mini-stat-val">$112.20</div>
                  </div>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">P&amp;L</div>
                    <div className="chart-mini-stat-val" style={{ color: 'var(--success)' }}>+$126</div>
                  </div>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Shares</div>
                    <div className="chart-mini-stat-val">20</div>
                  </div>
                </div>
              </div>

              {/* ── DCA NDQ card ── */}
              <div className={`hero-chart-card hero-slide${heroSlide === 2 ? ' hero-slide-active' : ' hero-slide-inactive'}`}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-stock-name">
                      NDQ.AX <span className="hero-paper-badge" style={{ background: 'rgba(55,138,221,0.12)', color: '#378ADD' }}>DCA</span>
                    </div>
                    <div className="chart-stock-sub">Betashares Nasdaq 100 · $500/mo · 24 months</div>
                  </div>
                  <div className="chart-price-block">
                    <div className="chart-price">$33,500</div>
                    <div className="chart-change" style={{ color: 'var(--success)' }}>▲ +157.7%</div>
                  </div>
                </div>
                <div className="hero-trade-chart-grow">
                  <DCAMiniChart data={NDQ_DCA_DATA} />
                </div>
                <div className="savings-chart-legend" style={{ marginBottom: 8 }}>
                  <span><span className="savings-dot" style={{ background:'#D4A017' }} />Portfolio Value</span>
                  <span><span className="savings-dot" style={{ background:'rgba(55,138,221,0.8)' }} />Invested</span>
                </div>
                <div className="chart-mini-stats" style={{ marginTop: 0 }}>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Invested</div>
                    <div className="chart-mini-stat-val">$13,000</div>
                  </div>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Gain</div>
                    <div className="chart-mini-stat-val" style={{ color: 'var(--success)' }}>+$20,500</div>
                  </div>
                  <div className="chart-mini-stat">
                    <div className="chart-mini-stat-label">Return</div>
                    <div className="chart-mini-stat-val" style={{ color: 'var(--success)' }}>+157.7%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide dots */}
            <div className="hero-slide-dots">
              <button className={heroSlide === 0 ? 'active' : ''} onClick={() => setHeroSlide(0)} />
              <button className={heroSlide === 1 ? 'active' : ''} onClick={() => setHeroSlide(1)} />
              <button className={heroSlide === 2 ? 'active' : ''} onClick={() => setHeroSlide(2)} />
            </div>

            {/* Floating badge — bottom left (context-aware) */}
            <div className="mini-card" style={{ bottom: '-16px', left: '-10px' }}>
              {heroSlide === 0 ? (
                <>
                  <div className="mini-card-icon" style={{ background: 'rgba(212,160,23,0.12)' }}>🏦</div>
                  <div className="mini-card-text">
                    <div className="mini-card-title">Savings up 47.6%</div>
                    <div className="mini-card-sub">vs. no interest</div>
                  </div>
                </>
              ) : heroSlide === 1 ? (
                <>
                  <div className="mini-card-icon" style={{ background: 'rgba(240,78,78,0.12)' }}>💹</div>
                  <div className="mini-card-text">
                    <div className="mini-card-title">Unrealised +$126</div>
                    <div className="mini-card-sub">+5.60% on position</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mini-card-icon" style={{ background: 'rgba(212,160,23,0.12)' }}>🚀</div>
                  <div className="mini-card-text">
                    <div className="mini-card-title">NDQ up 157.7%</div>
                    <div className="mini-card-sub">vs $13K invested</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* ── TOOLS + LEADERBOARD side-by-side ────────────────────── */}
      <section className="tools-section tools-lb-wrap">
        <div className="tools-lb-layout">

          {/* Left: tools */}
          <div className="tools-lb-left">
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
                { icon:'🔁', title:'Backtesting',              href:'/backtesting',            desc:'Replay historical ASX price data and test your trading strategy with paper trades. Jump to any year, add indicators, and track your results.' },
              ].map(tool => (
                <div key={tool.title} className="tool-card">
                  <div className="tool-icon">{tool.icon}</div>
                  <div className="tool-title">{tool.title}</div>
                  <div className="tool-desc">{tool.desc}</div>
                  <Link to={tool.href} className="tool-btn">Open Tool →</Link>
                </div>
              ))}
            </div>
          </div>

          {/* Right: leaderboard */}
          <div className="tools-lb-right">
            <div className="pub-lb-head">
              <div>
                <div className="section-eyebrow">Trading Simulation</div>
                <h2 className="section-title" style={{ marginBottom: '.4rem' }}>Top Traders</h2>
                <p className="pub-lb-sub">AUD $10,000 · 6 rounds · highest final capital wins</p>
              </div>
              <Link to="/trading-grounds#tg-chart" className="pub-lb-cta">Play Now →</Link>
            </div>

            {leaderboard.length === 0 ? (
              <div className="pub-lb-empty">No scores yet — be the first!</div>
            ) : (
              <div className="pub-lb-table">
                <div className="pub-lb-thead">
                  <span>Rank</span><span>Trader</span><span>Final Capital</span><span>Return</span>
                </div>
                {leaderboard.map((s, i) => {
                  const MEDAL = ['🥇','🥈','🥉'];
                  return (
                    <div key={i} className={`pub-lb-row${i === 0 ? ' pub-lb-gold' : i === 1 ? ' pub-lb-silver' : i === 2 ? ' pub-lb-bronze' : ''}`}>
                      <span className="pub-lb-rank">{i < 3 ? MEDAL[i] : `#${i + 1}`}</span>
                      <span className="pub-lb-name">
                        <span className={`pub-lb-avatar rank-${i}`}>{s.name.charAt(0).toUpperCase()}</span>
                        {s.name}
                      </span>
                      <span className="pub-lb-amount">${s.totalAmount.toFixed(2)}</span>
                      <span className={`pub-lb-pct ${s.totalProfitPct >= 0 ? 'pub-lb-win' : 'pub-lb-loss'}`}>
                        {s.totalProfitPct >= 0 ? '+' : ''}{s.totalProfitPct.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>


    </div>
  );
}
