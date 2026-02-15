/**
 * Regulatory Sentinel - Dashboard Application
 * Matching PolicyGuardian Theme
 */

const API_BASE = "http://localhost:8000";

// State
let currentSection = "dashboard";

// ============================================
// Initialization
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initModals();
  loadDashboard();
});

// ============================================
// Navigation
// ============================================

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-section]");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      // Update active state
      document
        .querySelectorAll(".nav-item")
        .forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Show section
      showSection(section);
    });
  });

  // Upload button handlers
  document
    .getElementById("upload-btn")
    ?.addEventListener("click", showUploadModal);
  document.getElementById("upload-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    showUploadModal();
  });
}

function showSection(section) {
  currentSection = section;

  // Map section names to section IDs
  const sectionMap = {
    dashboard: "dashboard-section",
    "regulation-intake": "regulation-intake-section",
    "policy-comparison": "policy-comparison-section",
    "gap-detection": "gap-detection-section",
    recommendations: "recommendations-section",
    "audit-trail": "audit-trail-section",
    propagation: "propagation-section",
  };

  // Hide all sections
  document.querySelectorAll(".content-section").forEach((s) => {
    s.classList.add("hidden");
  });

  // Show target section
  const targetId = sectionMap[section];
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  // Load section data
  loadSectionData(section);
}

function loadSectionData(section) {
  switch (section) {
    case "dashboard":
      loadDashboard();
      break;
    case "regulation-intake":
      loadRegulations("intake-regulations-list");
      break;
    case "gap-detection":
      loadGaps();
      break;
    case "recommendations":
      loadRecommendations();
      break;
    case "audit-trail":
      loadAuditTrail();
      break;
  }
}

// ============================================
// Refresh all sections (real-time update)
// ============================================

function refreshAll() {
  loadDashboard();
  loadRegulations("regulations-list");
  loadRegulations("intake-regulations-list");
  loadGaps();
  loadRecommendations();
  loadAuditTrail();
}

// ============================================
// Dashboard
// ============================================

async function loadDashboard() {
  try {
    const stats = await fetchAPI("/stats");

    // Update stats
    document.getElementById("stat-regulations").textContent =
      stats.regulation_count || 0;
    document.getElementById("stat-gaps").textContent =
      stats.pending_approvals || 0;
    document.getElementById("stat-updated").textContent =
      stats.approved_count || 0;

    // Calculate compliance score
    const total = stats.proposal_count || 0;
    const approved = stats.approved_count || 0;
    const score = total > 0 ? Math.round((approved / total) * 100) : 0;
    document.getElementById("stat-compliance").textContent = score + "%";

    // Update badges
    const gapBadge = document.querySelector(
      '.nav-item[data-section="gap-detection"] .badge',
    );
    if (gapBadge) gapBadge.textContent = stats.pending_approvals || 0;
    const intakeBadge = document.querySelector(
      '.nav-item[data-section="regulation-intake"] .badge',
    );
    if (intakeBadge) intakeBadge.textContent = stats.regulation_count || 0;

    // Load regulations list
    loadRegulations("regulations-list");
  } catch (error) {
    console.error("Failed to load dashboard:", error);
  }
}

