// ============================================================
// pages/TradingGroundsPage.jsx — Paper trading simulator
//
// Chart engine : TradingView Lightweight Charts (CDN)
// Indicators   : SMA 20/50/200, Bollinger Bands, Auto Darvas, VWAP,
//                RSI (14), MACD (12,26,9), ATR (14), Fibonacci Retracement
// Drawing tools: Manual Darvas Box (canvas overlay), Fibonacci
// Layout       : full-width chart left + trading panel right
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

// ── Config ────────────────────────────────────────────────────────────────────
const HISTORY    = 350;
const TICK_S     = 86400; // 1 day per candle
const START      = 148.50;
const SCRIPT_ID  = 'lw-charts-cdn';
const SCRIPT_SRC = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js';

const FIB_LEVELS = [
  { r: 0,     label: '0%',    color: '#8A9BB0' },
  { r: 0.236, label: '23.6%', color: '#5B9CF6' },
  { r: 0.382, label: '38.2%', color: '#00C896' },
  { r: 0.5,   label: '50%',   color: '#D4A017' },
  { r: 0.618, label: '61.8%', color: '#F0A500' },
  { r: 0.786, label: '78.6%', color: '#A855F7' },
  { r: 1,     label: '100%',  color: '#F04E4E' },
];

// ── Candle generator ──────────────────────────────────────────────────────────
function buildSeed(count) {
  const now = Math.floor(Date.now() / 1000);
  const candles = [];
  let p = START;
  for (let i = count - 1; i >= 0; i--) {
    const v = p * 0.014;
    const m = (Math.random() - 0.48) * v;
    const open  = p;
    const close = Math.max(0.01, open + m);
    candles.push({
      time:   now - i * TICK_S,
      open,
      high:   Math.max(open, close) + Math.random() * v * 0.55,
      low:    Math.min(open, close) - Math.random() * v * 0.55,
      close,
      volume: Math.floor(400000 + Math.random() * 1600000),
    });
    p = close;
  }
  return candles;
}

function nextCandle(prev) {
  const v = prev.close * 0.014;
  const m = (Math.random() - 0.48) * v;
  const open  = prev.close;
  const close = Math.max(0.01, open + m);
  return {
    time:   prev.time + TICK_S,
    open,
    high:   Math.max(open, close) + Math.random() * v * 0.55,
    low:    Math.min(open, close) - Math.random() * v * 0.55,
    close,
    volume: Math.floor(400000 + Math.random() * 1600000),
  };
}

// ── Indicator math ────────────────────────────────────────────────────────────
function calcSMA(candles, period) {
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
    result.push({ time: candles[i].time, value: sum / period });
  }
  return result;
}

function calcBB(candles, period = 20) {
  const upper = [], mid = [], lower = [];
  candles.forEach((c, i) => {
    if (i < period - 1) return;
    const sl   = candles.slice(i - period + 1, i + 1);
    const mean = sl.reduce((s, x) => s + x.close, 0) / period;
    const sd   = Math.sqrt(sl.reduce((s, x) => s + (x.close - mean) ** 2, 0) / period);
    upper.push({ time: c.time, value: mean + 2 * sd });
    mid.push(  { time: c.time, value: mean });
    lower.push({ time: c.time, value: mean - 2 * sd });
  });
  return { upper, mid, lower };
}

function calcRSI(candles, period = 14) {
  const result = [];
  for (let i = period; i < candles.length; i++) {
    let g = 0, l = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = candles[j].close - candles[j - 1].close;
      if (d > 0) g += d; else l -= d;
    }
    const ag = g / period, al = l / period;
    result.push({ time: candles[i].time, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
  }
  return result;
}

function calcMACD(candles) {
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
  let e12 = candles[0].close, e26 = candles[0].close, sig = 0;
  const ml = [], sl = [], hl = [];
  candles.forEach((c, i) => {
    e12 = c.close * k12 + e12 * (1 - k12);
    e26 = c.close * k26 + e26 * (1 - k26);
    const m = e12 - e26;
    sig = i === 0 ? m : m * k9 + sig * (1 - k9);
    const h = m - sig;
    ml.push({ time: c.time, value: m });
    sl.push({ time: c.time, value: sig });
    hl.push({ time: c.time, value: h, color: h >= 0 ? 'rgba(0,200,150,0.7)' : 'rgba(240,78,78,0.7)' });
  });
  return { ml, sl, hl };
}

function calcDarvas(candles, n = 4) {
  const boxes = [];
  let i = n;
  while (i < candles.length - n) {
    const hi  = candles[i].high;
    let isTop = true;
    for (let j = 1; j <= n; j++) if (candles[i + j].high > hi) { isTop = false; break; }
    if (!isTop) { i++; continue; }
    const bot = Math.min(...candles.slice(i - n, i + n + 1).map(c => c.low));
    let end = i;
    for (let j = i + 1; j < candles.length; j++) {
      if (candles[j].high > hi * 1.004 || candles[j].low < bot * 0.996) break;
      end = j;
    }
    if (end > i + 2) { boxes.push({ top: hi, bottom: bot }); i = end + 1; }
    else i++;
  }
  return boxes;
}

function calcVWAP(candles) {
  let cumVol = 0, cumPV = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumVol += c.volume; cumPV += tp * c.volume;
    return { time: c.time, value: cumPV / cumVol };
  });
}

