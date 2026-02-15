/**
 * Lending Pool JavaScript
 */

let loans = [];

document.addEventListener('DOMContentLoaded', () => {
    initLendingPage();
});

async function initLendingPage() {
    await loadAgents();
    populateAgentSelect();
    loadPoolStats();
    loadLoans();
    setupLoanForm();
}

function populateAgentSelect() {
    const select = document.getElementById('loan-agent');
    if (!select) return;
    
    const agentsList = window.AgenticBank ? window.AgenticBank.agents() : DEMO_AGENTS;
    
    agentsList.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.agent_id;
        option.textContent = `${agent.name} (Risk: ${agent.risk_score})`;
        select.appendChild(option);
    });
}

async function loadLoans() {
    try {
        const response = await fetch(`${API_BASE}/lending/active`);
        if (response.ok) {
            loans = await response.json();
            renderLoansTable();
        }
    } catch (error) {
        console.log('Using empty loans list');
    }
}

function renderLoansTable() {
    const tbody = document.getElementById('loans-body');
    if (!tbody) return;
    
    if (loans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No active loans</td></tr>';
        return;
    }
    
    tbody.innerHTML = loans.map(loan => `
        <tr>
            <td><code>${loan.loan_id}</code></td>
            <td>${loan.agent_id}</td>
            <td>$${loan.amount.toLocaleString()}</td>
            <td>${loan.interest_rate}%</td>
            <td>$${loan.remaining?.toLocaleString() || loan.amount.toLocaleString()}</td>
            <td><span class="status-badge ${loan.status}">${loan.status}</span></td>
            <td>
                <button class="btn-secondary" onclick="repayLoan('${loan.loan_id}')">Repay</button>
            </td>
        </tr>
    `).join('');
}

function setupLoanForm() {
    const form = document.getElementById('loan-form');
    if (form) {
        form.addEventListener('submit', handleLoanRequest);
    }
}

async function handleLoanRequest(e) {
    e.preventDefault();
    
    const agentId = document.getElementById('loan-agent').value;
    const amount = parseFloat(document.getElementById('loan-amount').value);
    const duration = parseInt(document.getElementById('loan-duration').value);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    const resultContainer = document.getElementById('loan-result');
    resultContainer.innerHTML = '<div class="loading-state"><p>Running risk evaluation...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/lending/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agent_id: agentId,
                amount,
                duration_days: duration
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            renderLoanResult(data);
            loadLoans();
            loadPoolStats();
        } else {
            const error = await response.json();
            resultContainer.innerHTML = `<div class="error-state"><p>${error.detail || 'Loan request failed'}</p></div>`;
        }
    } catch (error) {
        // Demo mode
        const demoResult = generateDemoLoanResult(agentId, amount, duration);
        renderLoanResult(demoResult);
    }
    
    submitBtn.textContent = 'Request Loan';
    submitBtn.disabled = false;
}

function generateDemoLoanResult(agentId, amount, duration) {
    const agentsList = window.AgenticBank ? window.AgenticBank.agents() : DEMO_AGENTS;
    const agent = agentsList.find(a => a.agent_id === agentId) || agentsList[0];
    const riskScore = agent.risk_score;
    const interestRate = Math.max(5, 25 - (riskScore * 0.2));
    const isApproved = riskScore >= 40;
    
    return {
        loan_id: `loan_${Date.now()}`,
        status: isApproved ? 'approved' : 'rejected',
        amount,
        interest_rate: interestRate.toFixed(1),
        total_due: amount * (1 + interestRate / 100),
        collateral_required: amount * (1.5 - riskScore / 100),
        risk_evaluation: {
            final_score: riskScore,
            recommendation: isApproved 
                ? 'APPROVED - Agent meets risk threshold'
                : 'REJECTED - Risk score too low',
            scores: {
                behavior: Math.min(100, riskScore + 5),
                performance: Math.min(100, riskScore + 2),
                transaction: Math.min(100, riskScore - 3),
                integrity: Math.min(100, riskScore + 8),
                market: 70
            }
        }
    };
}

