'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Agent {
  agent_id: string;
  name: string;
  agent_type: string;
  wallet_address: string;
  risk_score: number;
  reputation_level: string;
  successful_loans: number;
  transaction_count: number;
  is_active: boolean;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [riskEvaluation, setRiskEvaluation] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/agents/');
      if (res.ok) {
        setAgents(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluateRisk = async (agentId: string) => {
    setSelectedAgent(agentId);
    setEvaluating(true);
    setRiskEvaluation(null);

    try {
      const res = await fetch(`http://localhost:8000/api/agents/${agentId}/risk-evaluation?loan_amount=10000`);
      if (res.ok) {
        const data = await res.json();
        setRiskEvaluation(data.evaluation);
      }
    } catch (error) {
      console.error('Failed to evaluate risk:', error);
    } finally {
      setEvaluating(false);
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
          <Link href="/agents" className="sidebar-link active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="5"/>
              <path d="M20 21a8 8 0 0 0-16 0"/>
            </svg>
            Agents
          </Link>
          <Link href="/lending" className="sidebar-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">AI Agents</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              All registered agents with KYA identity
            </p>
          </div>
          <Link href="/register" className="glow-button">
            + Register Agent
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="glass-card p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" 
                     style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
                <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <p style={{ color: 'var(--text-muted)' }}>No agents registered</p>
              </div>
            ) : (
              agents.map((agent) => (
                <div 
                  key={agent.agent_id}
                  className={`glass-card p-6 cursor-pointer ${selectedAgent === agent.agent_id ? 'animate-pulse-glow' : ''}`}
                  onClick={() => evaluateRisk(agent.agent_id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{agent.name}</h3>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {agent.wallet_address}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-2xl font-bold font-mono"
                          style={{ color: getRiskColor(agent.risk_score) }}
                        >
                          {agent.risk_score.toFixed(0)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs uppercase badge-${agent.reputation_level}`}>
                        {agent.reputation_level}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Type</p>
                      <p className="font-medium capitalize">{agent.agent_type}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loans</p>
                      <p className="font-medium">{agent.successful_loans}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</p>
                      <div className="flex items-center gap-2">
                        <span className={`status-dot ${agent.is_active ? 'status-active' : 'status-inactive'}`}></span>
                        <span>{agent.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Risk Evaluation Panel */}
          <div className="glass-card p-6 h-fit sticky top-8">
            <h3 className="text-lg font-semibold mb-4">Risk Evaluation</h3>
            
            {!selectedAgent ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Click on an agent to run multi-agent risk evaluation
              </p>
            ) : evaluating ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" 
                     style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
                <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Running 5 specialized agents...
                </p>
              </div>
            ) : riskEvaluation ? (
              <div className="space-y-4">
                {/* Final Score */}
                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Final Risk Score</p>
                  <p 
                    className="text-4xl font-bold font-mono"
                    style={{ color: getRiskColor(riskEvaluation.final_score) }}
                  >
                    {riskEvaluation.final_score.toFixed(1)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Confidence: {(riskEvaluation.confidence * 100).toFixed(0)}%
                  </p>
                </div>

                {/* Agent Scores */}
                <div className="space-y-2">
                  {[
                    { name: 'Behavior', score: riskEvaluation.behavior_score },
                    { name: 'Performance', score: riskEvaluation.performance_score },
                    { name: 'Transaction', score: riskEvaluation.transaction_score },
                    { name: 'Integrity', score: riskEvaluation.integrity_score },
                    { name: 'Market', score: riskEvaluation.market_score },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="text-xs w-20" style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-card)' }}>
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${item.score}%`,
                            background: getRiskColor(item.score)
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">{item.score.toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Recommendation */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs font-medium mb-1">Recommendation</p>
                  <p className="text-sm" style={{ color: riskEvaluation.recommendation.startsWith('APPROVED') ? 'var(--success)' : 'var(--danger)' }}>
                    {riskEvaluation.recommendation}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