function calcATR(candles, period = 14) {
  if (candles.length < 2) return [];
  const trs = candles.map((c, i) => i === 0
    ? c.high - c.low
    : Math.max(c.high - c.low, Math.abs(c.high - candles[i-1].close), Math.abs(c.low - candles[i-1].close))
  );
  const result = [];
  for (let i = period - 1; i < trs.length; i++) {
    result.push({ time: candles[i].time, value: trs.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period });
  }
  return result;
}

// ── Indicator catalogue (for search dropdown) ─────────────────────────────────
const INDICATOR_CATALOG = [
  { key: 'sma20',  label: 'SMA 20',          group: 'Moving Average', dot: '#5B9CF6', desc: 'Simple Moving Average (20-period)' },
  { key: 'sma50',  label: 'SMA 50',          group: 'Moving Average', dot: '#F0A500', desc: 'Simple Moving Average (50-period)' },
  { key: 'sma200', label: 'SMA 200',         group: 'Moving Average', dot: '#A855F7', desc: 'Simple Moving Average (200-period)' },
  { key: 'bb',     label: 'Bollinger Bands', group: 'Overlay',        dot: '#8A9BB0', desc: 'Bollinger Bands (20, ±2σ)' },
  { key: 'darvas', label: 'Auto Darvas',     group: 'Overlay',        dot: '#D4A017', desc: 'Darvas Box auto-detection' },
  { key: 'vwap',   label: 'VWAP',           group: 'Overlay',        dot: '#F04E4E', desc: 'Volume Weighted Average Price' },
  { key: 'rsi',    label: 'RSI (14)',        group: 'Sub-Chart',      dot: '#00C896', desc: 'Relative Strength Index, 14-period' },
  { key: 'macd',   label: 'MACD (12,26,9)', group: 'Sub-Chart',      dot: '#5B9CF6', desc: 'MACD — 12/26 EMAs, 9-period signal' },
  { key: 'atr',    label: 'ATR (14)',        group: 'Sub-Chart',      dot: '#D4A017', desc: 'Average True Range, 14-period' },
];

