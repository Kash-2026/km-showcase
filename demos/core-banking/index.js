function roundHalfUp(val) {
  return (Math.round((val + Number.EPSILON) * 100) / 100).toFixed(2);
}

function generateSchedule(principal, annualRatePct, months) {
  const schedule = [];
  const r = annualRatePct / 1200;
  let balance = principal;

  if (r === 0) {
    const baseEmi = Math.round((principal / months) * 100) / 100;
    for (let m = 1; m <= months; m++) {
      let principalPart;
      let ending;
      if (m === months) {
        principalPart = balance;
        ending = 0;
      } else {
        principalPart = baseEmi;
        ending = balance - principalPart;
      }
      balance = ending;
      schedule.push({
        month: m,
        payment: roundHalfUp(principalPart),
        principal: roundHalfUp(principalPart),
        interest: "0.00",
        ending_balance: roundHalfUp(ending)
      });
    }
    return schedule;
  }

  const onePlusRN = Math.pow(1 + r, months);
  const emi = Math.round((principal * r * onePlusRN / (onePlusRN - 1)) * 100) / 100;

  for (let m = 1; m <= months; m++) {
    const interest = Math.round((balance * r) * 100) / 100;
    let principalPart;
    let payment;
    let ending;

    if (m === months) {
      principalPart = balance;
      payment = principalPart + interest;
      ending = 0;
    } else {
      principalPart = emi - interest;
      payment = emi;
      ending = balance - principalPart;
    }

    balance = ending;
    schedule.push({
      month: m,
      payment: roundHalfUp(payment),
      principal: roundHalfUp(principalPart),
      interest: roundHalfUp(interest),
      ending_balance: roundHalfUp(ending)
    });
  }

  return schedule;
}

document.getElementById('calcBtn').addEventListener('click', () => {
  const principal = parseFloat(document.getElementById('principal').value);
  const rate = parseFloat(document.getElementById('annualRate').value);
  const months = parseInt(document.getElementById('months').value, 10);

  const tbody = document.getElementById('scheduleBody');
  tbody.innerHTML = '';

  const schedule = generateSchedule(principal, rate, months);
  schedule.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${row.payment}</td>
      <td>${row.principal}</td>
      <td>${row.interest}</td>
      <td>${row.ending_balance}</td>
    `;
    tbody.appendChild(tr);
  });
});

// Trigger initial render
document.getElementById('calcBtn').click();