/**
 * NBFC RetainAI - Frontend JavaScript (Dynamic Data)
 */

// API Base URL
const API_BASE = "/api";

// App State
const state = {
  token: localStorage.getItem("token"),
  employee: JSON.parse(localStorage.getItem("employee") || "null"),
  customers: [],
  currentCustomer: null,
  currentLoanId: null,
  charts: {},
};

// ============================================================================
// API Helpers
// ============================================================================

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const contentType = response.headers.get("Content-Type") || "";
    const isJson = contentType.includes("application/json");
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error(
        "API Error: Server returned non-JSON",
        response.status,
        text.slice(0, 200),
      );
      showToast(
        response.status === 500
          ? "Server error. Check that the backend is running and database is initialized."
          : "Unexpected response from server.",
        "error",
      );
      return null;
    }

    if (response.status === 401) {
      logout();
      return null;
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    showToast("Network error. Please try again.", "error");
    return null;
  }
}

// ============================================================================
// Authentication
// ============================================================================

async function login(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data?.success) {
    state.token = data.token;
    state.employee = data.employee;
    localStorage.setItem("token", data.token);
    localStorage.setItem("employee", JSON.stringify(data.employee));
    showApp();
    loadDashboard();
  } else {
    document.getElementById("login-error").textContent =
      data?.error || "Login failed";
    document.getElementById("login-error").classList.remove("hidden");
  }
}

function logout() {
  state.token = null;
  state.employee = null;
  localStorage.removeItem("token");
  localStorage.removeItem("employee");
  window.location.href = "/";
}

// ============================================================================
// UI State Management
// ============================================================================

function showLogin() {
  const login = document.getElementById("login-page");
  const app = document.getElementById("app");
  if (login) login.classList.remove("hidden");
  if (app) app.classList.add("hidden");
}

function showApp() {
  const login = document.getElementById("login-page");
  const app = document.getElementById("app");
  if (login) login.classList.add("hidden");
  if (app) app.classList.remove("hidden");
  if (state.employee) {
    const el = document.getElementById("user-name");
    if (el) el.textContent = state.employee.name;
  }
  showPage("dashboard");
  setNavActive("dashboard");
}

function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.add("hidden"));
  const targetPage = document.getElementById(`${pageId}-page`);
  if (targetPage) {
    targetPage.classList.remove("hidden");
  }
  setNavActive(pageId);
}

function setNavActive(pageId) {
  const navDashboard = document.getElementById("nav-dashboard");
  if (navDashboard)
    navDashboard.classList.toggle("active", pageId === "dashboard");
}

// ============================================================================
// Dashboard Functions
// ============================================================================

async function loadDashboard() {
  showPage("dashboard");

  // Load stats
  loadDashboardStats();

  // Load foreclosure trend chart
  loadForeclosureTrend();

  // Load customer list
  loadCustomerList();
}

async function loadDashboardStats() {
  const stats = await apiRequest("/dashboard/stats");
  if (!stats) return;

  // Update stat cards
  const revenueSaved = stats.revenue_saved?.value || 0;
  document.getElementById("stat-revenue-saved").textContent =
    formatCurrency(revenueSaved);
  updateStatChange(
    "stat-revenue-change",
    stats.revenue_saved?.change,
    stats.revenue_saved?.trend,
  );

  document.getElementById("stat-loans-risk").textContent = (
    stats.loans_at_risk?.value ||
    stats.high_risk ||
    0
  ).toLocaleString();
  updateStatChange(
    "stat-loans-change",
    stats.loans_at_risk?.change,
    stats.loans_at_risk?.trend,
  );

  const successRate = stats.intervention_success?.value || 63;
  document.getElementById("stat-success-rate").textContent =
    `${successRate.toFixed(0)}%`;
  updateStatChange(
    "stat-success-change",
    stats.intervention_success?.change,
    stats.intervention_success?.trend,
  );

  const detection = stats.avg_early_detection?.value || 9.4;
  document.getElementById("stat-detection").textContent =
    `${detection.toFixed(1)} Days`;
  updateStatChange(
    "stat-detection-change",
    stats.avg_early_detection?.change,
    stats.avg_early_detection?.trend,
    "d",
  );
}

