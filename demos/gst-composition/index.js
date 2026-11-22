// GST Composition (CMP-08) Tax Engine — interactive demo.
// Mirrors gig_IN_GST_COMP/model.py (GSTCompositionEngine.evaluate_quarter)
// so browser computation matches the certified Python engine exactly.
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const SPECIAL_CATEGORY_STATES = ['AR', 'MN', 'ML', 'MZ', 'NL', 'SK', 'TR', 'UK'];

  function round2(n) {
    return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
  }

  function evaluateQuarter(businessType, stateCode, prevFyTurnover, currentFyYtdTurnover, quarterTaxable, quarterExempt, hasInterstate) {
    const validTypes = ['manufacturer', 'trader', 'restaurant', 'service'];
    if (!validTypes.includes(businessType)) {
      throw new Error('Invalid business type');
    }
    if ([prevFyTurnover, currentFyYtdTurnover, quarterTaxable, quarterExempt].some(v => v < 0)) {
      throw new Error('Monetary values must be >= 0');
    }

    let turnoverLimit;
    if (businessType === 'service') {
      turnoverLimit = 5000000;
    } else if (SPECIAL_CATEGORY_STATES.includes((stateCode || '').toUpperCase())) {
      turnoverLimit = 7500000;
    } else {
      turnoverLimit = 15000000;
    }

    if (hasInterstate) {
      return { eligible: false, turnoverLimit, taxableBase: 0, cgst: 0, sgst: 0, totalTax: 0, mustFileCmp04: true, reason: 'interstate_supply_disallowed' };
    }
    if (prevFyTurnover > turnoverLimit) {
      return { eligible: false, turnoverLimit, taxableBase: 0, cgst: 0, sgst: 0, totalTax: 0, mustFileCmp04: false, reason: 'prev_fy_limit_exceeded' };
    }

    const mustFileCmp04 = currentFyYtdTurnover > turnoverLimit;

    let base, totalRate;
    if (businessType === 'trader') {
      base = quarterTaxable; totalRate = 0.01;
    } else if (businessType === 'manufacturer') {
      base = quarterTaxable + quarterExempt; totalRate = 0.01;
    } else if (businessType === 'restaurant') {
      base = quarterTaxable + quarterExempt; totalRate = 0.05;
    } else { // service
      base = quarterTaxable + quarterExempt; totalRate = 0.06;
    }

    const cgst = Math.round((base * totalRate / 2) * 100) / 100;
    const sgst = cgst;
    const totalTax = Math.round((cgst + sgst) * 100) / 100;

    return {
      eligible: true,
      turnoverLimit,
      taxableBase: Math.round(base * 100) / 100,
      cgst,
      sgst,
      totalTax,
      mustFileCmp04,
      reason: 'eligible',
    };
  }

  const form = document.getElementById('gstForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const businessType = document.getElementById('businessType').value;
      const stateCode = document.getElementById('stateCode').value.trim();
      const prevFy = parseFloat(document.getElementById('prevFyTurnover').value) || 0;
      const currentYtd = parseFloat(document.getElementById('currentFyYtdTurnover').value) || 0;
      const qTaxable = parseFloat(document.getElementById('quarterTaxable').value) || 0;
      const qExempt = parseFloat(document.getElementById('quarterExempt').value) || 0;
      const hasInterstate = document.getElementById('hasInterstate').checked;

      const r = evaluateQuarter(businessType, stateCode, prevFy, currentYtd, qTaxable, qExempt, hasInterstate);

      const results = document.getElementById('results');
      results.style.display = 'block';

      const statusBadge = document.getElementById('statusBadge');
      if (r.eligible) {
        statusBadge.innerHTML = '<span class="status-ok">ELIGIBLE for CMP-08 Composition Scheme</span>';
      } else {
        statusBadge.innerHTML = '<span class="status-conflict">NOT ELIGIBLE — ' + r.reason + '</span>';
      }

      document.getElementById('turnoverLimit').textContent = 'Turnover Limit: ₹' + r.turnoverLimit.toLocaleString('en-IN');
      document.getElementById('taxableBase').textContent = 'Taxable Base: ₹' + round2(r.taxableBase);
      document.getElementById('cgst').textContent = 'CGST: ₹' + round2(r.cgst);
      document.getElementById('sgst').textContent = 'SGST: ₹' + round2(r.sgst);
      document.getElementById('totalTax').textContent = 'Total Tax: ₹' + round2(r.totalTax);
      document.getElementById('cmp04Warning').textContent = r.mustFileCmp04 ? '⚠ Must file CMP-04 (YTD turnover exceeded limit)' : 'CMP-04 not required';
      document.getElementById('reasonText').textContent = 'Reason: ' + r.reason;
    } catch (err) {
      alert(err.message);
    }
  });
});