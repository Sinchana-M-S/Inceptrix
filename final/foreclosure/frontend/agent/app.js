/**
 * RSoft Agentic Bank - Frontend JavaScript
 * Standalone components for integration
 */

// API Configuration - Update this to your backend URL
const API_BASE = 'http://localhost:8000/api';

// Demo data (fallback when backend is not connected)
const DEMO_AGENTS = [
    {
        agent_id: 'agent_001',
        name: 'AlphaTrader-001',
        agent_type: 'trader',
        wallet_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        risk_score: 85,
        reputation_level: 'platinum',
        successful_loans: 12,
        transaction_count: 156,
        is_active: true
    },
    {
        agent_id: 'agent_002',
        name: 'LoanBot-Prime',
        agent_type: 'lender',
        wallet_address: '0x8ba1f109551bD432803012640fd82a8B0B3cb3B',
        risk_score: 72,
        reputation_level: 'gold',
        successful_loans: 8,
        transaction_count: 89,
        is_active: true
    },
    {
        agent_id: 'agent_003',
        name: 'RiskAgent-Beta',
        agent_type: 'customer',
        wallet_address: '0x9cD3e5F7f8A9b1c2D3e4F5a6B7c8D9E0F1a2B3c4',
        risk_score: 45,
        reputation_level: 'silver',
        successful_loans: 2,
        transaction_count: 23,
        is_active: true
    }
];

const DEMO_POOL_STATS = {
    pool_balance: 1000000,
    total_borrowed: 0,
    total_repaid: 0,
    active_loans: 0,
    total_loans: 0,
    utilization_rate: 0
};

// State
let agents = [];
let poolStats = DEMO_POOL_STATS;
let selectedAgent = null;

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await loadAgents();
    await loadPoolStats();
    setupEventListeners();
}

// ==================== Data Loading ====================

async function loadAgents() {
    try {
        const response = await fetch(`${API_BASE}/agents/`);
        if (response.ok) {
            agents = await response.json();
        } else {
            console.log('Using demo agents');
            agents = DEMO_AGENTS;
        }
    } catch (error) {
        console.log('Backend not available, using demo data');
        agents = DEMO_AGENTS;
    }
    renderAgentList();
    updateStats();
}

async function loadPoolStats() {
    try {
        const response = await fetch(`${API_BASE}/lending/pool/stats`);
        if (response.ok) {
            poolStats = await response.json();
        }
    } catch (error) {
        poolStats = DEMO_POOL_STATS;
    }
    renderPoolStats();
}

// ==================== Rendering ====================