function updateStatChange(elementId, change, trend, suffix = "%") {
  const el = document.getElementById(elementId);
  if (!el || change === undefined) return;

  el.classList.remove("up", "down");
  el.classList.add(trend === "down" ? "down" : "up");

  const icon = trend === "down" ? "fa-arrow-down" : "fa-arrow-up";
  const sign = trend === "down" ? "" : "+";
  el.innerHTML = `<i class="fas ${icon}"></i><span>${sign}${Math.abs(change).toFixed(1)}${suffix}</span>`;
}

async function loadForeclosureTrend() {
  const data = await apiRequest("/dashboard/foreclosure-trend");
  if (!data?.trend) return;

  const ctx = document.getElementById("foreclosure-chart");
  if (!ctx) return;

  // Destroy existing chart
  if (state.charts.foreclosure) {
    state.charts.foreclosure.destroy();
  }

  const labels = data.trend.map((d) => d.day);

  state.charts.foreclosure = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "High Risk",
          data: data.trend.map((d) => d.high),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: "Medium Risk",
          data: data.trend.map((d) => d.medium),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: "Low Risk",
          data: data.trend.map((d) => d.low),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "white",
          titleColor: "#0f172a",
          bodyColor: "#475569",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          boxPadding: 4,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#94a3b8",
            font: { size: 11 },
          },
        },
        y: {
          grid: {
            color: "#f1f5f9",
          },
          ticks: {
            color: "#94a3b8",
            font: { size: 11 },
          },
          beginAtZero: true,
        },
      },
    },
  });
}

async function loadCustomerList() {
  const data = await apiRequest("/customers");
  if (!data) return;

  state.customers = data.customers || [];
  renderCustomerTable(state.customers);
}

