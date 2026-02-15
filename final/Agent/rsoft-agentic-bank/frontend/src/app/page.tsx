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

interface PoolStats {
  pool_balance: number;
  total_borrowed: number;
  total_repaid: number;
  active_loans: number;
  total_loans: number;
  utilization_rate: number;
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, poolRes] = await Promise.all([
        fetch('http://localhost:8000/api/agents/'),
        fetch('http://localhost:8000/api/lending/pool/stats')
      ]);
      
      if (agentsRes.ok) {
        setAgents(await agentsRes.json());
      }
      if (poolRes.ok) {
        setPoolStats(await poolRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReputationColor = (level: string) => {
    switch (level) {
      case 'platinum': return 'badge-platinum';
      case 'gold': return 'badge-gold';
      case 'silver': return 'badge-silver';
      default: return 'badge-bronze';
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
          <Link href="/" className="sidebar-link active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
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
          <Link href="/lending" className="sidebar-link">
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

        <div className="glass-card p-4 mt-auto">
          <p className="text-sm font-medium">KYA Protocol</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Know Your Agent v1.0</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="status-dot status-active"></span>
            <span className="text-xs" style={{ color: 'var(--success)' }}>Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to <span className="gradient-text">RSoft Agentic Bank</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Trustless Banking System for Autonomous AI Agents
          </p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid mb-8">
          <div className="glass-card p-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pool Balance</p>
            <p className="text-2xl font-bold mt-1">
              ${poolStats?.pool_balance?.toLocaleString() || '0'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--success)' }}>Available Liquidity</p>
          </div>
          
          <div className="glass-card p-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Borrowed</p>
            <p className="text-2xl font-bold mt-1">
              ${poolStats?.total_borrowed?.toLocaleString() || '0'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              {poolStats?.utilization_rate?.toFixed(1)}% Utilization
            </p>
          </div>
          
          <div className="glass-card p-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Agents</p>
            <p className="text-2xl font-bold mt-1">{agents.length}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Registered with KYA</p>
          </div>
          
          <div className="glass-card p-6">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Loans</p>
            <p className="text-2xl font-bold mt-1">{poolStats?.active_loans || 0}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              of {poolStats?.total_loans || 0} total
            </p>
          </div>
        </div>

        {/* Agents Table */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Registered AI Agents</h2>
            <Link href="/register" className="glow-button text-sm">
              + Register New Agent
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" 
                   style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
              <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-muted)' }}>No agents registered yet</p>
              <Link href="/register" className="glow-button inline-block mt-4">
                Register First Agent
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Risk Score</th>
                  <th>Reputation</th>
                  <th>Loans</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.agent_id}>
                    <td>
                      <Link href={`/agents/${agent.agent_id}`} className="hover:underline">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {agent.wallet_address.slice(0, 10)}...
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="px-2 py-1 rounded text-xs uppercase" 
                            style={{ background: 'var(--bg-card)' }}>
                        {agent.agent_type}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${agent.risk_score}%`,
                              background: getRiskColor(agent.risk_score)
                            }}
                          />
                        </div>
                        <span className="font-mono text-sm">{agent.risk_score.toFixed(0)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs uppercase ${getReputationColor(agent.reputation_level)}`}>
                        {agent.reputation_level}
                      </span>
                    </td>
                    <td>{agent.successful_loans}</td>
                    <td>
                      <span className={`status-dot ${agent.is_active ? 'status-active' : 'status-inactive'}`}></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* KYA Protocol Info */}
        <div className="glass-card p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4 gradient-text">Know Your Agent (KYA) Protocol</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-2">🔐 Code-Based Identity</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Agents are identified by their code hash, not human credentials
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">📊 Real-Time Risk Scoring</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                5 specialized AI agents evaluate risk in parallel
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">🤖 Autonomous Operations</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                AI agents can lend and borrow without human intervention
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