function renderLoanResult(result) {
    const container = document.getElementById('loan-result');
    if (!container) return;
    
    const isApproved = result.status === 'approved';
    
    container.innerHTML = `
        <div class="loan-result-content">
            <div class="result-status ${result.status}">
                <span class="status-icon">${isApproved ? '✓' : '✕'}</span>
                <span class="status-text">${result.status.toUpperCase()}</span>
            </div>
            
            <div class="result-details">
                <div class="detail-row">
                    <span>Amount</span>
                    <span>$${result.amount.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <span>Interest Rate</span>
                    <span>${result.interest_rate}%</span>
                </div>
                <div class="detail-row">
                    <span>Total Due</span>
                    <span>$${result.total_due.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <span>Collateral</span>
                    <span>$${result.collateral_required?.toLocaleString() || 'N/A'}</span>
                </div>
            </div>
            
            ${result.risk_evaluation ? `
                <div class="risk-scores-mini">
                    <h4>Risk Evaluation</h4>
                    <div class="mini-scores">
                        ${Object.entries(result.risk_evaluation.scores || {}).map(([key, value]) => `
                            <div class="mini-score">
                                <span class="mini-label">${key.slice(0, 4)}</span>
                                <span class="mini-value" style="color: ${getRiskColor(value)}">${value.toFixed(0)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="recommendation ${isApproved ? 'approved' : 'rejected'}">
                ${result.risk_evaluation?.recommendation || (isApproved ? 'Loan approved' : 'Loan rejected')}
            </div>
        </div>
    `;
}

async function repayLoan(loanId) {
    const amount = prompt('Enter repayment amount:');
    if (!amount) return;
    
    try {
        const response = await fetch(`${API_BASE}/lending/repay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                loan_id: loanId,
                amount: parseFloat(amount)
            })
        });
        
        if (response.ok) {
            showSuccessNotification('Repayment successful!');
            loadLoans();
            loadPoolStats();
        }
    } catch (error) {
        showSuccessNotification('Repayment recorded (demo mode)');
    }
}

// Add extra styles for lending page
const lendingStyles = document.createElement('style');
lendingStyles.textContent = `
    .page-title {
        margin-bottom: 24px;
    }
    .page-title h1 {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
    }
    .page-title p {
        color: var(--text-secondary);
    }
    
    .data-table {
        width: 100%;
        border-collapse: collapse;
    }
    .data-table th, .data-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border-light);
    }
    .data-table th {
        font-weight: 500;
        color: var(--text-secondary);
        font-size: 13px;
    }
    .data-table code {
        background: var(--content-bg);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    .status-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .status-badge.approved, .status-badge.active {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
    }
    .status-badge.rejected {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
    .status-badge.pending {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning);
    }
    
    .loan-result-content {
        text-align: center;
    }
    .result-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
    }
    .result-status.approved {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
    }
    .result-status.rejected {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
    .status-icon {
        font-size: 24px;
    }
    .status-text {
        font-size: 20px;
        font-weight: 700;
    }
    
    .result-details {
        background: var(--content-bg);
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 16px;
    }
    .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-light);
    }
    .detail-row:last-child {
        border-bottom: none;
    }
    .detail-row span:first-child {
        color: var(--text-secondary);
    }
    .detail-row span:last-child {
        font-weight: 600;
    }
    
    .risk-scores-mini {
        margin-bottom: 16px;
    }
    .risk-scores-mini h4 {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 12px;
    }
    .mini-scores {
        display: flex;
        justify-content: center;
        gap: 16px;
    }
    .mini-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    .mini-label {
        font-size: 10px;
        color: var(--text-muted);
        text-transform: uppercase;
    }
    .mini-value {
        font-size: 18px;
        font-weight: 700;
    }
    
    .recommendation {
        padding: 12px;
        border-radius: 8px;
        font-size: 13px;
    }
    .recommendation.approved {
        background: rgba(16, 185, 129, 0.1);
        color: var(--success);
    }
    .recommendation.rejected {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
    }
`;
document.head.appendChild(lendingStyles);
