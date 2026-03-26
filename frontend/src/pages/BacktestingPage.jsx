// ============================================================
// pages/BacktestingPage.jsx — Historical backtesting simulator
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const SCRIPT_ID  = 'lw-charts-cdn';
const SCRIPT_SRC = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js';

const RANGE_OPTIONS = [
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
];

const SPEED_OPTIONS = [
  { label: '0.5×', ms: 1200 },
  { label: '1×',   ms: 600  },
];

const FIB_LEVELS = [
  { r: 0,     label: '0%',    color: '#8A9BB0' },
  { r: 0.236, label: '23.6%', color: '#5B9CF6' },
  { r: 0.382, label: '38.2%', color: '#00C896' },
  { r: 0.5,   label: '50%',   color: '#D4A017' },
  { r: 0.618, label: '61.8%', color: '#F0A500' },
  { r: 0.786, label: '78.6%', color: '#A855F7' },
  { r: 1,     label: '100%',  color: '#F04E4E' },
];

const INDICATOR_CATALOG = [
  { key: 'sma20',  label: 'SMA 20',          group: 'Moving Average', dot: '#5B9CF6', desc: 'Simple Moving Average (20-period)' },
  { key: 'sma50',  label: 'SMA 50',          group: 'Moving Average', dot: '#F0A500', desc: 'Simple Moving Average (50-period)' },
  { key: 'sma200', label: 'SMA 200',         group: 'Moving Average', dot: '#A855F7', desc: 'Simple Moving Average (200-period)' },
  { key: 'ema20',  label: 'EMA 20',          group: 'Moving Average', dot: '#74C0FC', desc: 'Exponential Moving Average (20-period)' },
  { key: 'ema50',  label: 'EMA 50',          group: 'Moving Average', dot: '#FFC078', desc: 'Exponential Moving Average (50-period)' },
  { key: 'bb',     label: 'Bollinger Bands', group: 'Overlay',        dot: '#C084FC', desc: 'Bollinger Bands (20, ±2σ)' },
  { key: 'rsi',    label: 'RSI (14)',        group: 'Sub-Chart',      dot: '#00C896', desc: 'Relative Strength Index, 14-period' },
  { key: 'macd',   label: 'MACD (12,26,9)', group: 'Sub-Chart',      dot: '#5B9CF6', desc: 'MACD — 12/26 EMAs, 9-period signal' },
];

// ── Indicator math ────────────────────────────────────────────────────────────
function calcSMA(candles, period) {
  const out = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

function calcEMA(candles, period) {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let ema = candles[0].close;
  for (let i = 0; i < candles.length; i++) {
    ema = i === 0 ? candles[0].close : candles[i].close * k + ema * (1 - k);
    if (i >= period - 1) out.push({ time: candles[i].time, value: ema });
  }
  return out;
}

function calcBB(candles, period = 20, mult = 2) {
  const upper = [], middle = [], lower = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map(c => c.close);
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    upper.push({ time: candles[i].time, value: mean + mult * std });
    middle.push({ time: candles[i].time, value: mean });
    lower.push({ time: candles[i].time, value: mean - mult * std });
  }
  return { upper, middle, lower };
}

function calcRSI(candles, period = 14) {
  if (candles.length < period + 1) return [];
  const out = [];
  let avgG = 0, avgL = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d > 0) avgG += d; else avgL -= d;
  }
  avgG /= period; avgL /= period;
  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      const d = candles[i].close - candles[i - 1].close;
      avgG = (avgG * (period - 1) + (d > 0 ? d : 0)) / period;
      avgL = (avgL * (period - 1) + (d < 0 ? -d : 0)) / period;
    }
    out.push({ time: candles[i].time, value: avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL) });
  }
  return out;
}

