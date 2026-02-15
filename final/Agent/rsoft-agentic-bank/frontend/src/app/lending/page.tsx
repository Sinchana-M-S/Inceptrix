'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Agent {
  agent_id: string;
  name: string;
  risk_score: number;
}

interface PoolStats {
  pool_balance: number;
  total_borrowed: number;
  total_repaid: number;
  active_loans: number;
  total_loans: number;
  utilization_rate: number;
}

export default function LendingPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [loanRequest, setLoanRequest] = useState({
    agent_id: '',
    amount: 10000,
    duration_days: 30
  });
  const [submitting, setSubmitting] = useState(false);
  const [loanResult, setLoanResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, poolRes] = await Promise.all([
        fetch('http://localhost:8000/api/agents/'),
        fetch('http://localhost:8000/api/lending/pool/stats')
      ]);
      
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (poolRes.ok) setPoolStats(await poolRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoanRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setLoanResult(null);

    try {
      const res = await fetch('http://localhost:8000/api/lending/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanRequest)
      });

      const data = await res.json();
      
      if (res.ok) {
        setLoanResult(data);
        fetchData(); // Refresh stats
      } else {
        setError(data.detail || 'Loan request failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#6366f1';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="mb-8">
          <h1 className="text-2xl font-bold gradient-text">RSoft</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Agentic Bank</p>
        </div>

        <nav className="flex-1">
          <Link href="/" className="sidebar-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            Dashboard
          </Link>
          <Link href="/agents" className="sidebar-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="5"/>
              <path d="M20 21a8 8 0 0 0-16 0"/>
            </svg>
            Agents
          </Link>
          <Link href="/lending" className="sidebar-link active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M7 15h0M2 9h20"/>
            </svg>
            Lending Pool
          </Link>
          <Link href="/register" className="sidebar-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
            Register Agent
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Lending Pool</span>
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Autonomous lending and borrowing for AI agents
        </p>

        {/* Pool Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pool Balance</p>
            <p className="text-xl font-bold">${poolStats?.pool_balance?.toLocaleString() || '0'}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Borrowed</p>
            <p className="text-xl font-bold">${poolStats?.total_borrowed?.toLocaleString() || '0'}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Repaid</p>
            <p className="text-xl font-bold">${poolStats?.total_repaid?.toLocaleString() || '0'}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Utilization</p>
            <p className="text-xl font-bold">{poolStats?.utilization_rate?.toFixed(1) || '0'}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Loan Request Form */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-6">Request Loan</h2>
            
            <form onSubmit={handleLoanRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Agent</label>
                <select
                  required
                  className="input-dark w-full"
                  value={loanRequest.agent_id}
                  onChange={(e) => setLoanRequest(prev => ({ ...prev, agent_id: e.target.value }))}
                >
                  <option value="">Choose an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.name} (Risk: {agent.risk_score.toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Loan Amount ($)</label>
                <input
                  type="number"
                  required
                  min="100"
                  max="100000"
                  className="input-dark w-full"
                  value={loanRequest.amount}
                  onChange={(e) => setLoanRequest(prev => ({ ...prev, amount: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (days)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="365"
                  className="input-dark w-full"
                  value={loanRequest.duration_days}
                  onChange={(e) => setLoanRequest(prev => ({ ...prev, duration_days: Number(e.target.value) }))}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !loanRequest.agent_id}
                className="glow-button w-full"
              >
                {submitting ? 'Processing...' : 'Request Loan'}
              </button>
            </form>
          </div>

          {/* Loan Result */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-6">Loan Evaluation Result</h2>
            
            {!loanResult ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-50">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 15h0M2 9h20"/>
                </svg>
                <p>Submit a loan request to see evaluation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status */}
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ 
                    background: loanResult.status === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'
                  }}
                >
                  <p 
                    className="text-2xl font-bold uppercase"
                    style={{ color: loanResult.status === 'approved' ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {loanResult.status}
                  </p>
                </div>

                {/* Loan Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Amount</p>
                    <p className="font-bold">${loanResult.amount?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Interest Rate</p>
                    <p className="font-bold">{loanResult.interest_rate}%</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Due</p>
                    <p className="font-bold">${loanResult.total_due?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Collateral</p>
                    <p className="font-bold">${loanResult.collateral_required?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Risk Scores */}
                {loanResult.risk_evaluation && (
                  <div>
                    <p className="text-sm font-medium mb-2">Risk Evaluation</p>
                    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Final Score</span>
                        <span 
                          className="font-bold"
                          style={{ color: getRiskColor(loanResult.risk_evaluation.final_score) }}
                        >
                          {loanResult.risk_evaluation.final_score.toFixed(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {['behavior', 'performance', 'transaction', 'integrity', 'market'].map((key) => (
                          <div key={key} className="text-center">
                            <div 
                              className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold"
                              style={{ 
                                background: getRiskColor(loanResult.risk_evaluation.scores[key]),
                                color: 'white'
                              }}
                            >
                              {loanResult.risk_evaluation.scores[key].toFixed(0)}
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>{key.slice(0, 4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Recommendation</p>
                  <p className="text-sm">{loanResult.risk_evaluation?.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
