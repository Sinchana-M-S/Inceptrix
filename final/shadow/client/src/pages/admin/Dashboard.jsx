import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import { 
  Users, AlertTriangle, TrendingUp, BarChart3, Eye, Activity, CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [biasAudit, setBiasAudit] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState(null);
  const [modelDrift, setModelDrift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, biasRes, fraudRes, driftRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getBiasAudit(),
        adminAPI.getFraudAlerts(),
        adminAPI.getModelDrift()
      ]);
      setDashboard(dashRes.data.data);
      setBiasAudit(biasRes.data.data);
      setFraudAlerts(fraudRes.data.data);
      setModelDrift(driftRes.data.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar role="admin" />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="spinner"></div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bias', label: 'Bias Audit', icon: Eye },
    { id: 'fraud', label: 'Fraud Alerts', icon: AlertTriangle },
    { id: 'drift', label: 'Model Drift', icon: TrendingUp }
  ];

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="admin" />
      
      <main className="main-content">
        <TopHeader title="Admin Dashboard" subtitle="System monitoring & audits" />
        
        <div className="page-content">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && dashboard && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="stat-icon success">
                    <Users size={24} />
                  </div>
                  <div className="stat-value">{dashboard.users.caregivers}</div>
                  <div className="stat-label">Caregivers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon info">
                    <Users size={24} />
                  </div>
                  <div className="stat-value">{dashboard.users.verifiers}</div>
                  <div className="stat-label">Verifiers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon primary">
                    <Activity size={24} />
                  </div>
                  <div className="stat-value">{dashboard.activities.total}</div>
                  <div className="stat-label">Activities Logged</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon warning">
                    <TrendingUp size={24} />
                  </div>
                  <div className="stat-value">{dashboard.vcs.averageScore}</div>
                  <div className="stat-label">Avg VCS Score</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">System Health</h3>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>API Status</span>
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={16} /> Online
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>Database</span>
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={16} /> Connected
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>Model Status</span>
                        <span style={{ color: modelDrift?.metrics?.driftStatus === 'STABLE' ? '#22c55e' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={16} /> {modelDrift?.metrics?.driftStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Quick Stats</h3>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>Avg Activities/Caregiver</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{dashboard.activities.avgPerCaregiver}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>Avg Testimonies/Caregiver</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{dashboard.testimonies.avgPerCaregiver}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        <span style={{ color: '#64748b' }}>Total Lenders</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{dashboard.users.lenders}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bias Audit Tab */}
          {activeTab === 'bias' && biasAudit && (
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h3 className="card-title">Regional Score Distribution</h3>
                  <span className={`badge badge-${biasAudit.regionBias.alert === 'LOW' ? 'success' : biasAudit.regionBias.alert === 'MEDIUM' ? 'warning' : 'danger'}`}>
                    {biasAudit.regionBias.alert} Alert
                  </span>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={biasAudit.regionBias.distribution}>
                      <XAxis dataKey="_id" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="avgScore" fill="#d4a853" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Urban-Rural Gap: </span>
                    <span style={{ fontWeight: 700, color: Math.abs(biasAudit.regionBias.urbanRuralGap) < 50 ? '#22c55e' : '#f59e0b' }}>
                      {biasAudit.regionBias.urbanRuralGap} points
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fraud Alerts Tab */}
          {activeTab === 'fraud' && fraudAlerts && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="stat-icon warning">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="stat-value">{fraudAlerts.suspiciousActivities?.length || 0}</div>
                  <div className="stat-label">Suspicious Activities</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon primary">
                    <Users size={24} />
                  </div>
                  <div className="stat-value">{fraudAlerts.suspiciousTestimonies?.length || 0}</div>
                  <div className="stat-label">Collusion Risks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon danger">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="stat-value">{fraudAlerts.flaggedUsers?.length || 0}</div>
                  <div className="stat-label">Flagged Users</div>
                </div>
              </div>

              {fraudAlerts.flaggedUsers?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                      Flagged Users
                    </h3>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Region</th>
                          <th>Risk Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fraudAlerts.flaggedUsers.slice(0, 10).map((user, i) => (
                          <tr key={i}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                {user.user.name}
                              </div>
                            </td>
                            <td>{user.user.region}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#ef4444' }}>{(user.riskScore * 100).toFixed(0)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model Drift Tab */}
          {activeTab === 'drift' && modelDrift && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="stat-icon info">
                    <TrendingUp size={24} />
                  </div>
                  <div className="stat-value">{modelDrift.metrics.overallAverage}</div>
                  <div className="stat-label">Overall Avg Score</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon primary">
                    <Activity size={24} />
                  </div>
                  <div className="stat-value">{modelDrift.metrics.recentWeekAverage}</div>
                  <div className="stat-label">Recent Week Avg</div>
                </div>
                <div className="stat-card">
                  <div className={`stat-icon ${modelDrift.metrics.driftStatus === 'STABLE' ? 'success' : 'warning'}`}>
                    <CheckCircle size={24} />
                  </div>
                  <div className="stat-value" style={{ color: modelDrift.metrics.driftStatus === 'STABLE' ? '#22c55e' : '#f59e0b' }}>
                    {modelDrift.metrics.driftStatus}
                  </div>
                  <div className="stat-label">Drift Status</div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Score Trend (30 Days)</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={modelDrift.trend}>
                      <XAxis 
                        dataKey="_id" 
                        stroke="#94a3b8"
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric' })}
                        fontSize={12}
                      />
                      <YAxis stroke="#94a3b8" domain={[0, 1000]} fontSize={12} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="avgScore" stroke="#d4a853" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
