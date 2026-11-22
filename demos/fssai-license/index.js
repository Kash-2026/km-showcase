function classifyLicense(turnoverInr, operatesInMultipleStates, isImporterOrExporter) {
  if (turnoverInr < 0) {
    throw new Error('annual_turnover_inr must be >= 0');
  }
  if (isImporterOrExporter || turnoverInr > 500000000) {
    return 'CENTRAL_LICENSE';
  }
  if (turnoverInr > 15000000 || operatesInMultipleStates) {
    return 'STATE_LICENSE';
  }
  return 'BASIC_REGISTRATION';
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('classifyBtn');
  const turnoverInput = document.getElementById('turnover');
  const multiStateInput = document.getElementById('multiState');
  const impExpInput = document.getElementById('importerExporter');
  const resultDiv = document.getElementById('licenseResult');

  btn.addEventListener('click', () => {
    try {
      const turnover = parseFloat(turnoverInput.value || '0');
      const multi = multiStateInput.checked;
      const impExp = impExpInput.checked;
      const license = classifyLicense(turnover, multi, impExp);
      resultDiv.innerText = `Result: ${license}`;
    } catch (err) {
      resultDiv.innerText = `Error: ${err.message}`;
    }
  });
});