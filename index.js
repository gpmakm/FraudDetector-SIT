const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

const THRESHOLD = 490000; // 4.90 lacs
const PORT = process.env.PORT || 3000;
const datasetPath = path.join(__dirname, 'public', 'dataset.json');
const fraudPath = path.join(__dirname, 'public', 'fraudDetails.json');

app.use(express.static(path.join(__dirname, 'public')));

// Helper: parse date (ISO or dd/mm/yyyy)
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

// Append random transaction to dataset.json every 5 seconds
function appendData() {
  try {
    const content = fs.readFileSync(datasetPath, 'utf-8');
    const data = JSON.parse(content);

    const userIndex = Math.floor(Math.random() * data.length);
    const user = data[userIndex];
    const arrayKey = Math.random() > 0.5 ? 'credits' : 'debits';

    if (!Array.isArray(user[arrayKey])) return;

    const newTx = {
      amount: Math.floor(Math.random() * 1000000),
      date: new Date().toISOString().slice(0, 10)
    };
    user[arrayKey].push(newTx);

    fs.writeFileSync(datasetPath, JSON.stringify(data, null, 2));
    console.log(`Added ${JSON.stringify(newTx)} to ${arrayKey} of user ${userIndex}`);

    // After updating dataset, recompute frauds
    computeFraudDetails(data);

  } catch (err) {
    console.error('Error appending data:', err);
  }
}

// Compute frauds and generate fraudDetails.json
function computeFraudDetails(data) {
  const frauds = [];

  data.forEach(user => {
    const annualIncome = Number(user.annual_income || 0);
    if (annualIncome >= THRESHOLD) return; // Skip high-income users

    // Count high-value credits (> threshold)
    const highCredits = (user.credits || []).filter(tx => Number(tx.amount) > THRESHOLD);
    if (highCredits.length === 0) return;

    const totalFraudMoney = highCredits.reduce((sum, tx) => sum + Number(tx.amount), 0);

    frauds.push({
      fraud_account_number: user.account_number,
      fraud_accnt_holder: user.username,
      total_fraud_money: totalFraudMoney
    });
  });

  try {
    fs.writeFileSync(fraudPath, JSON.stringify(frauds, null, 2));
    console.log(`Fraud details updated: ${frauds.length} accounts`);
  } catch (err) {
    console.error('Error writing fraudDetails.json:', err);
  }
}

// Start auto-update interval
setInterval(appendData, 15000);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