function renderAgentList() {
    const container = document.getElementById('agent-list');
    const emptyState = document.getElementById('empty-agents');
    
    if (!container) return;
    
    if (agents.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = agents.map(agent => `
        <div class="agent-card ${selectedAgent === agent.agent_id ? 'selected' : ''}" 
             onclick="selectAgent('${agent.agent_id}')">
            <div class="agent-avatar">${agent.name.substring(0, 2).toUpperCase()}</div>
            <div class="agent-info">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-wallet">${agent.wallet_address.slice(0, 12)}...${agent.wallet_address.slice(-6)}</div>
            </div>
            <div class="agent-stats">
                <div class="agent-stat">
                    <span class="agent-stat-label">Risk Score</span>
                    <span class="agent-stat-value" style="color: ${getRiskColor(agent.risk_score)}">${agent.risk_score}</span>
                </div>
                <div class="agent-stat">
                    <span class="agent-stat-label">Reputation</span>
                    <span class="reputation-badge ${agent.reputation_level}">${agent.reputation_level}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPoolStats() {
    const poolBalance = document.getElementById('pool-balance');
    const poolBalanceDetail = document.getElementById('pool-balance-detail');
    const totalBorrowed = document.getElementById('total-borrowed');
    const utilizationRate = document.getElementById('utilization-rate');
    const utilizationBar = document.getElementById('utilization-bar');
    
    if (poolBalance) poolBalance.textContent = '$' + formatNumber(poolStats.pool_balance);
    if (poolBalanceDetail) poolBalanceDetail.textContent = '$' + formatNumber(poolStats.pool_balance);
    if (totalBorrowed) totalBorrowed.textContent = '$' + formatNumber(poolStats.total_borrowed);
    if (utilizationRate) utilizationRate.textContent = poolStats.utilization_rate.toFixed(1) + '%';
    if (utilizationBar) utilizationBar.style.width = poolStats.utilization_rate + '%';
}

function updateStats() {
    const avgRiskScore = document.getElementById('avg-risk-score');
    const activeAgents = document.getElementById('active-agents');
    const pendingLoans = document.getElementById('pending-loans');
    
    if (agents.length > 0) {
        const avgScore = agents.reduce((sum, a) => sum + a.risk_score, 0) / agents.length;
        if (avgRiskScore) avgRiskScore.textContent = Math.round(avgScore) + '%';
    }
    
    if (activeAgents) activeAgents.textContent = agents.filter(a => a.is_active).length;
    if (pendingLoans) pendingLoans.textContent = poolStats.active_loans || 0;
}

// ==================== Agent Selection & Risk Evaluation ====================

async function selectAgent(agentId) {
    selectedAgent = agentId;
    renderAgentList();
    await evaluateAgentRisk(agentId);
}

async function evaluateAgentRisk(agentId) {
    const resultContainer = document.getElementById('risk-evaluation-result');
    const hintText = document.querySelector('.hint-text');
    
    if (!resultContainer) return;
    
    // Show loading
    resultContainer.style.display = 'block';
    if (hintText) hintText.style.display = 'none';
    
    resultContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Running 5 specialized risk agents...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/agents/${agentId}/risk-evaluation?loan_amount=10000`);
        if (response.ok) {
            const data = await response.json();
            renderRiskEvaluation(data.evaluation);
        } else {
            // Use demo evaluation
            renderRiskEvaluation(generateDemoEvaluation(agentId));
        }
    } catch (error) {
        renderRiskEvaluation(generateDemoEvaluation(agentId));
    }
}

function generateDemoEvaluation(agentId) {
    const agent = agents.find(a => a.agent_id === agentId) || DEMO_AGENTS[0];
    const baseScore = agent.risk_score;
    
    return {
        final_score: baseScore,
        confidence: 0.85,
        behavior_score: Math.min(100, baseScore + Math.random() * 10),
        performance_score: Math.min(100, baseScore + Math.random() * 5),
        transaction_score: Math.min(100, baseScore - Math.random() * 5),
        integrity_score: Math.min(100, baseScore + Math.random() * 8),
        market_score: 70 + Math.random() * 10,
        recommendation: baseScore >= 60 
            ? 'APPROVED - Agent meets risk threshold for lending'
            : 'CAUTION - Agent requires additional verification'
    };
}

