/**
 * Production Candlestick Chart Engine in JavaScript.
 * Mirrors chart_engine.py exact calculations and algorithms.
 */

class CandlestickChart {
  constructor(candles, emaPeriod = 3) {
    if (emaPeriod < 1) throw new Error("EMA period must be >= 1");
    this.candles = candles;
    this.emaPeriod = emaPeriod;
  }

  computeEMA() {
    const n = this.candles.length;
    const ema = new Array(n).fill(null);
    if (n < this.emaPeriod) return ema;

    let initialSum = 0;
    for (let i = 0; i < this.emaPeriod; i++) {
      initialSum += this.candles[i].close;
    }
    const sma = initialSum / this.emaPeriod;
    const startIdx = this.emaPeriod - 1;
    ema[startIdx] = sma;

    const multiplier = 2.0 / (this.emaPeriod + 1.0);
    let currEma = sma;
    for (let i = startIdx + 1; i < n; i++) {
      const close = this.candles[i].close;
      currEma = (close - currEma) * multiplier + currEma;
      ema[i] = currEma;
    }
    return ema;
  }

  static isDoji(candle) {
    const totalRange = candle.high - candle.low;
    if (totalRange <= 0) return true;
    const body = Math.abs(candle.close - candle.open);
    return body / totalRange <= 0.10;
  }

  static isHammer(candle) {
    const totalRange = candle.high - candle.low;
    if (totalRange <= 0) return false;

    const body = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;

    const hasLongLowerShadow =
      lowerShadow >= 2.0 * body && lowerShadow >= 0.5 * totalRange;
    const hasSmallUpperShadow =
      upperShadow <= Math.max(0.2 * body, 0.1 * totalRange);

    return Boolean(hasLongLowerShadow && hasSmallUpperShadow);
  }

  static isBullishEngulfing(prevCandle, currCandle) {
    const prevBearish = prevCandle.close < prevCandle.open;
    const currBullish = currCandle.close > currCandle.open;
    if (!(prevBearish && currBullish)) return false;

    return (
      currCandle.open <= prevCandle.close &&
      currCandle.close >= prevCandle.open
    );
  }

  detectPatterns() {
    const patterns = [];
    for (let i = 0; i < this.candles.length; i++) {
      const item = [];
      const c = this.candles[i];
      if (CandlestickChart.isDoji(c)) item.push("doji");
      if (CandlestickChart.isHammer(c)) item.push("hammer");
      if (i > 0 && CandlestickChart.isBullishEngulfing(this.candles[i - 1], c)) {
        item.push("bullish_engulfing");
      }
      patterns.push(item);
    }
    return patterns;
  }

  computeTrend() {
    const emaSeries = this.computeEMA();
    const validEma = emaSeries.filter((v) => v !== null);
    if (validEma.length < 2) return "neutral";

    const delta = validEma[validEma.length - 1] - validEma[validEma.length - 2];
    if (delta > 1e-9) return "up";
    if (delta < -1e-9) return "down";
    return "neutral";
  }

  analyze() {
    const ema = this.computeEMA();
    const patterns = this.detectPatterns();
    return this.candles.map((c, i) => ({
      index: i,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      ema: ema[i],
      patterns: patterns[i],
    }));
  }
}

// Sample dataset demonstrating Doji, Hammer, and Bullish Engulfing
const sampleCandles = [
  { open: 100.0, high: 102.5, low: 98.0, close: 101.0 },
  { open: 101.0, high: 103.0, low: 99.5, close: 100.0 }, // Bearish
  { open: 99.0, high: 105.0, low: 98.0, close: 104.0 },  // Bullish Engulfing
  { open: 104.0, high: 106.0, low: 102.0, close: 104.1 }, // Doji (body=0.1, range=4)
  { open: 104.0, high: 104.5, low: 95.0, close: 104.2 },  // Hammer (long lower shadow)
  { open: 104.5, high: 108.0, low: 103.5, close: 107.5 },
  { open: 107.5, high: 110.0, low: 106.0, close: 109.0 },
];

function renderTable(analysis) {
  const tbody = document.getElementById("candle-data");
  tbody.innerHTML = "";
  analysis.forEach((row) => {
    const tr = document.createElement("tr");
    const patternTags = row.patterns
      .map((p) => `<span class="tag ${p}">${p}</span>`)
      .join("");
    tr.innerHTML = `
      <td>${row.index + 1}</td>
      <td>${row.open.toFixed(2)}</td>
      <td>${row.high.toFixed(2)}</td>
      <td>${row.low.toFixed(2)}</td>
      <td>${row.close.toFixed(2)}</td>
      <td>${row.ema !== null ? row.ema.toFixed(2) : "--"}</td>
      <td>${patternTags || '<span style="color:#64748b">none</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCanvas(analysis) {
  const canvas = document.getElementById("chartCanvas");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 30, right: 40, bottom: 40, left: 50 };

  // Calculate scales
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  analysis.forEach((c) => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    if (c.ema !== null) {
      if (c.ema < minPrice) minPrice = c.ema;
      if (c.ema > maxPrice) maxPrice = c.ema;
    }
  });

  const priceRange = maxPrice - minPrice || 1;
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const getY = (val) => padding.top + plotH * (1 - (val - minPrice) / priceRange);
  const getX = (idx) => padding.left + (idx + 0.5) * (plotW / analysis.length);
  const candleW = Math.max(8, plotW / analysis.length * 0.55);

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const price = minPrice + (priceRange / 4) * i;
    const y = getY(price);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(price.toFixed(1), padding.left - 8, y + 4);
  }

  // Draw Candlesticks
  analysis.forEach((c) => {
    const x = getX(c.index);
    const yOpen = getY(c.open);
    const yClose = getY(c.close);
    const yHigh = getY(c.high);
    const yLow = getY(c.low);
    const isBullish = c.close >= c.open;
    const color = isBullish ? "#22c55e" : "#ef4444";

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyHeight);

    // Pattern dot indicator
    if (c.patterns.length > 0) {
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(x, yHigh - 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw EMA Line
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let firstValid = true;
  analysis.forEach((c) => {
    if (c.ema !== null) {
      const x = getX(c.index);
      const y = getY(c.ema);
      if (firstValid) {
        ctx.moveTo(x, y);
        firstValid = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

window.addEventListener("DOMContentLoaded", () => {
  const chart = new CandlestickChart(sampleCandles, 3);
  const analysis = chart.analyze();
  const trend = chart.computeTrend();

  const trendBadge = document.getElementById("trend-badge");
  trendBadge.textContent = trend;
  trendBadge.className = `badge ${trend}`;

  renderTable(analysis);
  renderCanvas(analysis);
  window.addEventListener("resize", () => renderCanvas(analysis));
});