function renderCustomerTable(customers) {
  const tbody = document.getElementById("customer-table-body");
  if (!tbody) return;

  if (!customers || customers.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No at-risk customers found.
                </td>
            </tr>
        `;
    return;
  }

  // Sort by risk
  customers.sort(
    (a, b) =>
      (b.foreclosure_probability || 0) - (a.foreclosure_probability || 0),
  );

  const loanTypeMap = {
    HL: "Home Loan",
    PL: "Personal Loan",
    LAP: "Loan Against Property",
    BL: "Business Loan",
    VL: "Auto Loan",
    GL: "Gold Loan",
  };

  tbody.innerHTML = customers
    .map((c) => {
      const prob = c.foreclosure_probability || 0;
      const riskClass = prob >= 0.6 ? "high" : prob >= 0.3 ? "medium" : "low";
      const ttf = c.time_to_foreclosure_days || "—";

      return `
            <tr data-customer-id="${c.customer_id}" data-loan-id="${c.loan_id}">
                <td><span class="customer-id">${c.customer_id}</span></td>
                <td>${loanTypeMap[c.loan_type] || c.loan_type}</td>
                <td><span class="risk-badge ${riskClass}">${(prob * 100).toFixed(0)}%</span></td>
                <td><span class="exit-days">${ttf} days</span></td>
                <td><span class="revenue-at-risk">${formatCurrency(c.revenue_at_risk || 0)}</span></td>
                <td><span class="row-arrow"><i class="fas fa-chevron-right"></i></span></td>
            </tr>
        `;
    })
    .join("");

  // Add click handlers
  tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      const customerId = row.dataset.customerId;
      const loanId = row.dataset.loanId;
      loadCustomerProfile(customerId, loanId);
    });
  });
}

// ============================================================================
// Customer Profile Functions
// ============================================================================

async function loadCustomerProfile(customerId, loanId) {
  state.currentLoanId = loanId;
  showPage("customer");

  // Load customer data
  const data = await apiRequest(`/customers/${customerId}`);
  if (!data) return;

  state.currentCustomer = data;
  const { customer, loan, prediction, enhanced_metrics } = data;

  // Update header
  const loanTypeMap = {
    HL: "Home Loan",
    PL: "Personal Loan",
    LAP: "LAP",
    BL: "Business Loan",
    VL: "Auto Loan",
  };
  document.getElementById("customer-header-info").textContent =
    `${customer.customer_id} · ${loanTypeMap[loan.loan_type] || loan.loan_type}`;

  // Update customer info
  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  document.getElementById("customer-avatar").textContent = initials;
  document.getElementById("customer-name").textContent = customer.name;
  document.getElementById("customer-loan-type").textContent =
    loanTypeMap[loan.loan_type] || loan.loan_type;
  document.getElementById("customer-tenure").textContent =
    `${Math.round(loan.total_tenure / 12)} yrs`;
  document.getElementById("customer-outstanding").textContent = formatCurrency(
    loan.outstanding_principal,
  );
  document.getElementById("customer-emi").textContent = formatCurrency(
    loan.emi_amount,
  );

  // Update risk gauge
  const prob = prediction?.foreclosure_probability || 0;
  const riskLabel =
    prob >= 0.6 ? "High Risk" : prob >= 0.3 ? "Medium Risk" : "Low Risk";
  document.getElementById("risk-percentage").textContent =
    `${(prob * 100).toFixed(0)}%`;
  document.getElementById("risk-label").textContent = riskLabel;

  // ========================================
  // RENDER ENHANCED METRICS (RM Decision Fields)
  // ========================================

  if (enhanced_metrics) {
    // 1. Revenue at Risk
    const rar = enhanced_metrics.revenue_at_risk || 0;
    document.getElementById("revenue-at-risk-value").textContent =
      formatCurrency(rar);

    // 2. Urgency Indicator
    const urgency = enhanced_metrics.urgency || {
      level: "medium",
      message: "Monitor",
    };
    const urgencyEl = document.getElementById("urgency-indicator");
    urgencyEl.className = `urgency-indicator ${urgency.level}`;
    document.getElementById("urgency-value").textContent = urgency.message;

    // 3. Model Confidence
    const confidence = enhanced_metrics.confidence || {
      label: "Medium",
      description: "Moderate data",
    };
    const confVal = document.getElementById("confidence-value");
    confVal.textContent = confidence.label;
    confVal.className = `confidence-value ${confidence.label.toLowerCase()}`;
    document.getElementById("confidence-desc").textContent =
      `(${confidence.description})`;

    // 4. Risk Trend
    const trend = enhanced_metrics.risk_trend || {
      icon: "→",
      description: "Stable",
      direction: "stable",
    };
    const trendIcon = document.getElementById("trend-icon");
    trendIcon.textContent = trend.icon;
    trendIcon.className = `trend-icon ${trend.direction}`;
    document.getElementById("trend-desc").textContent = trend.description;

    // 5. No Action Impact
    const impact = enhanced_metrics.no_action_impact || {
      message: "Calculate...",
    };
    document.getElementById("no-action-value").textContent = impact.message;

    // 6. Recent Triggers (replaces Behavioral Signals)
    renderRecentTriggers(enhanced_metrics.recent_triggers || []);

    // 7. Previous Actions History
    renderActionHistory(enhanced_metrics.action_history || []);
  }

  // Load exit reasons
  loadExitReasons(customerId);

  // Load behavioral signals (now uses triggers from enhanced_metrics)
  // loadBehavioralSignals(customerId); // Replaced by triggers

  // Load recommended actions
  loadRecommendedActions(customerId);
}

function renderRecentTriggers(triggers) {
  const container = document.getElementById("signals-timeline");

  if (!triggers || triggers.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No recent risk triggers detected.</p>';
    return;
  }

  container.innerHTML = triggers
    .map((t) => {
      const daysAgo = t.days_ago || 0;
      const daysText =
        daysAgo === 0
          ? "Today"
          : daysAgo === 1
            ? "Yesterday"
            : `${daysAgo} days ago`;

      return `
            <div class="signal-item">
                <div class="signal-dot ${t.severity}"></div>
                <div class="signal-content">
                    <div class="signal-title">
                        <i class="fas fa-${t.icon || "exclamation-circle"}"></i>
                        ${t.title}
                    </div>
                    ${t.subtitle ? `<div class="signal-subtitle">${t.subtitle}</div>` : ""}
                    <div class="signal-date">${daysText}</div>
                </div>
            </div>
        `;
    })
    .join("");
}

function renderActionHistory(history) {
  const container = document.getElementById("action-history-list");

  if (!history || history.length === 0) {
    container.innerHTML =
      '<div class="text-muted">No previous actions recorded</div>';
    return;
  }

  const typeIcons = {
    CALL: "phone",
    OFFER: "gift",
    VISIT: "user-tie",
    NOTE: "sticky-note",
  };

  const typeLabels = {
    CALL: "Call made",
    OFFER: "Offer sent",
    VISIT: "Visit scheduled",
    NOTE: "Note added",
  };

  container.innerHTML = history
    .map((h) => {
      const daysAgo = h.days_ago || 0;
      const daysText =
        daysAgo === 0
          ? "Today"
          : daysAgo === 1
            ? "Yesterday"
            : `${daysAgo} days ago`;
      const outcomeClass =
        h.outcome === "RETAINED"
          ? "retained"
          : h.outcome === "PENDING"
            ? "pending"
            : h.outcome === "FORECLOSED"
              ? "lost"
              : "no-response";

      return `
            <div class="action-history-item">
                <div class="action-history-icon">
                    <i class="fas fa-${typeIcons[h.type] || "sticky-note"}"></i>
                </div>
                <div class="action-history-content">
                    <div class="action-history-type">${typeLabels[h.type] || h.type}</div>
                    <div class="action-history-meta">${daysText} · ${h.employee || "Unknown"}</div>
                </div>
                <span class="action-history-outcome ${outcomeClass}">${h.outcome_label || h.outcome}</span>
            </div>
        `;
    })
    .join("");
}

async function loadExitReasons(customerId) {
  const data = await apiRequest(`/customers/${customerId}/exit-reasons`);
  if (!data?.exit_reasons) return;

  const reasons = data.exit_reasons;

  // Render donut chart
  const ctx = document.getElementById("exit-reasons-chart");
  if (ctx) {
    if (state.charts.exitReasons) {
      state.charts.exitReasons.destroy();
    }

    state.charts.exitReasons = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: reasons.map((r) => r.reason),
        datasets: [
          {
            data: reasons.map((r) => r.percentage),
            backgroundColor: reasons.map((r) => r.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "65%",
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  // Render legend
  const legend = document.getElementById("exit-reasons-legend");
  legend.innerHTML = reasons
    .map(
      (r) => `
        <div class="donut-legend-item">
            <div class="legend-label">
                <span class="legend-bar" style="background: ${r.color};"></span>
                ${r.reason}
            </div>
            <span class="legend-value">${r.percentage}%</span>
        </div>
    `,
    )
    .join("");
}

async function loadBehavioralSignals(customerId) {
  const data = await apiRequest(`/customers/${customerId}/behavioral-signals`);
  const signals = data?.signals || [];

  const container = document.getElementById("signals-timeline");

  if (signals.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No behavioral signals detected.</p>';
    return;
  }

  container.innerHTML = signals
    .map((s) => {
      const date = new Date(s.date);
      const dateStr = date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });

      return `
            <div class="signal-item">
                <div class="signal-dot ${s.severity}"></div>
                <div class="signal-content">
                    <div class="signal-title">${s.title}</div>
                    <div class="signal-date">${dateStr}</div>
                </div>
            </div>
        `;
    })
    .join("");
}

async function loadRecommendedActions(customerId) {
  const data = await apiRequest(`/customers/${customerId}/recommended-actions`);
  const actions = data?.recommended_actions || [];

  const container = document.getElementById("action-cards");

  if (actions.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No actions recommended at this time.</p>';
    return;
  }

  container.innerHTML = actions
    .map(
      (a) => `
        <div class="action-card">
            <div class="action-card-header">
                <div class="action-icon">
                    <i class="fas fa-${a.icon || "bolt"}"></i>
                </div>
                <div class="action-info">
                    <div class="action-title">${a.title}</div>
                    <div class="action-lift">Expected retention lift: +${a.expected_lift}%</div>
                </div>
            </div>
            <button class="btn btn-success action-execute-btn" data-action-type="${a.type}" data-action-title="${a.title}">
                Execute Action
            </button>
        </div>
    `,
    )
    .join("");

  // Add click handlers
  container.querySelectorAll(".action-execute-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showActionModal(btn.dataset.actionType, btn.dataset.actionTitle);
    });
  });
}

// ============================================================================
// Action Modal
// ============================================================================

function showActionModal(actionType, title) {
  document.getElementById("action-type").value = actionType;
  document.getElementById("action-loan-id").value = state.currentLoanId;
  document.getElementById("action-modal-title").textContent =
    title || "Execute Action";
  document.getElementById("action-notes").value = "";
  document.getElementById("action-modal").classList.add("show");
}

function hideActionModal() {
  document.getElementById("action-modal").classList.remove("show");
}

async function submitAction() {
  const actionType = document.getElementById("action-type").value;
  const notes = document.getElementById("action-notes").value;
  const loanId =
    document.getElementById("action-loan-id").value || state.currentLoanId;

  if (!loanId) {
    showToast("No loan selected", "error");
    return;
  }

  // Map action types to valid backend types
  const typeMap = {
    RATE_REDUCTION: "OFFER",
    ASSIGN_RM: "NOTE",
    WHATSAPP_OFFER: "OFFER",
    PREPAYMENT_WAIVER: "OFFER",
    CALL: "CALL",
    OFFER: "OFFER",
    VISIT: "VISIT",
    NOTE: "NOTE",
  };

  const data = await apiRequest("/actions", {
    method: "POST",
    body: JSON.stringify({
      loan_id: loanId,
      action_type: typeMap[actionType] || "NOTE",
      notes: `[${actionType}] ${notes}`,
    }),
  });

  if (data?.success) {
    showToast("Action executed successfully!", "success");
    hideActionModal();
  } else {
    showToast(data?.error || "Failed to execute action", "error");
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount) {
  if (typeof amount !== "number" || isNaN(amount)) return "₹0";

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = { success: "check", error: "times", warning: "exclamation" };

  toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icons[type] || "info"}"></i></div>
        <div class="toast-message">${message}</div>
    `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventHandlers() {
  // Login form
  document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });

  // Logout
  document.getElementById("logout-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  // Nav: RetainAI Dashboard - inside app
  document.getElementById("nav-dashboard")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("dashboard");
    loadDashboard();
  });

  // Back button
  document.getElementById("back-btn")?.addEventListener("click", () => {
    loadDashboard();
  });

  // Modal controls
  document
    .getElementById("modal-close")
    ?.addEventListener("click", hideActionModal);
  document
    .getElementById("modal-cancel")
    ?.addEventListener("click", hideActionModal);
  document
    .getElementById("modal-submit")
    ?.addEventListener("click", submitAction);

  // Close modal on backdrop click
  document.getElementById("action-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "action-modal") {
      hideActionModal();
    }
  });

  // ========================================
  // WHAT-IF SIMULATOR EVENT HANDLERS
  // ========================================

  // Open Simulator
  document
    .getElementById("open-simulator-btn")
    ?.addEventListener("click", openSimulator);

  // Simulator controls
  document
    .getElementById("simulator-close")
    ?.addEventListener("click", hideSimulator);
  document
    .getElementById("simulator-cancel")
    ?.addEventListener("click", hideSimulator);

  // Rate slider
  document
    .getElementById("sim-rate-reduction")
    ?.addEventListener("input", (e) => {
      document.getElementById("sim-rate-value").textContent =
        `${e.target.value}%`;
    });

  // Run Simulation button
  document
    .getElementById("sim-run-btn")
    ?.addEventListener("click", runSimulation);

  // Close simulator on backdrop click
  document.getElementById("simulator-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "simulator-modal") {
      hideSimulator();
    }
  });
}

