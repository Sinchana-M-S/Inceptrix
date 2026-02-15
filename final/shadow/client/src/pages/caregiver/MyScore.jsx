import { useState, useEffect } from 'react';
import { vcsAPI } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import { 
  Heart, TrendingUp, Info, ChevronDown, ChevronUp,
  Shield, Users, Wallet, CheckCircle, AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const MyScore = () => {
  const [breakdown, setBreakdown] = useState(null);
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [breakdownRes, historyRes, insightsRes] = await Promise.all([
        vcsAPI.getBreakdown(),
        vcsAPI.getHistory(),
        vcsAPI.getInsights()
      ]);
      setBreakdown(breakdownRes.data.data);
      setHistory(historyRes.data.data);
      setInsights(insightsRes.data.data);
    } catch (err) {
      console.error('Error loading score data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar role="caregiver" />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="spinner"></div>
        </main>
      </div>
    );
  }

  const scoreComponents = [
    { key: 'careLabor', icon: Heart, label: 'Care Activities', color: 'success', max: 26 },
    { key: 'socialTrust', icon: Users, label: 'Community Trust', color: 'info', max: 19 },
    { key: 'behavioralFinance', icon: Wallet, label: 'Financial Behavior', color: 'primary', max: 23 },
    { key: 'economicProxies', icon: TrendingUp, label: 'Economic Stability', color: 'info', max: 17 },
    { key: 'identityStability', icon: Shield, label: 'Identity & Stability', color: 'warning', max: 15 }
  ];

  const vcs = breakdown?.totalVCS || 0;
  const progress = (vcs / 1000) * 100;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="caregiver" />
      
      <main className="main-content">
        <TopHeader title="My VCS Score" subtitle="Detailed breakdown and history" />
        
        <div className="page-content">
          {/* Score Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="score-circle" style={{ '--progress': progress }}>
                  <div className="score-circle-inner">
                    <div className="score-value">{vcs}</div>
                    <div className="score-max">out of 1000</div>
                  </div>
                </div>
                
                <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
                  {insights?.riskBand || 'Building'}
                </div>
                
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  {breakdown?.explanation?.summary || 'Your score reflects your caregiving activities and community trust.'}
                </p>
                
                {insights?.nextMilestone && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Next Milestone</div>
                    <div style={{ fontWeight: 600, color: '#d4a853' }}>
                      {insights.nextMilestone.points} more points to {insights.nextMilestone.band}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Score Trend */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Score Trend (30 Days)</h3>
              </div>
              <div className="card-body">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#d4a853" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis domain={[0, 1000]} stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#d4a853" strokeWidth={2} fill="url(#scoreGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                    Not enough data for trend chart
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <h3 className="card-title">Score Breakdown</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {scoreComponents.map((component, i) => {
                const data = breakdown?.breakdown?.[component.key];
                const rawScore = data?.total ?? data ?? 0;
                const score = isNaN(rawScore) ? 0 : rawScore;
                const percentage = Math.min((score / component.max) * 100, 100);
                const isExpanded = expandedSection === component.key;

                return (
                  <div key={component.key} style={{ borderBottom: i < scoreComponents.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : component.key)}
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className={`stat-icon ${component.color}`} style={{ width: 40, height: 40 }}>
                          <component.icon size={20} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{component.label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {Math.round(score)} / {component.max} points
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 120 }}>
                          <div className="progress">
                            <div className={`progress-bar ${component.color === 'primary' ? 'primary' : component.color}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} style={{ color: '#64748b' }} /> : <ChevronDown size={18} style={{ color: '#64748b' }} />}
                      </div>
                    </button>
                    
                    {isExpanded && data?.details && (
                      <div style={{ padding: '0 1.5rem 1rem', borderTop: '1px solid #f1f5f9', marginTop: -1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', paddingTop: '1rem' }}>
                          {Object.entries(data.details).map(([key, value]) => (
                            <div key={key} style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{typeof value === 'number' ? value.toFixed(1) : value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {breakdown?.breakdown?.penalties?.totalPenalty > 0 && (
                <div style={{ padding: '1rem 1.5rem', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#dc2626' }}>Risk Penalties</div>
                      <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                        -{breakdown.breakdown.penalties.totalPenalty} points deducted
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Factors Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} style={{ color: '#22c55e' }} />
                  Helping Your Score
                </h3>
              </div>
              <div className="card-body">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(insights?.factorsHelping || ['Consistent activity logging', 'Community validations']).map((factor, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginTop: 6, flexShrink: 0 }} />
                      <span style={{ color: '#475569', fontSize: '0.875rem' }}>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={18} style={{ color: '#d4a853' }} />
                  Areas to Improve
                </h3>
              </div>
              <div className="card-body">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(insights?.factorsHurting || ['Add more verifications', 'Log activities more consistently']).map((factor, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4a853', marginTop: 6, flexShrink: 0 }} />
                      <span style={{ color: '#475569', fontSize: '0.875rem' }}>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyScore;
