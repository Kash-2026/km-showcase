function roundToTwo(num) {
  return (Math.round((num + Number.EPSILON) * 100) / 100).toFixed(2);
}

function calculateQuote() {
  const unitCost = parseFloat(document.getElementById('partCost').value) || 0;
  const qty = parseInt(document.getElementById('partQty').value, 10) || 1;
  const markupPct = parseFloat(document.getElementById('partMarkup').value) || 0;
  const laborHours = parseFloat(document.getElementById('laborHours').value) || 0;
  const hourlyRate = parseFloat(document.getElementById('hourlyRate').value) || 0;
  const callout = parseFloat(document.getElementById('calloutFee').value) || 0;
  const taxPct = parseFloat(document.getElementById('taxRate').value) || 0;

  const partsCost = unitCost * qty;
  const partsBilled = partsCost * (1 + markupPct / 100);
  const laborBilled = laborHours * hourlyRate;
  const subtotal = partsBilled + laborBilled + callout;
  const tax = subtotal * (taxPct / 100);
  const total = subtotal + tax;
  const grossProfit = subtotal - partsCost;
  const grossMargin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;

  document.getElementById('resPartsCost').textContent = '$' + roundToTwo(partsCost);
  document.getElementById('resPartsBilled').textContent = '$' + roundToTwo(partsBilled);
  document.getElementById('resLabor').textContent = '$' + roundToTwo(laborBilled);
  document.getElementById('resCallout').textContent = '$' + roundToTwo(callout);
  document.getElementById('resSubtotal').textContent = '$' + roundToTwo(subtotal);
  document.getElementById('resTax').textContent = '$' + roundToTwo(tax);
  document.getElementById('resTotal').textContent = '$' + roundToTwo(total);
  document.getElementById('resProfit').textContent = '$' + roundToTwo(grossProfit);
  document.getElementById('resMargin').textContent = roundToTwo(grossMargin) + '%';
}

document.getElementById('calcBtn').addEventListener('click', calculateQuote);