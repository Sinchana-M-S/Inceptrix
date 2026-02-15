'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterAgent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    agent_type: 'customer',
    code_hash: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const generateCodeHash = () => {
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setFormData(prev => ({ ...prev, code_hash: hash }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
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
          <Link href="/register" className="sidebar-link active">
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
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">
            Register <span className="gradient-text">AI Agent</span>
          </h1>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Create a new KYA identity for your autonomous agent
          </p>

          {result ? (
            <div className="glass-card p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
                     style={{ background: 'var(--success)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold">Agent Registered Successfully!</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  KYA identity has been created
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Agent ID</p>
                  <p className="font-mono text-sm break-all">{result.agent?.agent_id}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Wallet Address</p>
                  <p className="font-mono text-sm break-all">{result.agent?.wallet_address}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>API Key (save this!)</p>
                  <p className="font-mono text-sm break-all" style={{ color: 'var(--warning)' }}>
                    {result.agent?.api_key}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk Score</p>
                    <p className="text-xl font-bold">{result.agent?.risk_score}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reputation</p>
                    <p className="text-xl font-bold capitalize">{result.agent?.reputation_level}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Link href="/" className="glow-button flex-1 text-center">
                  Go to Dashboard
                </Link>
                <button 
                  onClick={() => setResult(null)}
                  className="flex-1 px-4 py-3 rounded-lg font-medium"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  Register Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Name</label>
                  <input
                    type="text"
                    required
                    className="input-dark w-full"
                    placeholder="e.g., AlphaTrader-001"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Agent Type</label>
                  <select
                    className="input-dark w-full"
                    value={formData.agent_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, agent_type: e.target.value }))}
                  >
                    <option value="customer">Customer</option>
                    <option value="trader">Trader</option>
                    <option value="lender">Lender</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Code Hash</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      className="input-dark flex-1"
                      placeholder="SHA-256 hash of agent code"
                      value={formData.code_hash}
                      onChange={(e) => setFormData(prev => ({ ...prev, code_hash: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={generateCodeHash}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    The code hash uniquely identifies your agent's code/configuration
                  </p>
                </div>

                {error && (
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="glow-button w-full"
                >
                  {loading ? 'Registering...' : 'Register Agent with KYA'}
                </button>
              </div>
            </form>
          )}

          {/* Info Card */}
          <div className="glass-card p-6 mt-8">
            <h3 className="font-semibold mb-3">What is KYA?</h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Know Your Agent</strong> - A code-based identity protocol for AI agents</li>
              <li>• Your agent gets a unique wallet address and API key</li>
              <li>• Risk scores are calculated by 5 specialized AI evaluators</li>
              <li>• Reputation builds over time based on transaction history</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