function renderRiskEvaluation(evaluation) {
    const container = document.getElementById('risk-evaluation-result');
    if (!container) return;
    
    const isApproved = evaluation.recommendation.startsWith('APPROVED');
    
    container.innerHTML = `
        <div class="risk-result">
            <div class="final-score" style="background: ${getRiskColor(evaluation.final_score)}20; border: 2px solid ${getRiskColor(evaluation.final_score)}">
                <span class="score-number" style="color: ${getRiskColor(evaluation.final_score)}">${evaluation.final_score.toFixed(1)}</span>
                <span class="score-label">Final Risk Score</span>
                <span class="confidence">Confidence: ${(evaluation.confidence * 100).toFixed(0)}%</span>
            </div>
            
            <div class="agent-scores-detail">
                <div class="score-row">
                    <span class="agent-name">BehaviorAgent</span>
                    <div class="score-bar"><div class="score-fill" style="width: ${evaluation.behavior_score}%; background: ${getRiskColor(evaluation.behavior_score)}"></div></div>
                    <span class="agent-value">${evaluation.behavior_score.toFixed(0)}</span>
                </div>
                <div class="score-row">
                    <span class="agent-name">PerformanceAgent</span>
                    <div class="score-bar"><div class="score-fill" style="width: ${evaluation.performance_score}%; background: ${getRiskColor(evaluation.performance_score)}"></div></div>
                    <span class="agent-value">${evaluation.performance_score.toFixed(0)}</span>
                </div>
                <div class="score-row">
                    <span class="agent-name">TransactionAgent</span>
                    <div class="score-bar"><div class="score-fill" style="width: ${evaluation.transaction_score}%; background: ${getRiskColor(evaluation.transaction_score)}"></div></div>
                    <span class="agent-value">${evaluation.transaction_score.toFixed(0)}</span>
                </div>
                <div class="score-row">
                    <span class="agent-name">IntegrityAgent</span>
                    <div class="score-bar"><div class="score-fill" style="width: ${evaluation.integrity_score}%; background: ${getRiskColor(evaluation.integrity_score)}"></div></div>
                    <span class="agent-value">${evaluation.integrity_score.toFixed(0)}</span>
                </div>
                <div class="score-row">
                    <span class="agent-name">MarketRiskAgent</span>
                    <div class="score-bar"><div class="score-fill" style="width: ${evaluation.market_score}%; background: ${getRiskColor(evaluation.market_score)}"></div></div>
                    <span class="agent-value">${evaluation.market_score.toFixed(0)}</span>
                </div>
            </div>
            
            <div class="recommendation ${isApproved ? 'approved' : 'caution'}">
                <strong>${isApproved ? '✓' : '⚠'}</strong>
                <span>${evaluation.recommendation}</span>
            </div>
        </div>
    `;
}

// ==================== Modal Functions ====================

function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) modal.classList.add('active');
}

function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) modal.classList.remove('active');
}

function generateHash() {
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    document.getElementById('code-hash').value = hash;
}

// ==================== Form Handling ====================

function setupEventListeners() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Close modal on outside click
    const modalOverlay = document.getElementById('register-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeRegisterModal();
            }
        });
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('agent-name').value;
    const agentType = document.getElementById('agent-type').value;
    const codeHash = document.getElementById('code-hash').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Registering...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/agents/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                agent_type: agentType,
                code_hash: codeHash
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            closeRegisterModal();
            showSuccessNotification(`Agent "${data.agent.name}" registered successfully!`);
            await loadAgents();
            
            // Reset form
            e.target.reset();
        } else {
            const error = await response.json();
            showErrorNotification(error.detail || 'Registration failed');
        }
    } catch (error) {
        // Demo mode - add to local array
        const newAgent = {
            agent_id: `agent_${Date.now()}`,
            name,
            agent_type: agentType,
            wallet_address: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join(''),
            risk_score: 50,
            reputation_level: 'bronze',
            successful_loans: 0,
            transaction_count: 0,
            is_active: true
        };
        agents.push(newAgent);
        renderAgentList();
        closeRegisterModal();
        showSuccessNotification(`Agent "${name}" registered (demo mode)!`);
        e.target.reset();
    }
    
    submitBtn.textContent = 'Register Agent with KYA';
    submitBtn.disabled = false;
}

// ==================== Notifications ====================

function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${type === 'success' ? '✓' : '✕'}</span>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== Utilities ====================

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function getRiskColor(score) {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#6366f1'; // purple
    if (score >= 40) return '#f59e0b'; // yellow
    return '#ef4444'; // red
}

// ==================== Export for integration ====================

window.AgenticBank = {
    loadAgents,
    loadPoolStats,
    selectAgent,
    evaluateAgentRisk,
    openRegisterModal,
    closeRegisterModal,
    agents: () => agents,
    poolStats: () => poolStats,
    API_BASE,
    setApiBase: (url) => { window.API_BASE = url; }
};