// ── Chart component ───────────────────────────────────────────────────────────
function TradingChart({
  candles, position, enabled,
  fibState, manualBoxes, boxDrawState, hLines,
  onChartClick, theme, lwReady,
}) {
  const mainRef  = useRef(null);
  const rsiRef   = useRef(null);
  const macdRef  = useRef(null);
  const atrRef   = useRef(null);
  const canvasRef= useRef(null);
  const chartRef = useRef(null);
  const rsiCRef  = useRef(null);
  const macdCRef = useRef(null);
  const atrCRef  = useRef(null);
  const S        = useRef({});
  const fibLines  = useRef([]);
  const hLineRefs = useRef([]);
  const entryLine = useRef(null);

  const onClickRef  = useRef(onChartClick);
  const boxesRef    = useRef(manualBoxes);
  const boxDrawRef  = useRef(boxDrawState);
  const hoverRef    = useRef(null);

  useEffect(() => { onClickRef.current = onChartClick; }, [onChartClick]);
  useEffect(() => { boxesRef.current   = manualBoxes;  scheduleDraw(); }, [manualBoxes]);   // eslint-disable-line
  useEffect(() => { boxDrawRef.current = boxDrawState; scheduleDraw(); }, [boxDrawState]);  // eslint-disable-line

  const isDark = theme === 'dark';

  const chartTheme = useCallback((dark) => ({
    layout: { background: { color: dark ? '#0B1219' : '#FFFFFF' }, textColor: dark ? '#8A96B0' : '#4A5570' },
    grid:   { vertLines: { color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
               horzLines: { color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' } },
  }), []);

  // ── Canvas redraw ─────────────────────────────────────────────────────────
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

  // ── Init charts ───────────────────────────────────────────────────────────
  useEffect(() => {
    const LW = window.LightweightCharts;
    if (!LW || !mainRef.current || !rsiRef.current || !macdRef.current || !atrRef.current) return;

    const base = (h) => ({
      ...chartTheme(isDark),
      width: 0, height: h,
      rightPriceScale: { borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
      timeScale: { borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', timeVisible: true, secondsVisible: false, rightOffset: 20 },
      crosshair: { mode: 1 },
      handleScroll: true, handleScale: true,
    });

    const chart = LW.createChart(mainRef.current, base(440));
    chartRef.current = chart;

    S.current.candles = chart.addCandlestickSeries({
      upColor: '#00C896', downColor: '#F04E4E',
      borderUpColor: '#00C896', borderDownColor: '#F04E4E',
      wickUpColor:   '#00C896', wickDownColor:   '#F04E4E',
    });
    S.current.volume = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chart.subscribeClick((param) => {
      if (!param.point || !param.time) return;
      const price = S.current.candles.coordinateToPrice(param.point.y);
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

    // RSI
    const rsiChart = LW.createChart(rsiRef.current, {
      ...base(90),
      timeScale: { visible: false, rightOffset: 20 },
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
    });
    rsiCRef.current = rsiChart;
    S.current.rsiLine = rsiChart.addLineSeries({ color: '#00C896', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    S.current.rsiLine.createPriceLine({ price: 70, color: '#F04E4E', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'OB' });
    S.current.rsiLine.createPriceLine({ price: 30, color: '#00C896', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'OS' });
    S.current.rsiLine.createPriceLine({ price: 50, color: '#4A5570', lineWidth: 1, lineStyle: 3, axisLabelVisible: false });

    // MACD
    const macdChart = LW.createChart(macdRef.current, {
      ...base(90),
      timeScale: { visible: false, rightOffset: 20 },
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
    });
    macdCRef.current = macdChart;
    S.current.macdHist = macdChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    S.current.macdLine = macdChart.addLineSeries({ color: '#5B9CF6', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    S.current.macdSig  = macdChart.addLineSeries({ color: '#F0A500', lineWidth: 1.2, priceLineVisible: false, lastValueVisible: false });

    // ATR
    const atrChart = LW.createChart(atrRef.current, {
      ...base(90),
      timeScale: { visible: false, rightOffset: 20 },
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
    });
    atrCRef.current = atrChart;
    S.current.atrLine = atrChart.addLineSeries({ color: '#D4A017', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });

    // Sync time scales
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (!range) return;
      rsiChart.timeScale().setVisibleLogicalRange(range);
      macdChart.timeScale().setVisibleLogicalRange(range);
      atrChart.timeScale().setVisibleLogicalRange(range);
    });

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      const w = mainRef.current?.clientWidth;
      const h = mainRef.current?.clientHeight || 440;
      if (!w) return;
      chart.applyOptions({ width: w });
      rsiChart.applyOptions({ width: w });
      macdChart.applyOptions({ width: w });
      atrChart.applyOptions({ width: w });
      if (canvasRef.current) {
        canvasRef.current.width  = w;
        canvasRef.current.height = h;
        requestAnimationFrame(redrawCanvas);
      }
    });
    ro.observe(mainRef.current);

    requestAnimationFrame(() => {
      const w = mainRef.current?.clientWidth;
      const h = mainRef.current?.clientHeight || 440;
      if (w) {
        chart.applyOptions({ width: w });
        rsiChart.applyOptions({ width: w });
        macdChart.applyOptions({ width: w });
        atrChart.applyOptions({ width: w });
        if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
      }
    });

    return () => {
      ro.disconnect();
      chart.remove();     chartRef.current = null;
      rsiChart.remove();  rsiCRef.current  = null;
      macdChart.remove(); macdCRef.current = null;
      atrChart.remove();  atrCRef.current  = null;
      S.current = {};
    };
  }, [lwReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync theme ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = chartTheme(isDark);
    chartRef.current?.applyOptions(t);
    rsiCRef.current?.applyOptions(t);
    macdCRef.current?.applyOptions(t);
    atrCRef.current?.applyOptions(t);
  }, [isDark, chartTheme]);

  // ── Feed candle data + indicators ─────────────────────────────────────────
  useEffect(() => {
    const s = S.current;
    if (!s.candles) return;

    s.candles.setData(candles.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    s.volume.setData(candles.map(c => ({
      time: c.time, value: c.volume,
      color: c.close >= c.open ? 'rgba(0,200,150,0.35)' : 'rgba(240,78,78,0.35)',
    })));

    const setLine = (key, data, color, width = 1.5) => {
      if (enabled[key]) {
        if (!s[key]) s[key] = chartRef.current?.addLineSeries({ color, lineWidth: width, priceLineVisible: false, lastValueVisible: false });
        s[key]?.setData(data);
      } else if (s[key]) { chartRef.current?.removeSeries(s[key]); s[key] = null; }
    };

    setLine('sma20',  calcSMA(candles, 20),  '#5B9CF6');
    setLine('sma50',  calcSMA(candles, 50),  '#F0A500');
    setLine('sma200', calcSMA(candles, 200), '#A855F7');
    setLine('vwap',   calcVWAP(candles),     '#F04E4E');

    if (enabled.bb) {
      const bb = calcBB(candles);
      if (!s.bbU) {
        const o = { priceLineVisible: false, lastValueVisible: false };
        s.bbU = chartRef.current?.addLineSeries({ ...o, color: 'rgba(138,155,176,0.6)',  lineWidth: 1 });
        s.bbM = chartRef.current?.addLineSeries({ ...o, color: 'rgba(138,155,176,0.35)', lineWidth: 1, lineStyle: 2 });
        s.bbL = chartRef.current?.addLineSeries({ ...o, color: 'rgba(138,155,176,0.6)',  lineWidth: 1 });
      }
      s.bbU?.setData(bb.upper); s.bbM?.setData(bb.mid); s.bbL?.setData(bb.lower);
    } else {
      ['bbU','bbM','bbL'].forEach(k => { if (s[k]) { chartRef.current?.removeSeries(s[k]); s[k] = null; } });
    }

    if (enabled.darvas) {
      const boxes = calcDarvas(candles);
      if (boxes.length) {
        const last = boxes[boxes.length - 1];
        if (!s.darvasTop) {
          s.darvasTop = s.candles.createPriceLine({ price: last.top,    color: '#D4A017', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Darvas ▲' });
          s.darvasBot = s.candles.createPriceLine({ price: last.bottom, color: '#D4A017', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Darvas ▼' });
        } else {
          s.darvasTop.applyOptions({ price: last.top });
          s.darvasBot.applyOptions({ price: last.bottom });
        }
      }
    } else if (s.darvasTop) {
      s.candles.removePriceLine(s.darvasTop); s.candles.removePriceLine(s.darvasBot);
      s.darvasTop = null; s.darvasBot = null;
    }

    s.rsiLine?.setData(calcRSI(candles));
    const m = calcMACD(candles);
    s.macdHist?.setData(m.hl); s.macdLine?.setData(m.ml); s.macdSig?.setData(m.sl);
    if (enabled.atr) s.atrLine?.setData(calcATR(candles));

    chartRef.current?.timeScale().scrollToRealTime();
    requestAnimationFrame(redrawCanvas);
  }, [candles, enabled, redrawCanvas]);

  // ── Entry price line ──────────────────────────────────────────────────────
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
    if (fibState.p1 != null && fibState.p2 != null) {
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
    hLineRefs.current = hLines.map(hl =>
      cs.createPriceLine({ price: hl.price, color: '#5B9CF6', lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: `$${hl.price.toFixed(2)}` })
    );
  }, [hLines]);

  const isDrawing = fibState.active || boxDrawState.active;

  return (
    <div className="tg-chart-area" style={{ cursor: isDrawing ? 'crosshair' : 'default' }}>
      <div style={{ position: 'relative' }}>
        <div ref={mainRef} className="tg-lw-main" />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
        />
      </div>
      {enabled.rsi  && <div className="tg-sub-label">RSI (14)</div>}
      <div ref={rsiRef}  className="tg-lw-sub" style={{ display: enabled.rsi  ? 'block' : 'none' }} />
      {enabled.macd && <div className="tg-sub-label">MACD (12, 26, 9)</div>}
      <div ref={macdRef} className="tg-lw-sub" style={{ display: enabled.macd ? 'block' : 'none' }} />
      {enabled.atr  && <div className="tg-sub-label">ATR (14)</div>}
      <div ref={atrRef}  className="tg-lw-sub" style={{ display: enabled.atr  ? 'block' : 'none' }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TradingGroundsPage() {
  const { theme } = useTheme();

  const [lwReady,      setLwReady]      = useState(() => !!window.LightweightCharts);
  const [candles,      setCandles]      = useState(() => buildSeed(HISTORY));
  const [position,     setPosition]     = useState(null);
  const [trades,       setTrades]       = useState([]);
  const [enabled,      setEnabled]      = useState({
    sma20: true, sma50: true, sma200: false,
    bb: false, darvas: false, vwap: false,
    rsi: false, macd: false, atr: false,
  });
  const [fibState,     setFibState]     = useState({ active: false, p1: null, p2: null });
  const [manualBoxes,  setManualBoxes]  = useState([]);
  const [boxDrawState, setBoxDrawState] = useState({ active: false, p1: null });
  const [hLines,       setHLines]       = useState([]);
  const [hLineActive,  setHLineActive]  = useState(false);
  const hLineActiveRef = useRef(false);
  const [indSearch,    setIndSearch]    = useState('');
  const [indOpen,      setIndOpen]      = useState(false);


  const currentPrice = candles[candles.length - 1]?.close ?? START;

  // ── Load Lightweight Charts script ────────────────────────────────────────
  useEffect(() => {
    if (window.LightweightCharts) { setLwReady(true); return; }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) { existing.addEventListener('load', () => setLwReady(true), { once: true }); return; }
    const s = document.createElement('script');
    s.id = SCRIPT_ID; s.src = SCRIPT_SRC; s.async = true;
    s.onload = () => setLwReady(true);
    document.head.appendChild(s);
  }, []);

  // ── Candle tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setCandles(prev => { const c = nextCandle(prev[prev.length - 1]); return [...prev.slice(-(HISTORY - 1)), c]; });
    }, 2000); // new daily candle every 2 real seconds
    return () => clearInterval(id);
  }, []);

  // Keep hLineActiveRef in sync
  useEffect(() => { hLineActiveRef.current = hLineActive; }, [hLineActive]);

  // ── Chart click (fib + darvas box + h-line) ──────────────────────────────
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

  const toggle = key => setEnabled(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Trading ───────────────────────────────────────────────────────────────
  const unrealPL   = position ? currentPrice - position.entryPrice : null;
  const unrealPct  = unrealPL != null ? (unrealPL / position.entryPrice) * 100 : null;
  const realisedPL = trades.reduce((s, t) => s + t.pl, 0);
  const winRate    = trades.length ? ((trades.filter(t => t.pl > 0).length / trades.length) * 100).toFixed(0) : null;

  const handleBuy = () => {
    if (position) return;
    setPosition({ entryPrice: currentPrice, entryTime: new Date().toLocaleTimeString() });
  };
  const handleSell = () => {
    if (!position) return;
    const pl = currentPrice - position.entryPrice;
    setTrades(prev => [{
      id: prev.length + 1, entryPrice: position.entryPrice, exitPrice: currentPrice,
      pl, plPct: (pl / position.entryPrice) * 100,
      entryTime: position.entryTime, exitTime: new Date().toLocaleTimeString(),
    }, ...prev]);
    setPosition(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="tg-page">
      <div className="page-hero">
        <p className="hero-eyebrow">Practice Mode</p>
        <h1 className="hero-title">Trading Grounds</h1>
        <p className="hero-sub">Live candlestick simulator — practice BUY &amp; SELL with no real money.</p>
      </div>

      <div className="tg-body">

        {/* ── Indicator toolbar ──────────────────────────────────────────── */}
        <div className="tg-toolbar">

          <div className="tg-toolbar-group">
            <span className="tg-toolbar-label">Moving Avg</span>
            {[
              { key: 'sma20',  label: 'SMA 20',  dot: '#5B9CF6' },
              { key: 'sma50',  label: 'SMA 50',  dot: '#F0A500' },
              { key: 'sma200', label: 'SMA 200', dot: '#A855F7' },
            ].map(({ key, label, dot }) => (
              <button key={key} className={`tg-ind-btn${enabled[key] ? ' active' : ''}`}
                style={enabled[key] ? { borderColor: dot, color: dot } : {}} onClick={() => toggle(key)}>
                <span className="tg-ind-dot" style={{ background: dot }} />{label}
              </button>
            ))}
          </div>

          <div className="tg-toolbar-group">
            <span className="tg-toolbar-label">Overlays</span>
            {[
              { key: 'darvas', label: 'Auto Darvas', dot: '#D4A017' },
            ].map(({ key, label, dot }) => (
              <button key={key} className={`tg-ind-btn${enabled[key] ? ' active' : ''}`}
                style={enabled[key] ? { borderColor: dot, color: dot } : {}} onClick={() => toggle(key)}>
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
              <button key={key} className={`tg-ind-btn${enabled[key] ? ' active' : ''}`}
                style={enabled[key] ? { borderColor: dot, color: dot } : {}} onClick={() => toggle(key)}>
                <span className="tg-ind-dot" style={{ background: dot }} />{label}
              </button>
            ))}
          </div>

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

            {/* Horizontal line */}
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

          {/* ── Indicator search ─────────────────────────────────────────── */}
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
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
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
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
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
                        {filtered.filter(ind => ind.group === group).map(ind => (
                          <div
                            key={ind.key}
                            onClick={() => toggle(ind.key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 8px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
                              background: enabled[ind.key] ? `${ind.dot}18` : 'transparent',
                              border: `1px solid ${enabled[ind.key] ? `${ind.dot}40` : 'transparent'}`,
                              transition: 'background .15s, border-color .15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = enabled[ind.key] ? `${ind.dot}28` : 'var(--bg)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = enabled[ind.key] ? `${ind.dot}18` : 'transparent'; }}
                          >
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: ind.dot, flexShrink: 0, boxShadow: `0 0 6px ${ind.dot}88` }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--text)' }}>{ind.label}</div>
                              <div style={{ fontSize: '.71rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ind.desc}</div>
                            </div>
                            <span style={{
                              fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                              background: enabled[ind.key] ? ind.dot : 'var(--border)',
                              color: enabled[ind.key] ? '#fff' : 'var(--muted)',
                              flexShrink: 0, letterSpacing: '.03em',
                            }}>
                              {enabled[ind.key] ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Chart + Panel layout ───────────────────────────────────────── */}
        <div className="tg-layout">

          <div className="tg-chart-col">
            {!lwReady ? (
              <div className="tg-chart-loading">
                <div className="tg-spinner" />
                <span>Loading chart engine…</span>
              </div>
            ) : (
              <TradingChart
                candles={candles}
                position={position}
                enabled={enabled}
                fibState={fibState}
                manualBoxes={manualBoxes}
                boxDrawState={boxDrawState}
                hLines={hLines}
                onChartClick={handleChartClick}
                theme={theme}
                lwReady={lwReady}
              />
            )}
          </div>

          {/* Right: trading panel */}
          <div className="tg-panel">

            <div className="tg-panel-price">
              <div className="tg-panel-ticker">
                <span className="tg-ticker">SMM / SIM</span>
                <span className="tg-live-badge"><span className="tg-live-dot" />LIVE</span>
              </div>
              <div className="tg-panel-big">${currentPrice.toFixed(2)}</div>
            </div>

            <div className="tg-panel-stats">
              <div className="tg-ps">
                <div className="tg-ps-label">Total Gains</div>
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

            <div className="tg-panel-section">
              <div className="tg-panel-section-title">Position</div>
              {position ? (
                <div className="tg-pos-grid">
                  <div><div className="tg-ps-label">Entry</div><div className="tg-ps-val">${position.entryPrice.toFixed(2)}</div></div>
                  <div><div className="tg-ps-label">Current</div><div className="tg-ps-val" style={{ color: '#D4A017' }}>${currentPrice.toFixed(2)}</div></div>
                  <div>
                    <div className="tg-ps-label">P&amp;L ($)</div>
                    <div className="tg-ps-val" style={{ color: unrealPL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {unrealPL >= 0 ? '+' : ''}${unrealPL.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="tg-ps-label">P&amp;L (%)</div>
                    <div className="tg-ps-val" style={{ color: unrealPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {unrealPct >= 0 ? '+' : ''}{unrealPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tg-no-pos">No open position</div>
              )}
            </div>

            <div className="tg-panel-btns">
              <button className="tg-btn tg-btn-buy"  onClick={handleBuy}  disabled={!!position}>▲ BUY</button>
              <button className="tg-btn tg-btn-sell" onClick={handleSell} disabled={!position}>▼ SELL</button>
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
                        <span className="tg-td-muted" style={{ fontSize: '.72rem' }}>{t.entryTime} → {t.exitTime}</span>
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
