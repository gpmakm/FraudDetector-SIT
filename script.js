const THRESHOLD = 490000; // 4.90 lacs
let DATASET = [];

/* ---------------------------------------------------------
   SAFE DATE PARSER (Fixes your crash)
   Accepts BOTH:
   ✔ dd/mm/yyyy
   ✔ yyyy-mm-dd
----------------------------------------------------------*/
function parseDMY(dateStr) {
  if (!dateStr) return null;

  // case: dd/mm/yyyy
  if (dateStr.includes("/")) {
    const p = dateStr.split("/");
    if (p.length === 3) {
      const d = new Date(p[2], p[1] - 1, p[0]);
      if (!isNaN(d)) return d;
    }
  }

  // case: yyyy-mm-dd
  if (dateStr.includes("-")) {
    const d = new Date(dateStr);
    if (!isNaN(d)) return d;
  }

  return null;
}

/* ---------------------------------------------------------
   SAFE DAY DIFFERENCE
----------------------------------------------------------*/
function daysDiff(a, b) {
  if (!a || !b) return null; // prevent crash

  const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((A - B) / (1000 * 60 * 60 * 24));
}

/* ---------------------------------------------------------
   FETCH DATASET.JSON
----------------------------------------------------------*/
async function fetchDataset() {
  try {
    const resp = await fetch("./public/dataset.json");

    if (!resp.ok) throw new Error("dataset.json not found. Start a local server.");

    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("Dataset must be an array.");

    DATASET = data;
  } catch (err) {
    console.error(err);
    document.getElementById("content").innerHTML =
      `<div class="box"><h2>Error</h2><p>${err.message}</p></div>`;
  }
}

/* ---------------------------------------------------------
   SEARCH USER
----------------------------------------------------------*/
function searchUserData() {
  const q = document.getElementById("searchUser").value.trim();
  if (!q) return alert("Please enter account number");

  const user = DATASET.find(
    (u) => (u.account_number || "").toLowerCase() === q.toLowerCase()
  );

  if (!user) {
    renderNotFound(q);
    return;
  }

  renderUser(user);
  evaluateAlerts(user);
}

/* ---------------------------------------------------------
   RENDER IF NOT FOUND
----------------------------------------------------------*/
function renderNotFound(q) {
  document.getElementById("content").innerHTML = `
    <div class="box">
      <h2>No user found</h2>
      <p>No account: <strong>${q}</strong></p>
    </div>
  `;
  hideAlert();
}

/* ---------------------------------------------------------
   RENDER USER DETAILS AND TRANSACTIONS
----------------------------------------------------------*/
function renderUser(user) {
  const content = document.getElementById("content");

  const userHtml = `
    <div class="box">
      <h2>User Details</h2>
      <p><strong>Name:</strong> ${escapeHtml(user.username)}</p>
      <p><strong>Account No:</strong> ${escapeHtml(user.account_number)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(user.contact)}</p>
      <p><strong>Address:</strong> ${escapeHtml(user.address)}</p>
      <p><strong>Monthly Transactions:</strong> ${escapeHtml(String(user.monthly_transacts))}</p>
    </div>
  `;

  const creditsList = (user.credits || [])
    .map((tx) => {
      const hi = Number(tx.amount) > THRESHOLD;
      return `<li ${hi ? highlightCss() : ""}>₹${numberWithCommas(
        tx.amount
      )} — ${tx.date}</li>`;
    })
    .join("");

  const creditsHtml = `
    <div class="box">
      <h2>Credited Amounts</h2>
      <ul>${creditsList || "<li>No records</li>"}</ul>
    </div>
  `;

  const debitsList = (user.debits || [])
    .map((tx) => {
      const hi = Number(tx.amount) > THRESHOLD;
      return `<li ${hi ? highlightCss() : ""}>₹${numberWithCommas(
        tx.amount
      )} — ${tx.date}</li>`;
    })
    .join("");

  const debitsHtml = `
    <div class="box">
      <h2>Debited Amounts</h2>
      <ul>${debitsList || "<li>No records</li>"}</ul>
    </div>
  `;

  content.innerHTML = userHtml + creditsHtml + debitsHtml;
}

/* ---------------------------------------------------------
   ALERT SYSTEM
----------------------------------------------------------*/
function evaluateAlerts(user) {
  let highTxns = [];

  function collect(arr) {
    (arr || []).forEach((tx) => {
      if (Number(tx.amount) > THRESHOLD) {
        highTxns.push({
          amount: tx.amount,
          dateStr: tx.date,
          dateObj: parseDMY(tx.date),
        });
      }
    });
  }

  collect(user.credits);
  collect(user.debits);

  // remove invalid dates
  highTxns = highTxns.filter((t) => t.dateObj);

  if (highTxns.length === 0) {
    hideAlert();
    return;
  }

  // sort by date
  highTxns.sort((a, b) => a.dateObj - b.dateObj);

  // check consecutive days
  let consecutive = false;
  for (let i = 1; i < highTxns.length; i++) {
    const diff = daysDiff(highTxns[i].dateObj, highTxns[i - 1].dateObj);
    if (diff === 1) {
      consecutive = true;
      break;
    }
  }

  if (consecutive) {
    showAlert("red", "Red Alert: High-value transactions on consecutive dates!");
  } else {
    showAlert(
      "yellow",
      `Warning: ${highTxns.length} high-value transactions detected.`
    );
  }
}

/* ---------------------------------------------------------
   SHOW/HIDE ALERT
----------------------------------------------------------*/
function showAlert(level, msg) {
  const box = document.getElementById("alertBox");
  box.style.display = "block";

  const icon = level === "red" ? "⛔" : "⚠️";
  box.textContent = `${icon} ${msg}`;

  if (level === "red") {
    box.style.background = "#ffb3b3";
    box.style.borderLeft = "6px solid #d10000";
  } else {
    box.style.background = "#ffd27f";
    box.style.borderLeft = "6px solid #c17d00";
  }
}

function hideAlert() {
  document.getElementById("alertBox").style.display = "none";
}

/* ---------------------------------------------------------
   HELPERS
----------------------------------------------------------*/
function numberWithCommas(x) {
  let num = x.toString();
  let lastThree = num.substring(num.length - 3);
  let other = num.substring(0, num.length - 3);
  if (other !== "") lastThree = "," + lastThree;
  return other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
}

function escapeHtml(s) {
  if (!s) return "-";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCss() {
  return `style="font-weight:bold;background:#fff2cc;padding:6px;border-radius:4px;"`;
}

/* ---------------------------------------------------------
   APPEND EXTRA USER WITHOUT REMOVING PREVIOUS
----------------------------------------------------------*/
function appendUser(user) {
  const content = document.getElementById("content");

  const block = document.createElement("div");
  block.className = "box";
  block.innerHTML = `
      <h2>APPENDED USER</h2>
      <p><strong>Name:</strong> ${escapeHtml(user.username)}</p>
      <p><strong>Account:</strong> ${escapeHtml(user.account_number)}</p>
      <p><strong>Address:</strong> ${escapeHtml(user.address)}</p>
      <p><strong>Monthly:</strong> ${escapeHtml(
        String(user.monthly_transacts)
      )}</p>
  `;

  content.appendChild(block);
}

/* ---------------------------------------------------------
   EXPORT FUNCTIONS
----------------------------------------------------------*/
window.searchUserData = searchUserData;
window.appendUser = appendUser;
 
window.addEventListener("load", fetchDataset);
