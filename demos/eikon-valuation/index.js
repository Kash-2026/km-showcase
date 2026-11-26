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

  function drawCandleChart(candles, ema, patterns) {
    const canvas = document.getElementById('candleChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    const padL = 50, padR = 20, padT = 20, padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const maxP = Math.max(...highs);
    const minP = Math.min(...lows);
    const range = (maxP - minP) || 1;
    const y = p => padT + (maxP - p) / range * plotH;

    const n = candles.length;
    const slot = plotW / n;
    const cw = Math.min(slot * 0.6, 40);

    // grid + y labels
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 4; g++) {
      const val = maxP - (range * g / 4);
      const yy = y(val);
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.fillText(val.toFixed(1), padL - 6, yy + 3);
    }

    // EMA line
    if (ema) {
      ctx.beginPath();
      let started = false;
      ema.forEach((e, i) => {
        if (e == null) return;
        const cx = padL + slot * i + slot / 2;
        if (!started) { ctx.moveTo(cx, y(e)); started = true; }
        else ctx.lineTo(cx, y(e));
      });
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // candles
    candles.forEach((c, i) => {
      const cx = padL + slot * i + slot / 2;
      const up = c.close >= c.open;
      const color = up ? '#22c55e' : '#ef4444';
      // wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, y(c.high)); ctx.lineTo(cx, y(c.low)); ctx.stroke();
      // body
      const yo = y(c.open), yc = y(c.close);
      ctx.fillStyle = color;
      const top = Math.min(yo, yc);
      const hgt = Math.max(Math.abs(yc - yo), 1.5);
      ctx.fillRect(cx - cw / 2, top, cw, hgt);
      // pattern highlight
      const pats = patterns[i];
      if (pats && pats.length) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx, y(c.high) - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // x labels (index)
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    candles.forEach((c, i) => {
      const cx = padL + slot * i + slot / 2;
      ctx.fillText(String(i), cx, H - 10);
    });

    // legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#22c55e'; ctx.fillText('▲ up', padL, H - 10);
    ctx.fillStyle = '#ef4444'; ctx.fillText('▼ down', padL + 50, H - 10);
    ctx.fillStyle = '#f59e0b'; ctx.fillText('— EMA(3)', padL + 115, H - 10);
    ctx.fillStyle = '#38bdf8'; ctx.fillText('● pattern', padL + 195, H - 10);
  }

  const patternBtn = document.getElementById('runPatternBtn');
  if (patternBtn) {
    patternBtn.addEventListener('click', () => {
      const closes = sampleCandles.map(c => c.close);
      const ema = computeEma(closes, 3);
      const patterns = detectPatterns(sampleCandles);
      drawCandleChart(sampleCandles, ema, patterns);
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

  // P/E vs history — the decision layer. Compares a current P/E to its own
  // long-run average and to a bond benchmark to judge cheap / fair / expensive.
  function assessValuation(curPE, avgPE, bondYield) {
    if (!(curPE > 0) || !(avgPE > 0)) throw new Error('P/E values must be > 0');
    const diff = ((curPE - avgPE) / avgPE) * 100; // % premium (+) / discount (-)
    let verdict, cls;
    if (diff <= -10) { verdict = 'UNDERVALUED vs its own history'; cls = 'status-ok'; }
    else if (diff >= 10) { verdict = 'EXPENSIVE vs its own history'; cls = 'status-conflict'; }
    else { verdict = 'FAIRLY VALUED vs its own history'; cls = ''; }
    const earningsYield = 100 / curPE; // %
    const vsBond = earningsYield - bondYield;
    return { verdict, cls, diff, earningsYield, vsBond };
  }

  const assessBtn = document.getElementById('assessBtn');
  if (assessBtn) {
    assessBtn.addEventListener('click', () => {
      try {
        const curPE = parseFloat(document.getElementById('curPE').value);
        const avgPE = parseFloat(document.getElementById('avgPE10').value);
        const bond = parseFloat(document.getElementById('bondYield').value) || 0;
        const r = assessValuation(curPE, avgPE, bond);
        const vEl = document.getElementById('assessVerdict');
        vEl.textContent = r.verdict;
        vEl.className = 'card-value ' + r.cls;
        vEl.style.color = r.cls === 'status-ok' ? '#34d399' : (r.cls === 'status-conflict' ? '#f87171' : '#ffffff');
        const dir = r.diff >= 0 ? 'above' : 'below';
        const bondTxt = r.vsBond >= 0
          ? 'equities yield MORE than bonds'
          : 'equities yield LESS than bonds';
        document.getElementById('assessDetail').textContent =
          'Trading ' + Math.abs(r.diff).toFixed(1) + '% ' + dir + ' its 10-yr average. ' +
          'Earnings yield ' + r.earningsYield.toFixed(2) + '% vs bond ' + bond.toFixed(1) + '% — ' + bondTxt + '.';
      } catch (e) {
        alert(e.message);
      }
    });
  }

  // Initial valuation render so the page shows values on load.
  if (calcBtn) calcBtn.click();

  // ---- Ticker loading (real market data from embedded KM_TICKERS) ----
  const TICKERS = (typeof window !== 'undefined' && window.KM_TICKERS) ? window.KM_TICKERS : {};
  const sel = document.getElementById('tickerSelect');
  if (sel) {
    Object.keys(TICKERS).forEach(sym => {
      const opt = document.createElement('option');
      opt.value = sym;
      opt.textContent = sym + ' — ' + (TICKERS[sym].name || '');
      sel.appendChild(opt);
    });
  }

  function fmtCap(n) {
    if (!n) return '—';
    if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
    return String(n);
  }

  function drawTickerChart(candles) {
    const canvas = document.getElementById('tickerChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0b1120'; ctx.fillRect(0,0,W,H);
    const pad=40, plotW=W-2*pad, plotH=H-2*pad;
    const highs=candles.map(c=>c.h), lows=candles.map(c=>c.l);
    const maxP=Math.max(...highs), minP=Math.min(...lows), range=(maxP-minP)||1;
    const y=p=>pad+(maxP-p)/range*plotH;
    const n=candles.length, slot=plotW/n, cw=Math.min(slot*0.6,14);
    // grid
    ctx.strokeStyle='rgba(168,85,247,0.15)';
    for(let g=0;g<=4;g++){const yy=pad+plotH*g/4;ctx.beginPath();ctx.moveTo(pad,yy);ctx.lineTo(W-pad,yy);ctx.stroke();}
    // candles
    candles.forEach((c,i)=>{
      const cx=pad+slot*i+slot/2;
      const up=c.c>=c.o, color=up?'#34d399':'#f87171';
      ctx.strokeStyle=color; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(cx,y(c.h)); ctx.lineTo(cx,y(c.l)); ctx.stroke();
      ctx.fillStyle=color;
      const yo=y(c.o), yc=y(c.c);
      ctx.fillRect(cx-cw/2, Math.min(yo,yc), cw, Math.max(Math.abs(yc-yo),1.2));
    });
  }

  const loadBtn = document.getElementById('loadTickerBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const sym = sel ? sel.value : '';
      const d = TICKERS[sym];
      if (!d) { alert('Select a ticker first'); return; }
      const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = (v===null||v===undefined)?'—':v; };
      set('tPrice', d.price);
      set('tPE', d.trailingPE!=null ? d.trailingPE.toFixed(2) : '—');
      set('tFwdPE', d.forwardPE!=null ? d.forwardPE.toFixed(2) : '—');
      set('tEPS', d.eps!=null ? d.eps.toFixed(2) : '—');
      set('tMktCap', fmtCap(d.marketCap));
      set('t52w', (d.week52high!=null&&d.week52low!=null) ? (d.week52high+' / '+d.week52low) : '—');
      set('tVol', d.volume ? d.volume.toLocaleString() : '—');
      const stats=document.getElementById('tickerStats'); if(stats) stats.style.display='block';
      if (d.candles && d.candles.length) drawTickerChart(d.candles);
      // also populate the P/E calculator with this ticker's real numbers
      const pe=document.getElementById('price'); if(pe && d.price) pe.value=d.price;
      const te=document.getElementById('trailing_eps'); if(te && d.eps) te.value=d.eps;
      if (calcBtn) calcBtn.click();
    });
  }
});