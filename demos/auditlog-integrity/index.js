class AuditLogClient {
  constructor() {
    this.entries = [];
    this.lastHash = "0".repeat(64);
  }

  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  canonicalJson(obj) {
    const keys = Object.keys(obj).sort();
    const sorted = {};
    for (const k of keys) sorted[k] = obj[k];
    return JSON.stringify(sorted);
  }

  async append(entry) {
    const serialized = this.canonicalJson(entry);
    const hash = await this.sha256(this.lastHash + serialized);
    this.entries.push({ entry, hash, prev_hash: this.lastHash });
    this.lastHash = hash;
    return hash;
  }

  async verify() {
    let prev = "0".repeat(64);
    for (const item of this.entries) {
      const serialized = this.canonicalJson(item.entry);
      const expected = await this.sha256(prev + serialized);
      if (item.hash !== expected || item.prev_hash !== prev) {
        return false;
      }
      prev = item.hash;
    }
    return true;
  }
}

const logClient = new AuditLogClient();
let actionCounter = 1;

async function renderTable() {
  const tbody = document.getElementById("audit-table-body");
  tbody.innerHTML = "";
  logClient.entries.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><pre>${item.prev_hash.substring(0, 16)}...</pre></td>
      <td><pre>${JSON.stringify(item.entry)}</pre></td>
      <td><pre>${item.hash.substring(0, 16)}...</pre></td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateVerificationStatus() {
  const statusEl = document.getElementById("verification-status");
  const isValid = await logClient.verify();
  if (isValid) {
    statusEl.textContent = "Status: Verified (Chain Intact)";
    statusEl.className = "status valid";
  } else {
    statusEl.textContent = "Status: Tamper Detected!";
    statusEl.className = "status invalid";
  }
}

document.getElementById("add-entry-btn").addEventListener("click", async () => {
  await logClient.append({ action: `tx_${actionCounter++}`, timestamp: Date.now() });
  await renderTable();
  await updateVerificationStatus();
});

document.getElementById("tamper-btn").addEventListener("click", async () => {
  if (logClient.entries.length > 0) {
    logClient.entries[0].entry.action = "TAMPERED_EVENT";
    await renderTable();
    await updateVerificationStatus();
  }
});

document.getElementById("verify-btn").addEventListener("click", async () => {
  await updateVerificationStatus();
});

// Initialize with default records
(async () => {
  await logClient.append({ action: "genesis", status: "ok" });
  await logClient.append({ action: "user_login", userId: "usr_100" });
  await renderTable();
  await updateVerificationStatus();
})();