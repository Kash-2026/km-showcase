function parseDate(dateStr) {
  const parts = dateStr.split('-');
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function formatDate(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

function computeMSMEClaim() {
  const principal = parseFloat(document.getElementById('principal').value);
  const rbiRate = parseFloat(document.getElementById('rbiRate').value);
  const acceptanceStr = document.getElementById('acceptanceDate').value;
  const paymentStr = document.getElementById('paymentDate').value;
  const creditDaysInput = document.getElementById('creditDays').value;

  if (isNaN(principal) || principal <= 0) {
    alert('Please enter a valid principal > 0');
    return;
  }
  if (isNaN(rbiRate) || rbiRate <= 0) {
    alert('Please enter a valid RBI bank rate > 0');
    return;
  }
  if (!acceptanceStr || !paymentStr) {
    alert('Please select both acceptance and payment dates');
    return;
  }

  const acceptanceDate = parseDate(acceptanceStr);
  const paymentDate = parseDate(paymentStr);

  if (paymentDate < acceptanceDate) {
    alert('Payment date cannot be earlier than acceptance date');
    return;
  }

  let creditDays = 15;
  if (creditDaysInput !== '') {
    const parsedDays = parseInt(creditDaysInput, 10);
    if (parsedDays < 0) {
      alert('Credit days cannot be negative');
      return;
    }
    creditDays = Math.min(parsedDays, 45);
  }

  const appointedDay = new Date(acceptanceDate.getTime());
  appointedDay.setUTCDate(appointedDay.getUTCDate() + creditDays + 1);

  const annualStatutoryRate = rbiRate * 3.0;
  let overdueDays = 0;
  let interest = 0.0;

  if (paymentDate >= appointedDay) {
    const diffTime = paymentDate.getTime() - appointedDay.getTime();
    overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const fullMonths = Math.floor(overdueDays / 30);
    const remDays = overdueDays % 30;
    const monthlyRate = annualStatutoryRate / 1200.0;

    let amt = principal * Math.pow(1 + monthlyRate, fullMonths);
    amt = amt * (1 + (monthlyRate * remDays) / 30.0);
    interest = Math.round((amt - principal) * 100) / 100;
  }

  const totalPayable = Math.round((principal + interest) * 100) / 100;

  document.getElementById('resRate').innerText = `${annualStatutoryRate.toFixed(2)}%`;
  document.getElementById('resAppointed').innerText = formatDate(appointedDay);
  document.getElementById('resOverdue').innerText = `${overdueDays} days`;
  document.getElementById('resInterest').innerText = formatINR(interest);
  document.getElementById('resTotal').innerText = formatINR(totalPayable);
}

document.getElementById('calculateBtn').addEventListener('click', computeMSMEClaim);
window.addEventListener('DOMContentLoaded', computeMSMEClaim);