class ClientDeadlineCalculator {
  constructor(holidays = []) {
    this.holidays = new Set(holidays);
  }

  isCourtDay(d) {
    const day = d.getUTCDay();
    const isoDate = d.toISOString().split('T')[0];
    return day !== 0 && day !== 6 && !this.holidays.has(isoDate);
  }

  addCalendarDays(start, days, rollForward = true) {
    if (days < 0) throw new Error("days must be >= 0");
    const target = new Date(start);
    target.setUTCDate(target.getUTCDate() + days);
    if (rollForward) {
      while (!this.isCourtDay(target)) {
        target.setUTCDate(target.getUTCDate() + 1);
      }
    }
    return target;
  }

  addCourtDays(start, days) {
    if (days < 0) throw new Error("days must be >= 0");
    const curr = new Date(start);
    let added = 0;
    while (added < days) {
      curr.setUTCDate(curr.getUTCDate() + 1);
      if (this.isCourtDay(curr)) {
        added += 1;
      }
    }
    return curr;
  }

  daysRemaining(deadline, today) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((deadline - today) / msPerDay);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('start-date');
  const daysCountInput = document.getElementById('days-count');
  const calcTypeInput = document.getElementById('calc-type');
  const rollForwardContainer = document.getElementById('roll-forward-container');
  const rollForwardInput = document.getElementById('roll-forward');
  const holidaysInput = document.getElementById('holidays');
  const calcBtn = document.getElementById('calc-btn');
  const resultBox = document.getElementById('result-box');
  const computedDeadlineEl = document.getElementById('computed-deadline');
  const daysRemainingEl = document.getElementById('days-remaining');

  const todayStr = new Date().toISOString().split('T')[0];
  startDateInput.value = todayStr;

  calcTypeInput.addEventListener('change', () => {
    rollForwardContainer.style.display = calcTypeInput.value === 'calendar' ? 'flex' : 'none';
  });

  calcBtn.addEventListener('click', () => {
    const rawHolidays = holidaysInput.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const calc = new ClientDeadlineCalculator(rawHolidays);
    const [y, m, d] = startDateInput.value.split('-').map(Number);
    const startDate = new Date(Date.UTC(y, m - 1, d));
    const days = parseInt(daysCountInput.value, 10);

    if (isNaN(days) || days < 0) {
      alert("Please enter a valid non-negative number of days.");
      return;
    }

    let deadline;
    if (calcTypeInput.value === 'court') {
      deadline = calc.addCourtDays(startDate, days);
    } else {
      deadline = calc.addCalendarDays(startDate, days, rollForwardInput.checked);
    }

    const todayDate = new Date();
    const todayUTC = new Date(Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()));
    const diff = calc.daysRemaining(deadline, todayUTC);

    computedDeadlineEl.textContent = `Calculated Deadline: ${deadline.toISOString().split('T')[0]}`;
    daysRemainingEl.textContent = `Days Remaining from Today: ${diff} day(s)`;
    resultBox.style.display = 'block';
  });
});