// ============================================================================
// What-If Simulator Functions
// ============================================================================

function openSimulator() {
  if (!state.currentCustomer) {
    showToast("No customer selected", "error");
    return;
  }

  const { customer, loan, prediction, enhanced_metrics } =
    state.currentCustomer;

  // Populate current state from API data
  const prob = prediction?.foreclosure_probability || 0.5;
  document.getElementById("sim-current-risk").textContent =
    `${(prob * 100).toFixed(0)}%`;
  document.getElementById("sim-current-rate").textContent =
    `${loan?.interest_rate || 10}%`;

  // Get competitor rate from enhanced metrics or BT inquiries
  const competitorRate =
    enhanced_metrics?.competitor_rate ||
    enhanced_metrics?.recent_triggers?.find((t) => t.competitor_rate)
      ?.competitor_rate ||
    "Unknown";
  document.getElementById("sim-competitor-rate").textContent =
    typeof competitorRate === "number" ? `${competitorRate}%` : competitorRate;

  // Reset form
  document.getElementById("sim-rate-reduction").value = 0.5;
  document.getElementById("sim-rate-value").textContent = "0.5%";
  document.getElementById("sim-waive-prepayment").checked = false;
  document.getElementById("sim-premium-rm").checked = false;
  document.getElementById("sim-tenure-extension").checked = false;

  // Hide results
  document.getElementById("sim-results-section").style.display = "none";
  document.getElementById("simulator-apply").style.display = "none";

  // Show modal
  document.getElementById("simulator-modal").classList.add("show");
}