async function loadRegulations(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="loading-state">Loading ingested regulations...</div>';

  try {
    const regulations = await fetchAPI("/regulations");

    if (!regulations || regulations.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No regulations ingested yet. Upload one to get started.</div>';
      return;
    }

    container.innerHTML = regulations
      .map(
        (reg) => `
            <div class="regulation-item" onclick="selectRegulation('${reg.regulation_id}')">
                <div class="regulation-info">
                    <h4>${reg.regulation_name}</h4>
                    <p>${reg.clause_count || 0} clauses • ${formatDate(reg.ingestion_date)}</p>
                </div>
                <span class="regulation-status ${reg.status?.toLowerCase() || "pending"}">${reg.status || "Pending"}</span>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    container.innerHTML =
      '<div class="empty-state">Failed to load regulations</div>';
  }
}

function selectRegulation(regulationId) {
  // Show gaps for this regulation
  loadGapsForRegulation(regulationId);
}

async function loadGapsForRegulation(regulationId) {
  const container = document.getElementById("gaps-list");
  if (!container) return;

  container.innerHTML =
    '<div class="loading-state">Analyzing compliance gaps...</div>';

  try {
    const proposals = await fetchAPI("/approvals/pending");

    // Filter by regulation
    const gaps = proposals.filter(
      (p) => p.regulation_clause?.includes(regulationId) || true, // Show all for now
    );

    if (gaps.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No compliance gaps found for this regulation. ✓</div>';
      return;
    }

    container.innerHTML = gaps
      .slice(0, 5)
      .map(
        (gap) => `
            <div class="gap-item">
                <span class="gap-icon">⚠️</span>
                <div class="gap-content">
                    <h4>${gap.policy_name || gap.policy_id}</h4>
                    <p>${gap.diff_summary || "Compliance gap detected"}</p>
                    <div class="gap-actions">
                        <button class="btn btn-success" onclick="approveGap('${gap.proposal_id}')">Approve</button>
                        <button class="btn btn-outline" onclick="viewGapDetails('${gap.proposal_id}')">View Details</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Failed to load gaps</div>';
  }
}

// ============================================
// Gap Detection
// ============================================

async function loadGaps() {
  const container = document.getElementById("gaps-detection-list");
  if (!container) return;

  container.innerHTML =
    '<div class="loading-state">Loading compliance gaps...</div>';

  try {
    const proposals = await fetchAPI("/approvals/pending");

    if (!proposals || proposals.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No compliance gaps detected. All policies are up to date. ✓</div>';
      return;
    }

    container.innerHTML = proposals
      .map(
        (gap) => `
            <div class="gap-item">
                <span class="gap-icon">⚠️</span>
                <div class="gap-content">
                    <h4>${gap.policy_name || gap.policy_id}</h4>
                    <p><strong>Regulation:</strong> ${gap.regulation_clause || "Unknown"}</p>
                    <p>${gap.diff_summary || "Compliance gap detected"}</p>
                    <div class="gap-actions">
                        <button class="btn btn-success" onclick="approveGap('${gap.proposal_id}')">✓ Approve</button>
                        <button class="btn btn-danger" onclick="rejectGap('${gap.proposal_id}')">✗ Reject</button>
                        <button class="btn btn-outline" onclick="viewGapDetails('${gap.proposal_id}')">View Details</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Failed to load gaps</div>';
  }
}

async function approveGap(proposalId) {
  const reviewerId = prompt("Enter your reviewer ID:");
  if (!reviewerId) return;

  try {
    await fetchAPI(`/approvals/${proposalId}/approve`, {
      method: "POST",
      body: JSON.stringify({
        reviewer_id: reviewerId,
        comments: "Approved via dashboard",
      }),
    });

    alert("Gap resolved! Policy updated.");
    refreshAll();
  } catch (error) {
    alert("Failed to approve: " + error.message);
  }
}

async function rejectGap(proposalId) {
  const reviewerId = prompt("Enter your reviewer ID:");
  if (!reviewerId) return;

  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  try {
    await fetchAPI(`/approvals/${proposalId}/reject`, {
      method: "POST",
      body: JSON.stringify({
        reviewer_id: reviewerId,
        reason: reason,
      }),
    });

    alert("Gap rejected");
    refreshAll();
  } catch (error) {
    alert("Failed to reject: " + error.message);
  }
}

async function viewGapDetails(proposalId) {
  const modal = document.getElementById("gap-modal");
  const body = document.getElementById("gap-modal-body");
  const footer = document.getElementById("gap-modal-footer");

  body.innerHTML = '<div class="loading-state">Loading...</div>';
  modal.classList.add("active");

  try {
    const proposal = await fetchAPI(`/approvals/${proposalId}`);

    body.innerHTML = `
            <div class="gap-details">
                <p><strong>Policy:</strong> ${proposal.policy_name || proposal.policy_id}</p>
                <p><strong>Regulation:</strong> ${proposal.regulation_clause}</p>
                <p><strong>Change Type:</strong> ${proposal.change_type}</p>
                <p><strong>Risk Level:</strong> <span class="regulation-status ${proposal.risk_level?.toLowerCase()}">${proposal.risk_level}</span></p>
                <p><strong>Confidence:</strong> ${Math.round((proposal.confidence || 0) * 100)}%</p>
                
                <h4>Summary</h4>
                <p>${proposal.diff_summary || "No summary available"}</p>
                
                ${
                  proposal.assumptions?.length
                    ? `
                    <h4>Assumptions</h4>
                    <ul>
                        ${proposal.assumptions.map((a) => `<li>${a}</li>`).join("")}
                    </ul>
                `
                    : ""
                }
                
                <h4>Proposed Changes</h4>
                <div style="background: #f5f7fa; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; max-height: 200px; overflow-y: auto;">
                    ${proposal.after_proposed_text ? proposal.after_proposed_text.substring(0, 500) + "..." : "No diff available"}
                </div>
            </div>
        `;

    if (proposal.status === "PENDING") {
      footer.innerHTML = `
                <button class="btn btn-success" onclick="approveGap('${proposalId}'); closeGapModal();">✓ Approve</button>
                <button class="btn btn-danger" onclick="rejectGap('${proposalId}'); closeGapModal();">✗ Reject</button>
                <button class="btn btn-outline" onclick="closeGapModal()">Cancel</button>
            `;
    } else {
      footer.innerHTML = `
                <span>Status: ${proposal.status}</span>
                <button class="btn btn-outline" onclick="closeGapModal()">Close</button>
            `;
    }
  } catch (error) {
    body.innerHTML = `<div class="empty-state">Failed to load: ${error.message}</div>`;
  }
}

function closeGapModal() {
  document.getElementById("gap-modal").classList.remove("active");
}

// ============================================
// Recommendations
// ============================================

async function loadRecommendations() {
  const container = document.getElementById("recommendations-list");
  if (!container) return;

  container.innerHTML =
    '<div class="loading-state">Loading recommendations...</div>';

  try {
    const proposals = await fetchAPI("/approvals/pending");

    if (!proposals || proposals.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No recommendations pending.</div>';
      return;
    }

    container.innerHTML = proposals
      .map(
        (rec) => `
            <div class="gap-item" style="background: #eff6ff; border-color: #3b82f6;">
                <span class="gap-icon">💡</span>
                <div class="gap-content">
                    <h4>${rec.policy_name || rec.policy_id}</h4>
                    <p><strong>Recommendation:</strong> ${rec.diff_summary || "Update policy for compliance"}</p>
                    <p><strong>Confidence:</strong> ${Math.round((rec.confidence || 0) * 100)}%</p>
                    <div class="gap-actions">
                        <button class="btn btn-primary" onclick="approveGap('${rec.proposal_id}')">Accept</button>
                        <button class="btn btn-outline" onclick="viewGapDetails('${rec.proposal_id}')">Review</button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    container.innerHTML =
      '<div class="empty-state">Failed to load recommendations</div>';
  }
}

// ============================================
// Audit Trail
// ============================================

async function loadAuditTrail() {
  const container = document.getElementById("audit-list");
  if (!container) return;

  container.innerHTML =
    '<div class="loading-state">Loading audit trail...</div>';

  try {
    const logs = await fetchAPI("/audit/trail?limit=50");

    if (!logs || logs.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No audit logs available</div>';
      return;
    }

    container.innerHTML = logs
      .map(
        (log) => `
            <div class="audit-item">
                <div class="audit-icon">${getActionIcon(log.action_type)}</div>
                <div class="audit-content">
                    <div class="audit-action">${log.action_type}</div>
                    <div class="audit-meta">
                        ${log.entity_type}: ${log.entity_id} • 
                        ${log.performed_by} • 
                        ${formatDate(log.performed_at)}
                        ${log.human_decision ? ` • Decision: ${log.human_decision}` : ""}
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    container.innerHTML =
      '<div class="empty-state">Failed to load audit trail</div>';
  }
}

function getActionIcon(action) {
  const icons = {
    POLICY_GENERATED: "📋",
    REGULATION_INGESTED: "📜",
    IMPACT_ANALYZED: "🔍",
    DIFF_GENERATED: "📝",
    PROPOSAL_APPROVED: "✅",
    PROPOSAL_REJECTED: "❌",
    HUMAN_REVIEW_REQUESTED: "👤",
    WORKFLOW_COMPLETED: "🎉",
    REMEDIATION_PROPOSED: "💡",
  };
  return icons[action] || "📌";
}

// ============================================
// Upload Modal
// ============================================

function initModals() {
  // Close on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal-overlay")
        .forEach((m) => m.classList.remove("active"));
    }
  });
}

function showUploadModal() {
  document.getElementById("upload-modal").classList.add("active");
}

function closeUploadModal() {
  document.getElementById("upload-modal").classList.remove("active");
  document.getElementById("upload-form").reset();
}

async function submitRegulation() {
  const name = document.getElementById("reg-name").value;
  const text = document.getElementById("reg-text").value;

  if (!name || !text) {
    alert("Please provide regulation name and text");
    return;
  }

  const submitBtn = document.querySelector("#upload-modal .btn-primary");
  submitBtn.textContent = "⏳ Analyzing...";
  submitBtn.disabled = true;

  try {
    const result = await fetchAPI("/workflow/run", {
      method: "POST",
      body: JSON.stringify({
        regulation_name: name,
        regulation_text: text,
      }),
    });

    closeUploadModal();

    if (result.error) {
      alert("Analysis completed with issues: " + result.error);
    } else {
      alert(
        `✅ Analysis Complete!\n\nPolicies Analyzed: ${result.policy_count || 0}\nClauses Extracted: ${result.clause_count || 0}\nImpacted Policies: ${result.impacted_policy_count || 0}\nGaps Detected: ${result.pending_count || 0}`,
      );
    }

    refreshAll();
  } catch (error) {
    alert("Failed: " + error.message);
  } finally {
    submitBtn.textContent = "🚀 Analyze Regulation";
    submitBtn.disabled = false;
  }
}

// ============================================
// Utilities
// ============================================

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detail = error.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
          : `HTTP ${response.status}`;
    throw new Error(msg || `HTTP ${response.status}`);
  }

  return response.json();
}

function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
