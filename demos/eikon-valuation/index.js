// Eikon-Grade Valuation Engine — interactive demo.
// Mirrors gig_DEEP_EIKON_FIN/model.py (ema, detect_patterns, compute_valuation)
// so browser computation matches the certified Python engine exactly.
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  function round2(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function computeValuation(price, trailingEps, forwardEps, growthPct) {
    if (price <= 0) throw new Error('Price must be > 0');
    const trailingPe = trailingEps > 0 ? round2(price / trailingEps) : 'N/A';
    const forwardPe = forwardEps > 0 ? round2(price / forwardEps) : 'N/A';
    const peg = trailingEps > 0 && growthPct > 0 ? round2((price / trailingEps) / growthPct) : 'N/A';
    const yieldPct = round2((trailingEps / price) * 100) + '%';
    return { trailingPe, forwardPe, peg, yieldPct };
  }

  function computeEma(closes, period) {
    const result = new Array(closes.length).fill(null);
    if (closes.length < period) return result;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    let prev = sum / period;
    result[period - 1] = round2(prev);
    const mult = 2 / (period + 1);
    for (let i = period; i < closes.length; i++) {
      const curr = (closes[i] - prev) * mult + prev;
      result[i] = round2(curr);
      prev = curr;
    }
    return result;
  }

  function detectPatterns(candles) {
    const matches = {};
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const patterns = [];
      const body = Math.abs(c.close - c.open);
      const rng = c.high - c.low;
      if (rng > 0) {
        if (body <= rng * 0.10) patterns.push('doji');
        const lowerShadow = Math.min(c.open, c.close) - c.low;
        const upperShadow = c.high - Math.max(c.open, c.close);
        if (body > 0 && lowerShadow >= 2 * body && upperShadow <= body * 0.30) {
          patterns.push('hammer');
        }
      }
      if (i >= 1) {
        const prev = candles[i - 1];
        if (prev.close < prev.open && c.close > c.open) {
          if (c.open <= prev.close && c.close >= prev.open) {
            patterns.push('bullish_engulfing');
          }
        }
      }
      if (patterns.length) matches[i] = patterns;
    }
    return matches;
  }

  const calcBtn = document.getElementById('calcValuationBtn');
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      try {
        const price = parseFloat(document.getElementById('price').value);
        const trailing = parseFloat(document.getElementById('trailing_eps').value);
        const forward = parseFloat(document.getElementById('forward_eps').value);
        const growth = parseFloat(document.getElementById('eps_growth').value);
        const res = computeValuation(price, trailing, forward, growth);
        document.getElementById('valTrailingPe').textContent = res.trailingPe;
        document.getElementById('valForwardPe').textContent = res.forwardPe;
        document.getElementById('valPegRatio').textContent = res.peg;
        document.getElementById('valEarningsYield').textContent = res.yieldPct;
      } catch (e) {
        alert(e.message);
      }
    });
  }

  // Sample candles (price OHLC) — pattern detection runs on these.
  const sampleCandles = [
    { open: 100, high: 102, low: 95, close: 90 },   // bearish
    { open: 89, high: 103, low: 88, close: 101 },   // bullish engulfing vs prev
    { open: 100.0, high: 105.0, low: 95.0, close: 100.5 },
    { open: 100.0, high: 102.5, low: 95.0, close: 102.0 },
  ];

  const patternBtn = document.getElementById('runPatternBtn');
  if (patternBtn) {
    patternBtn.addEventListener('click', () => {
      const closes = sampleCandles.map(c => c.close);
      const ema = computeEma(closes, 3);
      const patterns = detectPatterns(sampleCandles);
      const body = document.getElementById('candleBody');
      if (!body) return;
      body.innerHTML = '';
      sampleCandles.forEach((c, i) => {
        const tr = document.createElement('tr');
        const pats = patterns[i] ? patterns[i].join(', ') : '—';
        const cells = [i, c.open.toFixed(2), c.high.toFixed(2), c.low.toFixed(2), c.close.toFixed(2), ema[i] == null ? '—' : ema[i], pats];
        cells.forEach(v => {
          const td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    });
  }

  // Initial valuation render so the page shows values on load.
  if (calcBtn) calcBtn.click();
});