function hideSimulator() {
  document.getElementById("simulator-modal").classList.remove("show");
}

async function runSimulation() {
  const customerId = state.currentCustomer?.customer?.customer_id;
  if (!customerId) {
    showToast("No customer selected", "error");
    return;
  }

  // Gather inputs
  const rateReduction = parseFloat(
    document.getElementById("sim-rate-reduction").value,
  );
  const waivePrepayment = document.getElementById(
    "sim-waive-prepayment",
  ).checked;
  const premiumRm = document.getElementById("sim-premium-rm").checked;
  const tenureExtension = document.getElementById(
    "sim-tenure-extension",
  ).checked;

  // Show loading
  const runBtn = document.getElementById("sim-run-btn");
  runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulating...';
  runBtn.disabled = true;

  // Call API
  const data = await apiRequest(`/customers/${customerId}/simulate`, {
    method: "POST",
    body: JSON.stringify({
      rate_reduction: rateReduction,
      waive_prepayment: waivePrepayment,
      assign_premium_rm: premiumRm,
      offer_tenure_extension: tenureExtension,
    }),
  });

  // Reset button
  runBtn.innerHTML = '<i class="fas fa-play"></i> Run Simulation';
  runBtn.disabled = false;

  if (!data?.success || !data.simulation) {
    showToast(data?.error || "Simulation failed", "error");
    return;
  }

  const sim = data.simulation;

  // Update results UI
  const currentRet = sim.current_state.retention_probability;
  const newRet = sim.projected_state.retention_probability;
  const improvement = sim.projected_state.improvement;

  document.getElementById("sim-new-retention").textContent = `${newRet}%`;
  document.getElementById("sim-retention-change").textContent =
    `Increased from ${currentRet}% to ${newRet}% (+${improvement}%)`;

  document.getElementById("sim-revenue-saved").textContent = formatCurrency(
    sim.financial_impact.revenue_saved,
  );
  document.getElementById("sim-cost").textContent = formatCurrency(
    sim.financial_impact.cost_to_bank,
  );
  document.getElementById("sim-roi").textContent =
    `${sim.financial_impact.roi_percentage}%`;

  // Recommendation styling
  const recEl = document.getElementById("sim-recommendation");
  recEl.className = "sim-recommendation";

  if (sim.recommendation === "Recommended") {
    recEl.classList.add("recommended");
    recEl.innerHTML =
      '<i class="fas fa-check-circle"></i><span>Recommended - High ROI intervention</span>';
  } else if (sim.recommendation === "Review Required") {
    recEl.classList.add("review");
    recEl.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i><span>Review Required - Moderate ROI</span>';
  } else {
    recEl.classList.add("not-recommended");
    recEl.innerHTML =
      '<i class="fas fa-times-circle"></i><span>Not Recommended - Low ROI</span>';
  }

  // Show results section
  document.getElementById("sim-results-section").style.display = "block";

  // Show apply button if recommended
  if (sim.recommendation === "Recommended") {
    document.getElementById("simulator-apply").style.display = "block";
  }
}

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  setupEventHandlers();

  if (state.token && state.employee) {
    showApp();
    loadDashboard();
  } else {
    showLogin();
  }
});
