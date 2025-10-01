let currentPage = 1;
let limit = 10;
let startDate = "";
let endDate = "";
const tableBody = document.querySelector("#transactionsTable tbody");
const pageInfo = document.querySelector("#pageInfo");
const expenseChartCtx = document.getElementById("expenseChart").getContext("2d");
let expenseChart;

document.getElementById("logoutBtn").addEventListener("click", () => {
  fetch("/logout").then(() => window.location.href = "/index.html");
});

document.getElementById("addTransactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const body = {
    amount: data.get("amount"),
    category: data.get("category"),
    date: data.get("date")
  };

  await fetch("/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  e.target.reset();
  loadTransactions();
});

document.getElementById("filterBtn").addEventListener("click", () => {
  startDate = document.getElementById("startDate").value;
  endDate = document.getElementById("endDate").value;
  currentPage = 1;
  loadTransactions();
});

document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) { currentPage--; loadTransactions(); }
});
document.getElementById("nextPage").addEventListener("click", () => {
  currentPage++; loadTransactions();
});

async function loadTransactions() {
  const url = `/transactions?page=${currentPage}&limit=${limit}`
            + (startDate && endDate ? `&startDate=${startDate}&endDate=${endDate}` : "");

  const res = await fetch(url);
  const data = await res.json();

  if (data.length === 0 && currentPage > 1) {
    currentPage--;
    return loadTransactions();
  }

  tableBody.innerHTML = "";
  data.forEach(t => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.transaction_id}</td>
      <td>${t.amount}</td>
      <td>${t.category || "-"}</td>
      <td>${t.transaction_date}</td>
      <td>
        <button onclick="deleteTransaction(${t.transaction_id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  pageInfo.textContent = `Page ${currentPage}`;
  updateChart(data);
}

async function deleteTransaction(id) {
  await fetch(`/transactions/${id}`, { method: "DELETE" });
  loadTransactions();
}

function updateChart(transactions) {
  const totals = {};
  transactions.forEach(t => {
    if (!totals[t.category]) totals[t.category] = 0;
    totals[t.category] += parseFloat(t.amount);
  });

  const labels = Object.keys(totals);
  const values = Object.values(totals);

  if (expenseChart) expenseChart.destroy();
  expenseChart = new Chart(expenseChartCtx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Expenses by Category',
        data: values,
        backgroundColor: [
          '#FF6384','#36A2EB','#FFCE56','#8BC34A','#FF9800','#9C27B0'
        ]
      }]
    }
  });
}
loadTransactions();
