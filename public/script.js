const THRESHOLD = 490000;
let DATASET = [];
let transactionChart = null;

/* ---------------------------------------
   DATE PARSER (safe)
--------------------------------------- */
function parseDMY(dateStr) {
  if (!dateStr) return null;

  if (dateStr.includes("/")) {
    const p = dateStr.split("/");
    return new Date(p[2], p[1] - 1, p[0]);
  }

  if (dateStr.includes("-")) {
    return new Date(dateStr);
  }

  return null;
}
async function loadUsers() {
  const res = await fetch("http://localhost:3000/api/users");
  const data = await res.json();

  document.getElementById("userArea").innerHTML =
    `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

async function generateFraud() {
  const res = await fetch("http://localhost:3000/api/generate-fraud-report");
  const result = await res.json();

  alert("Fraud report generated! Total frauds: " + result.fraudCount);

  // show download button
  document.getElementById("downloadLink").style.display = "block";
}
/* ---------------------------------------
   DAY DIFFERENCE
--------------------------------------- */
function daysDiff(a, b) {
  if (!a || !b) return null;
  const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((A - B) / 86400000);
}

/* ---------------------------------------
   LOAD DATASET
--------------------------------------- */
async function fetchDataset() {
  try {
    const resp = await fetch("./public/dataset.json");
    if (!resp.ok) throw new Error("Cannot load dataset.json (Run with Live Server)");

    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("Dataset must be an array.");

    DATASET = data;
  } catch (err) {
    document.getElementById("content").innerHTML =
      `<div class="box"><h2>Error</h2><p>${err.message}</p></div>`;
  }
}

/* ---------------------------------------
   SEARCH USER
--------------------------------------- */
function searchUserData() {
  const q = document.getElementById("searchUser").value.trim();
  if (!q) return alert("Enter account number");

  const user = DATASET.find(
    (u) => (u.account_number || "").toLowerCase() === q.toLowerCase()
  );

  if (!user) {
    document.getElementById("content").innerHTML =
      `<div class="box"><h2>No Result</h2><p>No account: ${q}</p></div>`;

    hideAlert();
    hideFraud();
    return;
  }

  renderUser(user);
  evaluateAlerts(user);
  evaluateFraud(user);
  generateLineChart(user);
}

/* ---------------------------------------
   RENDER USER DETAILS
--------------------------------------- */
function renderUser(user) {
  const content = document.getElementById("content");

  let html = `
    <div class="box">
      <h2>User Details</h2>
      <p><strong>Name:</strong> ${user.username}</p>
      <p><strong>Account:</strong> ${user.account_number}</p>
      <p><strong>Contact:</strong> ${user.contact}</p>
      <p><strong>Address:</strong> ${user.address}</p>
      <p><strong>Profession:</strong> ${user.profession || "Not updated"}</p>
      <p><strong>Annual Income:</strong> ₹${user.annual_income || "Not updated"}</p>
      <p><strong>Monthly Tx:</strong> ${user.monthly_transacts}</p>
    </div>

    <div class="box">
      <h2>Credits</h2>
      <ul>
        ${user.credits.map(t => `<li>₹${t.amount} — ${t.date}</li>`).join("")}
      </ul>
    </div>

    <div class="box">
      <h2>Debits</h2>
      <ul>
        ${user.debits.map(t => `<li>₹${t.amount} — ${t.date}</li>`).join("")}
      </ul>
    </div>
  `;

  content.innerHTML = html;
}

/* ---------------------------------------
   HIGH VALUE ALERT SYSTEM
--------------------------------------- */
function evaluateAlerts(user) {
  const income = Number(user.annual_income || 0);

  // Rich users (>5 lakh income) ignore alerts
  if (income > 500000) {
    hideAlert();
    return;
  }

  let highTxns = [];

  function collect(arr) {
    (arr || []).forEach(tx => {
      if (tx.amount > THRESHOLD) {
        highTxns.push({
          amount: tx.amount,
          dateObj: parseDMY(tx.date)
        });
      }
    });
  }

  collect(user.credits);
  collect(user.debits);

  if (highTxns.length === 0) return hideAlert();

  highTxns = highTxns.filter(t => t.dateObj);
  highTxns.sort((a, b) => a.dateObj - b.dateObj);

  let consecutive = false;
  for (let i = 1; i < highTxns.length; i++) {
    if (daysDiff(highTxns[i].dateObj, highTxns[i - 1].dateObj) === 1) {
      consecutive = true;
      break;
    }
  }

  if (consecutive) {
    showAlert("red", "🚨 Red Alert: High-value transactions on consecutive dates!");
    
  } else {
    showAlert("yellow", `⚠️ ${highTxns.length} high-value transactions detected.`);
  }
}

/* ---------------------------------------
   FRAUD ALERT (NEW LOGIC)
   annual_income < THRESHOLD
   AND more than 2 transactions on the same day
--------------------------------------- */
function evaluateFraud(user) {
  const income = Number(user.annual_income || 0);

  // 1) Check income
  if (income >= THRESHOLD) {
    hideFraud();
    return;
  }

  // 2) Count all transactions (credit + debit) day-wise
  const dateMap = {};

  [...user.credits, ...user.debits].forEach(tx => {
    if (!dateMap[tx.date]) dateMap[tx.date] = 0;
    dateMap[tx.date]++;
  });

  // Check if ANY day has more than 2 transactions
  const fraudDetected = Object.values(dateMap).some(count => count > 2);

  if (fraudDetected) {
    const box = document.getElementById("fraudAlert");
    box.style.display = "block";
    box.style.background = "#cfe7ff";
    box.style.borderLeft = "6px solid #0066cc";
    box.textContent = `🔵 Fraud Alert: More than 2 transactions detected on a single day!`;
  } else {
    hideFraud();
  }
}

function hideFraud() {
  document.getElementById("fraudAlert").style.display = "none";
}

/* ---------------------------------------
   ALERT BOX (yellow/red)
--------------------------------------- */
function showAlert(level, msg) {
  const box = document.getElementById("alertBox");
  box.style.display = "block";

  if (level === "red") {
    box.style.background = "#ffb3b3";
    box.style.borderLeft = "6px solid #d10000";
  } else {
    box.style.background = "#ffe6b3";
    box.style.borderLeft = "6px solid #cc8a00";
  }

  box.textContent = msg;
}

function hideAlert() {
  document.getElementById("alertBox").style.display = "none";
}

/* ---------------------------------------
   CHART.JS LINE CHART
--------------------------------------- */
function generateLineChart(user) {
  const ctx = document.getElementById("linechart").getContext("2d");

  if (transactionChart) transactionChart.destroy();

  const allLabels = [...user.credits, ...user.debits].map(t => t.date);
  const creditAmounts = user.credits.map(t => t.amount);
  const debitAmounts = user.debits.map(t => t.amount);

  transactionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: allLabels,
      datasets: [
        {
          label: "Credits",
          data: creditAmounts,
          borderColor: "green",
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: "Debits",
          data: debitAmounts,
          borderColor: "red",
          borderWidth: 2,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

window.addEventListener("load", fetchDataset);