function calcMACD(candles, fast = 12, slow = 26, sigPeriod = 9) {
  if (candles.length < slow + sigPeriod) return null;
  const emaFast = calcEMA(candles, fast);
  const emaSlow = calcEMA(candles, slow);
  const slowMap = new Map(emaSlow.map(d => [d.time, d.value]));
  const macdLine = emaFast
    .filter(d => slowMap.has(d.time))
    .map(d => ({ time: d.time, value: d.value - slowMap.get(d.time) }));
  if (macdLine.length < sigPeriod) return null;
  const k = 2 / (sigPeriod + 1);
  let sigEma = macdLine[0].value;
  const signalLine = macdLine.map((d, i) => {
    sigEma = i === 0 ? d.value : d.value * k + sigEma * (1 - k);
    return { time: d.time, value: sigEma };
  }).slice(sigPeriod - 1);
  const sigMap = new Map(signalLine.map(d => [d.time, d.value]));
  const histogram = macdLine
    .filter(d => sigMap.has(d.time))
    .map(d => ({
      time: d.time,
      value: d.value - sigMap.get(d.time),
      color: d.value >= sigMap.get(d.time) ? 'rgba(0,200,150,0.7)' : 'rgba(240,78,78,0.7)',
    }));
  return { macdLine, signalLine, histogram };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchCandles(symbol, range) {
  const res = await fetch(`/api/asx/history?symbol=${symbol}&range=${range}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const { candles } = await res.json();
  if (!candles?.length) throw new Error('No data returned for this symbol');
  return candles;
}

// ── BacktestChart ─────────────────────────────────────────────────────────────
function BacktestChart({ visibleCandles, theme, lwReady, position, activeIndicators, fibState, manualBoxes, boxDrawState, hLines, onChartClick }) {
  const mainRef      = useRef(null);
  const rsiRef       = useRef(null);
  const macdRef      = useRef(null);
  const chartRef     = useRef(null);
  const rsiChartRef  = useRef(null);
  const macdChartRef = useRef(null);
  const S            = useRef({});
  const entryLine    = useRef(null);
  const canvasRef    = useRef(null);
  const fibLines     = useRef([]);
  const hLineRefs    = useRef([]);
  const onClickRef   = useRef(onChartClick);
  const boxesRef     = useRef(manualBoxes);
  const boxDrawRef   = useRef(boxDrawState);
  const hoverRef     = useRef(null);
  const isDark       = theme === 'dark';

  useEffect(() => { onClickRef.current = onChartClick; }, [onChartClick]);
  useEffect(() => { boxesRef.current   = manualBoxes;  scheduleDraw(); }, [manualBoxes]);   // eslint-disable-line
  useEffect(() => { boxDrawRef.current = boxDrawState; scheduleDraw(); }, [boxDrawState]);  // eslint-disable-line

  const hasRSI  = activeIndicators.has('rsi');
  const hasMACD = activeIndicators.has('macd');

  const chartTheme = useCallback((dark) => ({
    layout: { background: { color: dark ? '#0B1219' : '#FFFFFF' }, textColor: dark ? '#8A96B0' : '#4A5570' },
    grid: {
      vertLines: { color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
      horzLines: { color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
    },
  }), []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const chart  = chartRef.current;
    const cs     = S.current.candles;
    if (!canvas || !chart || !cs) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const toXY = (time, price) => {
      const x = chart.timeScale().timeToCoordinate(time);
      const y = cs.priceToCoordinate(price);
      return (x == null || y == null) ? null : { x, y };
    };
    const drawBox = (tl, br, alpha = 1) => {
      if (!tl || !br) return;
      const rx = Math.min(tl.x, br.x), ry = Math.min(tl.y, br.y);
      const rw = Math.abs(br.x - tl.x),  rh = Math.abs(br.y - tl.y);
      if (rw < 3 || rh < 3) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = 'rgba(212,160,23,0.08)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      ctx.fillStyle = '#D4A017';
      ctx.font      = 'bold 10px sans-serif';
      ctx.fillText('Darvas', rx + 4, ry + 12);
      ctx.restore();
    };
    for (const box of boxesRef.current) {
      drawBox(toXY(box.startTime, box.top), toXY(box.endTime, box.bottom));
    }
    const ds    = boxDrawRef.current;
    const hover = hoverRef.current;
    if (ds.active && ds.p1 && hover) {
      drawBox(toXY(ds.p1.time, ds.p1.price), toXY(hover.time, hover.price), 0.45);
    }
  }, []);

  const scheduleDraw = useCallback(() => { requestAnimationFrame(redrawCanvas); }, [redrawCanvas]);

  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  // ── Init main chart ──────────────────────────────────────────────────────
  useEffect(() => {
    const LW = window.LightweightCharts;
    if (!LW || !mainRef.current) return;
    const chart = LW.createChart(mainRef.current, {
      ...chartTheme(isDark),
      width: 0, height: 460,
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false, rightOffset: 20 },
      crosshair: { mode: 1 },
      handleScroll: true, handleScale: true,
    });
    chartRef.current = chart;
    S.current.candles = chart.addCandlestickSeries({
      upColor: '#00C896', downColor: '#F04E4E',
      borderUpColor: '#00C896', borderDownColor: '#F04E4E',
      wickUpColor: '#00C896', wickDownColor: '#F04E4E',
    });
    S.current.volume = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    S.current.overlays = {};

    chart.subscribeClick((param) => {
      if (!param.point || !param.time) return;
      const price = S.current.candles?.coordinateToPrice(param.point.y);
      if (price != null) onClickRef.current?.({ price, time: param.time });
    });

    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.point) {
        const price = S.current.candles?.coordinateToPrice(param.point.y);
        hoverRef.current = price != null ? { time: param.time, price } : null;
      } else {
        hoverRef.current = null;
      }
      if (boxDrawRef.current?.active) requestAnimationFrame(redrawCanvas);
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      requestAnimationFrame(redrawCanvas);
    });

    const ro = new ResizeObserver(() => {
      const w = mainRef.current?.clientWidth;
      const h = mainRef.current?.clientHeight || 460;
      if (w) {
        chart.applyOptions({ width: w });
        if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; requestAnimationFrame(redrawCanvas); }
      }
    });
    ro.observe(mainRef.current);
    requestAnimationFrame(() => {
      const w = mainRef.current?.clientWidth;
      const h = mainRef.current?.clientHeight || 460;
      if (w) {
        chart.applyOptions({ width: w });
        if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
      }
    });
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; S.current = {}; };
  }, [lwReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init RSI sub-chart ───────────────────────────────────────────────────
  useEffect(() => {
    const LW = window.LightweightCharts;
    if (!hasRSI || !LW || !rsiRef.current) return;
    const chart = LW.createChart(rsiRef.current, {
      ...chartTheme(isDark),
      width: 0, height: 110,
      rightPriceScale: { borderColor: border, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: border, timeVisible: false, rightOffset: 8 },
      crosshair: { mode: 1 },
      handleScroll: false, handleScale: false,
    });
    rsiChartRef.current = chart;
    S.current.rsiLine = chart.addLineSeries({ color: '#C084FC', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    S.current.rsiLine.createPriceLine({ price: 70, color: 'rgba(240,78,78,0.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    S.current.rsiLine.createPriceLine({ price: 30, color: 'rgba(0,200,150,0.5)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });

    const ro = new ResizeObserver(() => {
      const w = rsiRef.current?.clientWidth;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(rsiRef.current);
    requestAnimationFrame(() => {
      const w = rsiRef.current?.clientWidth;
      if (w) chart.applyOptions({ width: w });
    });

    const syncFn = () => {
      const range = chartRef.current?.timeScale().getVisibleRange();
      if (range) chart.timeScale().setVisibleRange(range);
    };
    chartRef.current?.timeScale().subscribeVisibleTimeRangeChange(syncFn);
    return () => {
      ro.disconnect();
      chartRef.current?.timeScale().unsubscribeVisibleTimeRangeChange(syncFn);
      chart.remove();
      rsiChartRef.current = null;
      delete S.current.rsiLine;
    };
  }, [hasRSI, lwReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init MACD sub-chart ──────────────────────────────────────────────────
  useEffect(() => {
    const LW = window.LightweightCharts;
    if (!hasMACD || !LW || !macdRef.current) return;
    const chart = LW.createChart(macdRef.current, {
      ...chartTheme(isDark),
      width: 0, height: 120,
      rightPriceScale: { borderColor: border, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: border, timeVisible: false, rightOffset: 8 },
      crosshair: { mode: 1 },
      handleScroll: false, handleScale: false,
    });
    macdChartRef.current = chart;
    S.current.macdLine   = chart.addLineSeries({ color: '#5B9CF6', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true, title: 'MACD' });
    S.current.macdSignal = chart.addLineSeries({ color: '#F59F00', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true, title: 'Signal' });
    S.current.macdHist   = chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });

    const ro = new ResizeObserver(() => {
      const w = macdRef.current?.clientWidth;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(macdRef.current);
    requestAnimationFrame(() => {
      const w = macdRef.current?.clientWidth;
      if (w) chart.applyOptions({ width: w });
    });

    const syncFn = () => {
      const range = chartRef.current?.timeScale().getVisibleRange();
      if (range) chart.timeScale().setVisibleRange(range);
    };
    chartRef.current?.timeScale().subscribeVisibleTimeRangeChange(syncFn);
    return () => {
      ro.disconnect();
      chartRef.current?.timeScale().unsubscribeVisibleTimeRangeChange(syncFn);
      chart.remove();
      macdChartRef.current = null;
      delete S.current.macdLine;
      delete S.current.macdSignal;
      delete S.current.macdHist;
    };
  }, [hasMACD, lwReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.applyOptions(chartTheme(isDark));
    rsiChartRef.current?.applyOptions(chartTheme(isDark));
    macdChartRef.current?.applyOptions(chartTheme(isDark));
  }, [isDark, chartTheme]);

  // ── Feed data + manage overlays ──────────────────────────────────────────
  useEffect(() => {
    const s = S.current;
    const chart = chartRef.current;
    if (!s.candles || !chart || !visibleCandles.length) return;

    // Candles + volume
    s.candles.setData(visibleCandles.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    s.volume.setData(visibleCandles.map(c => ({
      time: c.time, value: c.volume ?? 0,
      color: c.close >= c.open ? 'rgba(0,200,150,0.35)' : 'rgba(240,78,78,0.35)',
    })));

    // Overlay config (single-series indicators)
    const overlayCfg = {
      sma20:  { color: '#5B9CF6', lw: 1.5, title: 'SMA20',  calc: () => calcSMA(visibleCandles, 20) },
      sma50:  { color: '#F59F00', lw: 1.5, title: 'SMA50',  calc: () => calcSMA(visibleCandles, 50) },
      sma200: { color: '#F03E3E', lw: 1.5, title: 'SMA200', calc: () => calcSMA(visibleCandles, 200) },
      ema20:  { color: '#74C0FC', lw: 1.5, title: 'EMA20',  calc: () => calcEMA(visibleCandles, 20) },
      ema50:  { color: '#FFC078', lw: 1.5, title: 'EMA50',  calc: () => calcEMA(visibleCandles, 50) },
    };

    // Remove deactivated overlay series
    for (const key of Object.keys(s.overlays)) {
      if (!activeIndicators.has(key)) {
        const entry = s.overlays[key];
        (Array.isArray(entry) ? entry : [entry]).forEach(ser => { try { chart.removeSeries(ser); } catch {} });
        delete s.overlays[key];
      }
    }

    // Add/update overlay series
    for (const key of activeIndicators) {
      if (key === 'bb') {
        if (!s.overlays.bb) {
          s.overlays.bb = [
            chart.addLineSeries({ color: 'rgba(192,132,252,0.8)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
            chart.addLineSeries({ color: 'rgba(192,132,252,0.4)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }),
            chart.addLineSeries({ color: 'rgba(192,132,252,0.8)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
          ];
        }
        const bb = calcBB(visibleCandles);
        s.overlays.bb[0].setData(bb.upper);
        s.overlays.bb[1].setData(bb.middle);
        s.overlays.bb[2].setData(bb.lower);
      } else if (overlayCfg[key]) {
        if (!s.overlays[key]) {
          s.overlays[key] = chart.addLineSeries({
            color: overlayCfg[key].color, lineWidth: overlayCfg[key].lw,
            title: overlayCfg[key].title, priceLineVisible: false, lastValueVisible: false,
          });
        }
        s.overlays[key].setData(overlayCfg[key].calc());
      }
    }

    // RSI data
    if (s.rsiLine) {
      s.rsiLine.setData(calcRSI(visibleCandles));
      const range = chart.timeScale().getVisibleRange();
      if (range) rsiChartRef.current?.timeScale().setVisibleRange(range);
      rsiChartRef.current?.timeScale().scrollToRealTime();
    }

    // MACD data
    if (s.macdLine) {
      const macd = calcMACD(visibleCandles);
      if (macd) {
        s.macdLine.setData(macd.macdLine);
        s.macdSignal.setData(macd.signalLine);
        s.macdHist.setData(macd.histogram);
        const range = chart.timeScale().getVisibleRange();
        if (range) macdChartRef.current?.timeScale().setVisibleRange(range);
        macdChartRef.current?.timeScale().scrollToRealTime();
      }
    }

    chart.timeScale().scrollToRealTime();
  }, [visibleCandles, activeIndicators]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entry price line ─────────────────────────────────────────────────────
  useEffect(() => {
    const cs = S.current.candles;
    if (!cs) return;
    if (entryLine.current) { try { cs.removePriceLine(entryLine.current); } catch {} entryLine.current = null; }
    if (position) {
      entryLine.current = cs.createPriceLine({
        price: position.entryPrice, color: '#5B9CF6', lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: `Entry $${position.entryPrice.toFixed(2)}`,
      });
    }
  }, [position]);

  // ── Fibonacci price lines ─────────────────────────────────────────────────
  useEffect(() => {
    const cs = S.current.candles;
    if (!cs) return;
    fibLines.current.forEach(l => { try { cs.removePriceLine(l); } catch {} });
    fibLines.current = [];
    if (fibState?.p1 != null && fibState?.p2 != null) {
      const hi = Math.max(fibState.p1, fibState.p2);
      const lo = Math.min(fibState.p1, fibState.p2);
      FIB_LEVELS.forEach(fl => {
        fibLines.current.push(cs.createPriceLine({
          price: hi - fl.r * (hi - lo), color: fl.color, lineWidth: 1, lineStyle: 2,
          axisLabelVisible: true, title: `Fib ${fl.label}`,
        }));
      });
    }
  }, [fibState]);

  // ── Horizontal lines ──────────────────────────────────────────────────────
  useEffect(() => {
    const cs = S.current.candles;
    if (!cs) return;
    hLineRefs.current.forEach(l => { try { cs.removePriceLine(l); } catch {} });
    hLineRefs.current = (hLines ?? []).map(hl =>
      cs.createPriceLine({ price: hl.price, color: '#5B9CF6', lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: `$${hl.price.toFixed(2)}` })
    );
  }, [hLines]);

  const isDrawing = fibState?.active || boxDrawState?.active;

  return (
    <div className="bt-chart-wrap" style={{ cursor: isDrawing ? 'crosshair' : 'default' }}>
      <div style={{ position: 'relative' }}>
        <div ref={mainRef} className="bt-chart-canvas" />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
        />
      </div>
      {hasRSI  && <div ref={rsiRef}  className="bt-sub-chart" />}
      {hasMACD && <div ref={macdRef} className="bt-sub-chart" />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BacktestingPage() {
  const { theme } = useTheme();

  const [lwReady,         setLwReady]         = useState(() => !!window.LightweightCharts);
  const [symbolInput,     setSymbolInput]     = useState('BHP');
  const [symbol,          setSymbol]          = useState('BHP');
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggest,     setShowSuggest]     = useState(false);
  const [range,           setRange]           = useState('2y');
  const [allCandles,      setAllCandles]      = useState([]);
  const [replayPos,       setReplayPos]       = useState(0);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [speedIdx,        setSpeedIdx]        = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [position,        setPosition]        = useState(null);
  const [trades,          setTrades]          = useState([]);
  const [activeIndicators,setActiveIndicators]= useState(new Set());
  const [indOpen,         setIndOpen]         = useState(false);
  const [indSearch,       setIndSearch]       = useState('');
  const [fibState,        setFibState]        = useState({ active: false, p1: null, p2: null });
  const [manualBoxes,     setManualBoxes]     = useState([]);
  const [boxDrawState,    setBoxDrawState]    = useState({ active: false, p1: null });
  const [hLines,          setHLines]          = useState([]);
  const [hLineActive,     setHLineActive]     = useState(false);

  const replayRef      = useRef(null);
  const allCandlesRef  = useRef([]);
  const suggestRef     = useRef(null);
  const debounceRef    = useRef(null);
  const hLineActiveRef = useRef(false);

  useEffect(() => { allCandlesRef.current = allCandles; }, [allCandles]);

  // ── Load LW Charts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.LightweightCharts) { setLwReady(true); return; }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) { existing.addEventListener('load', () => setLwReady(true), { once: true }); return; }
    const s = document.createElement('script');
    s.id = SCRIPT_ID; s.src = SCRIPT_SRC; s.async = true;
    s.onload = () => setLwReady(true);
    document.head.appendChild(s);
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async (sym, rng) => {
    setLoading(true); setError(null); setIsPlaying(false);
    clearInterval(replayRef.current);
    setPosition(null); setTrades([]);
    try {
      const candles = await fetchCandles(sym, rng);
      if (!candles.length) throw new Error('No candles returned');
      setAllCandles(candles);
      setReplayPos(Math.min(60, candles.length));
    } catch (e) {
      setError(e.message); setAllCandles([]); setReplayPos(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(symbol, range); }, [symbol, range]); // eslint-disable-line

  // ── Replay ────────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(replayRef.current);
    if (!isPlaying) return;
    replayRef.current = setInterval(() => {
      setReplayPos(prev => {
        const next = prev + 1;
        if (next >= allCandlesRef.current.length) { setIsPlaying(false); return allCandlesRef.current.length; }
        return next;
      });
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => clearInterval(replayRef.current);
  }, [isPlaying, speedIdx]);

  // ── Autocomplete ─────────────────────────────────────────────────────────
  useEffect(() => {
    const q = symbolInput.trim();
    if (q.length < 1) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/asx/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggest(true);
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [symbolInput]);

  useEffect(() => {
    const h = (e) => { if (!suggestRef.current?.contains(e.target)) setShowSuggest(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);


  // ── Handlers ─────────────────────────────────────────────────────────────
  const applySymbol = (val = symbolInput) => {
    const v = val.trim().toUpperCase();
    if (/^[A-Z]{2,10}$/.test(v)) { setSymbol(v); setSymbolInput(v); }
    else setSymbolInput(symbol);
    setShowSuggest(false); setSuggestions([]);
  };

  const jumpToYear = (year) => {
    const ts  = new Date(`${year}-01-01`).getTime() / 1000;
    const idx = allCandles.findIndex(c => c.time >= ts);
    if (idx >= 0) { setIsPlaying(false); setReplayPos(idx + 1); }
  };

  const reset = () => {
    setIsPlaying(false);
    clearInterval(replayRef.current);
    setReplayPos(Math.min(60, allCandles.length));
    setPosition(null);
  };

  const toggleIndicator = (key) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  useEffect(() => { hLineActiveRef.current = hLineActive; }, [hLineActive]);

  const handleChartClick = useCallback(({ price, time }) => {
    setFibState(prev => {
      if (!prev.active) return prev;
      if (prev.p1 === null) return { ...prev, p1: price };
      return { active: false, p1: prev.p1, p2: price };
    });
    setBoxDrawState(prev => {
      if (!prev.active) return prev;
      if (prev.p1 === null) return { ...prev, p1: { price, time } };
      const p1 = prev.p1;
      setManualBoxes(boxes => [...boxes, {
        id: Date.now(),
        startTime: Math.min(p1.time, time),
        endTime:   Math.max(p1.time, time),
        top:       Math.max(p1.price, price),
        bottom:    Math.min(p1.price, price),
      }]);
      return { active: false, p1: null };
    });
    if (hLineActiveRef.current) {
      setHLines(prev => [...prev, { id: Date.now(), price }]);
    }
  }, []);

  const handleBuy = () => {
    if (!currentPrice || position) return;
    setPosition({ entryPrice: currentPrice, entryDate: currentDate });
  };

  const handleSell = () => {
    if (!currentPrice || !position) return;
    const pl = currentPrice - position.entryPrice;
    setTrades(prev => [{
      id: prev.length + 1, symbol,
      entryPrice: position.entryPrice, exitPrice: currentPrice,
      entryDate: position.entryDate, exitDate: currentDate,
      pl, plPct: (pl / position.entryPrice) * 100,
    }, ...prev]);
    setPosition(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const visibleCandles = allCandles.slice(0, replayPos);
  const lastCandle     = visibleCandles[visibleCandles.length - 1];
  const currentPrice   = lastCandle?.close ?? 0;
  const currentDate    = lastCandle
    ? new Date(lastCandle.time * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const realisedPL     = trades.reduce((s, t) => s + t.pl, 0);
  const winRate        = trades.length ? ((trades.filter(t => t.pl > 0).length / trades.length) * 100).toFixed(0) : null;
  const unrealPL       = position ? currentPrice - position.entryPrice : null;
  const unrealPct      = unrealPL != null ? (unrealPL / position.entryPrice) * 100 : null;
  const availableYears = [...new Set(allCandles.map(c => new Date(c.time * 1000).getFullYear()))];
  const progress       = allCandles.length ? Math.round((replayPos / allCandles.length) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bt-page">
      <div className="bt-header page-hero">
        <div className="section-eyebrow">Share Trading</div>
        <h1 className="bt-hero-title">Backtesting</h1>
        <p className="bt-hero-sub">Replay historical ASX price data and test your trading strategy with paper trades.</p>
      </div>

      <div className="bt-body">

        {/* ── Controls + slider panel ──────────────────────────────────────── */}
        <div className="bt-controls-panel">
        <div className="bt-controls">

          <span className="bt-label">Symbol</span>
          <div className="bt-symbol-row" ref={suggestRef} style={{ position: 'relative' }}>
            <input
              className="bt-input"
              value={symbolInput}
              onChange={e => { setSymbolInput(e.target.value.toUpperCase()); setShowSuggest(true); }}
              onFocus={() => suggestions.length && setShowSuggest(true)}
              onKeyDown={e => { if (e.key === 'Enter') applySymbol(); if (e.key === 'Escape') setShowSuggest(false); }}
              maxLength={10} placeholder="BHP" autoComplete="off"
            />
            <button className="bt-go" onClick={() => applySymbol()}>Go</button>
            {showSuggest && suggestions.length > 0 && (
              <div className="bt-suggest-dropdown">
                {suggestions.map(s => (
                  <button key={s.ticker} className="bt-suggest-item" onMouseDown={e => { e.preventDefault(); applySymbol(s.ticker); }}>
                    <span className="bt-suggest-ticker">{s.ticker}</span>
                    <span className="bt-suggest-name">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bt-sep" />

          <span className="bt-label">Range</span>
          <div className="bt-pills">
            {RANGE_OPTIONS.map(r => (
              <button key={r.value} className={`bt-pill${range === r.value ? ' active' : ''}`} onClick={() => setRange(r.value)}>
                {r.label}
              </button>
            ))}
          </div>

          {availableYears.length > 0 && (
            <>
              <div className="bt-sep" />
              <span className="bt-label">Jump to</span>
              <div className="bt-pills">
                {availableYears.map(y => (
                  <button key={y} className="bt-pill" onClick={() => jumpToYear(y)}>{y}</button>
                ))}
              </div>
            </>
          )}

          <div className="bt-sep" />

          <span className="bt-label">Speed</span>
          <div className="bt-pills">
            {SPEED_OPTIONS.map((s, i) => (
              <button key={s.label} className={`bt-pill${speedIdx === i ? ' active' : ''}`} onClick={() => setSpeedIdx(i)}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="bt-sep" />

          {allCandles.length > 0 && (
            <div className="bt-inline-slider">
              <input
                type="range" className="bt-slider"
                min={1} max={allCandles.length} value={replayPos}
                onChange={e => { setIsPlaying(false); setReplayPos(Number(e.target.value)); }}
              />
              <span className="bt-slider-meta">{currentDate} · {progress}%</span>
            </div>
          )}

          <div className="bt-sep" />

          <button
            className={`bt-btn-play${isPlaying ? ' playing' : ''}`}
            onClick={() => setIsPlaying(p => !p)}
            disabled={!allCandles.length || loading}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="bt-btn-reset" onClick={reset} disabled={!allCandles.length || loading}>
            ↺ Reset
          </button>

        </div>
        </div>{/* end bt-controls-panel */}

        {/* ── Indicator toolbar (TG-style) ─────────────────────────────────── */}
        <div className="tg-toolbar">

          <div className="tg-toolbar-group">
            <span className="tg-toolbar-label">Moving Avg</span>
            {[
              { key: 'sma20',  label: 'SMA 20',  dot: '#5B9CF6' },
              { key: 'sma50',  label: 'SMA 50',  dot: '#F0A500' },
              { key: 'sma200', label: 'SMA 200', dot: '#A855F7' },
            ].map(({ key, label, dot }) => (
              <button key={key} className={`tg-ind-btn${activeIndicators.has(key) ? ' active' : ''}`}
                style={activeIndicators.has(key) ? { borderColor: dot, color: dot } : {}} onClick={() => toggleIndicator(key)}>
                <span className="tg-ind-dot" style={{ background: dot }} />{label}
              </button>
            ))}
          </div>

          <div className="tg-toolbar-group">
            <span className="tg-toolbar-label">Sub-Charts</span>
            {[
              { key: 'rsi',  label: 'RSI (14)',       dot: '#00C896' },
              { key: 'macd', label: 'MACD (12,26,9)', dot: '#5B9CF6' },
            ].map(({ key, label, dot }) => (
              <button key={key} className={`tg-ind-btn${activeIndicators.has(key) ? ' active' : ''}`}
                style={activeIndicators.has(key) ? { borderColor: dot, color: dot } : {}} onClick={() => toggleIndicator(key)}>
                <span className="tg-ind-dot" style={{ background: dot }} />{label}
              </button>
            ))}
          </div>

          {/* Draw tools */}
          <div className="tg-toolbar-group">
            <span className="tg-toolbar-label">Draw</span>

            <button
              className={`tg-ind-btn${boxDrawState.active || manualBoxes.length > 0 ? ' active' : ''}`}
              style={boxDrawState.active ? { borderColor: '#D4A017', color: '#D4A017' } : {}}
              onClick={() => {
                setFibState(f => f.active ? { ...f, active: false } : f);
                setBoxDrawState(prev => prev.active ? { active: false, p1: null } : { active: true, p1: null });
              }}
            >
              <span className="tg-ind-dot" style={{ background: '#D4A017' }} />
              Darvas Box
              {boxDrawState.active && (
                <span style={{ fontSize: '.7rem', marginLeft: 4, opacity: .75 }}>
                  {boxDrawState.p1 === null ? '→ click corner 1' : '→ click corner 2'}
                </span>
              )}
            </button>
            {manualBoxes.length > 0 && (
              <button className="tg-ind-btn" onClick={() => { setManualBoxes([]); setBoxDrawState({ active: false, p1: null }); }}>
                ✕ Clear Boxes ({manualBoxes.length})
              </button>
            )}

            <button
              className={`tg-ind-btn${fibState.active || (fibState.p1 != null && fibState.p2 != null) ? ' active' : ''}`}
              style={fibState.active ? { borderColor: '#A855F7', color: '#A855F7' } : {}}
              onClick={() => {
                setBoxDrawState(b => b.active ? { ...b, active: false } : b);
                setFibState(prev => prev.active ? { active: false, p1: null, p2: null } : { active: true, p1: null, p2: null });
              }}
            >
              ✏ Fibonacci
              {fibState.active && (
                <span style={{ fontSize: '.7rem', marginLeft: 4, opacity: .75 }}>
                  {fibState.p1 === null ? '→ click high' : '→ click low'}
                </span>
              )}
            </button>
            {fibState.p1 != null && (
              <button className="tg-ind-btn" onClick={() => setFibState({ active: false, p1: null, p2: null })}>
                ✕ Clear Fib
              </button>
            )}

            <button
              className={`tg-ind-btn${hLineActive ? ' active' : ''}`}
              style={hLineActive ? { borderColor: '#5B9CF6', color: '#5B9CF6' } : {}}
              onClick={() => {
                setFibState(f => f.active ? { ...f, active: false } : f);
                setBoxDrawState(b => b.active ? { ...b, active: false } : b);
                setHLineActive(prev => !prev);
              }}
            >
              <span className="tg-ind-dot" style={{ background: '#5B9CF6' }} />
              Line
              {hLineActive && <span style={{ fontSize: '.7rem', marginLeft: 4, opacity: .75 }}>→ click price</span>}
            </button>
            {hLines.length > 0 && (
              <button className="tg-ind-btn" onClick={() => setHLines([])}>
                ✕ Clear Lines ({hLines.length})
              </button>
            )}
          </div>

          {/* + Indicators search */}
          <div
            className="tg-toolbar-group"
            style={{ marginLeft: 'auto', position: 'relative' }}
            onMouseLeave={() => setIndOpen(false)}
          >
            <button
              className={`tg-ind-btn${indOpen ? ' active' : ''}`}
              onClick={() => { setIndOpen(o => !o); setIndSearch(''); }}
              style={{ fontWeight: 600 }}
            >
              + Indicators
            </button>
            {indOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                width: 310, padding: '12px',
              }}>
                <input
                  autoFocus
                  value={indSearch}
                  onChange={e => setIndSearch(e.target.value)}
                  placeholder="Search indicators…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '7px 12px', borderRadius: 7, marginBottom: 10,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text)', fontSize: '.85rem', outline: 'none',
                  }}
                />
                <div style={{ maxHeight: 290, overflowY: 'auto' }}>
                  {(() => {
                    const filtered = INDICATOR_CATALOG.filter(ind =>
                      ind.label.toLowerCase().includes(indSearch.toLowerCase()) ||
                      ind.group.toLowerCase().includes(indSearch.toLowerCase()) ||
                      ind.desc.toLowerCase().includes(indSearch.toLowerCase())
                    );
                    const groups = [...new Set(filtered.map(i => i.group))];
                    return groups.map(group => (
                      <div key={group}>
                        <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent, #5B9CF6)', padding: '6px 6px 3px', opacity: .8 }}>
                          {group}
                        </div>
                        {filtered.filter(ind => ind.group === group).map(ind => {
                          const on = activeIndicators.has(ind.key);
                          return (
                            <div
                              key={ind.key}
                              onClick={() => toggleIndicator(ind.key)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '7px 8px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
                                background: on ? `${ind.dot}18` : 'transparent',
                                border: `1px solid ${on ? `${ind.dot}40` : 'transparent'}`,
                                transition: 'background .15s, border-color .15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = on ? `${ind.dot}28` : 'var(--bg)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = on ? `${ind.dot}18` : 'transparent'; }}
                            >
                              <span style={{ width: 9, height: 9, borderRadius: '50%', background: ind.dot, flexShrink: 0, boxShadow: `0 0 6px ${ind.dot}88` }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--text)' }}>{ind.label}</div>
                                <div style={{ fontSize: '.71rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ind.desc}</div>
                              </div>
                              <span style={{
                                fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                                background: on ? ind.dot : 'var(--border)',
                                color: on ? '#fff' : 'var(--muted)',
                                flexShrink: 0, letterSpacing: '.03em',
                              }}>
                                {on ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Chart + Panel ─────────────────────────────────────────────────── */}
        <div className="bt-layout">

          <div className="bt-chart-col">
            {loading && (
              <div className="bt-state-overlay">
                <div className="tg-spinner" />
                <span>Loading {symbol}.AX historical data…</span>
              </div>
            )}
            {error && !loading && (
              <div className="bt-state-overlay bt-error-state">
                <span style={{ fontSize: '1.5rem' }}>⚠</span>
                <strong>Could not load {symbol}.AX</strong>
                <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>{error}</span>
                <button className="bt-go" onClick={() => loadData(symbol, range)}>Retry</button>
              </div>
            )}
            {!loading && !error && (
              lwReady
                ? <BacktestChart visibleCandles={visibleCandles} theme={theme} lwReady={lwReady} position={position} activeIndicators={activeIndicators} fibState={fibState} manualBoxes={manualBoxes} boxDrawState={boxDrawState} hLines={hLines} onChartClick={handleChartClick} />
                : <div className="tg-chart-loading"><div className="tg-spinner" /><span>Loading chart engine…</span></div>
            )}
          </div>

          {/* ── Trading panel ─────────────────────────────────────────────── */}
          <div className="bt-panel">

            <div className="bt-panel-header">
              <span className="tg-ticker">{symbol}.AX</span>
              <span className="bt-date-badge">{currentDate}</span>
            </div>

            <div className="bt-current-price">${currentPrice > 0 ? currentPrice.toFixed(2) : '—'}</div>

            <div className="tg-panel-stats">
              <div className="tg-ps">
                <div className="tg-ps-label">Realised P&amp;L</div>
                <div className="tg-ps-val" style={{ color: realisedPL === 0 ? 'var(--muted)' : realisedPL > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {trades.length === 0 ? '—' : `${realisedPL >= 0 ? '+' : ''}$${realisedPL.toFixed(2)}`}
                </div>
              </div>
              <div className="tg-ps">
                <div className="tg-ps-label">Trades</div>
                <div className="tg-ps-val">{trades.length || '—'}</div>
              </div>
              <div className="tg-ps">
                <div className="tg-ps-label">Win Rate</div>
                <div className="tg-ps-val" style={{ color: winRate === null ? 'var(--muted)' : winRate >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                  {winRate !== null ? `${winRate}%` : '—'}
                </div>
              </div>
            </div>

            {position && (
              <div className="bt-open-pos">
                <div className="tg-ps-label" style={{ marginBottom: 6 }}>Open Position</div>
                <div className="bt-pos-row"><span>Entry</span><span>${position.entryPrice.toFixed(2)}</span></div>
                <div className="bt-pos-row"><span>Date</span><span style={{ fontSize: '.75rem' }}>{position.entryDate}</span></div>
                <div className="bt-pos-row">
                  <span>Unrealised</span>
                  <span style={{ color: unrealPL >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                    {unrealPL >= 0 ? '+' : ''}${unrealPL.toFixed(2)} ({unrealPct >= 0 ? '+' : ''}{unrealPct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            <div className="tg-panel-btns">
              <button className="tg-btn tg-btn-buy"  onClick={handleBuy}  disabled={!!position || !currentPrice || loading}>▲ BUY</button>
              <button className="tg-btn tg-btn-sell" onClick={handleSell} disabled={!position || loading}>▼ SELL</button>
            </div>

            <div className="tg-panel-section tg-history">
              <div className="tg-panel-section-title">
                Trade History {trades.length > 0 && <span className="tg-log-count">{trades.length}</span>}
              </div>
              {trades.length === 0 ? (
                <div className="tg-no-pos">No trades yet</div>
              ) : (
                <div className="tg-history-list">
                  {trades.map(t => (
                    <div key={t.id} className={`tg-history-row ${t.pl >= 0 ? 'win' : 'loss'}`}>
                      <div className="tg-history-meta">
                        <span className="tg-history-id">#{t.id}</span>
                        <span className="tg-td-muted" style={{ fontSize: '.7rem' }}>{t.entryDate} → {t.exitDate}</span>
                      </div>
                      <div className="tg-history-prices">
                        <span>${t.entryPrice.toFixed(2)}</span>
                        <span className="tg-arrow">→</span>
                        <span>${t.exitPrice.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span className={t.pl >= 0 ? 'tg-win' : 'tg-loss'} style={{ fontWeight: 700, fontSize: '.85rem' }}>
                          {t.pl >= 0 ? '+' : ''}${t.pl.toFixed(2)}
                        </span>
                        <span className={t.plPct >= 0 ? 'tg-win' : 'tg-loss'} style={{ fontSize: '.8rem' }}>
                          {t.plPct >= 0 ? '+' : ''}{t.plPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
