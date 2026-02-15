import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { vcsAPI, activitiesAPI } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import { 
  TrendingUp, Heart, Users, Clock, ArrowRight, CheckCircle,
  AlertTriangle, Lightbulb, Plus
} from 'lucide-react';

const CaregiverDashboard = () => {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scoreRes, activitiesRes] = await Promise.all([
        vcsAPI.getScore(),
        activitiesAPI.getMine()
      ]);
      setScore(scoreRes.data.data);
      setActivities(activitiesRes.data.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 700) return '#22c55e';
    if (score >= 500) return '#d4a853';
    if (score >= 300) return '#f59e0b';
    return '#ef4444';
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

  const vcs = score?.totalVCS || 0;
  const progress = (vcs / 1000) * 100;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="caregiver" />
      
      <main className="main-content">
        <TopHeader title="Dashboard" subtitle="Manage your caregiving activities and VCS score" />
        
        <div className="page-content">
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-icon primary">
                <TrendingUp size={24} />
              </div>
              <div className="stat-value" style={{ color: getScoreColor(vcs) }}>{vcs}</div>
              <div className="stat-label">VCS Score</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon success">
                <Heart size={24} />
              </div>
              <div className="stat-value">{activities.length}</div>
              <div className="stat-label">Activities Logged</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon info">
                <Users size={24} />
              </div>
              <div className="stat-value">{score?.breakdown?.socialTrust?.validationCount || 0}</div>
              <div className="stat-label">Validations</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon warning">
                <Clock size={24} />
              </div>
              <div className="stat-value">{Math.round(score?.breakdown?.careLabor?.totalHours || 0)}</div>
              <div className="stat-label">Hours Logged</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* VCS Score Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Your VCS Score</h3>
                <Link to="/caregiver/score" className="btn btn-sm btn-secondary">
                  View Details <ArrowRight size={14} />
                </Link>
              </div>
              <div className="card-body">
                <div className="score-display">
                  <div className="score-circle" style={{ '--progress': progress }}>
                    <div className="score-circle-inner">
                      <div className="score-value" style={{ color: getScoreColor(vcs) }}>{vcs}</div>
                      <div className="score-max">out of 1000</div>
                    </div>
                  </div>
                  
                  <div className={`badge ${vcs >= 700 ? 'badge-success' : vcs >= 500 ? 'badge-warning' : 'badge-danger'}`} style={{ marginBottom: '1rem' }}>
                    {score?.riskBandLabel || 'Building Score'}
                  </div>
                  
                  {score?.loanEligibility?.eligible ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d' }}>
                        <CheckCircle size={18} />
                        <span style={{ fontWeight: 600 }}>Loan Eligible</span>
                      </div>
                      <div style={{ color: '#166534', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Up to ₹{score.loanEligibility.maxLoanAmount?.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
                        <AlertTriangle size={18} />
                        <span style={{ fontWeight: 600 }}>Not Yet Eligible</span>
                      </div>
                      <div style={{ color: '#92400e', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Keep logging activities to build your score
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Tips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Quick Action */}
              <Link to="/caregiver/log" className="card" style={{ textDecoration: 'none' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: '0.75rem', 
                    background: 'linear-gradient(135deg, #d4a853 0%, #b8943f 100%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Plus size={28} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Log Today's Activity</h3>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Record your caregiving work to build VCS</p>
                  </div>
                  <ArrowRight size={20} style={{ marginLeft: 'auto', color: '#d4a853' }} />
                </div>
              </Link>

              {/* Tips Card */}
              <div className="card" style={{ flex: 1 }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lightbulb size={18} style={{ color: '#d4a853' }} />
                    Tips to Improve
                  </h3>
                </div>
                <div className="card-body">
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(score?.explanation?.tips || [
                      'Log activities consistently every day',
                      'Get more community validations',
                      'Add detailed descriptions to activities'
                    ]).slice(0, 3).map((tip, i) => (
                      <li key={i} style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.75rem', 
                        padding: '0.75rem 0',
                        borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none'
                      }}>
                        <div style={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          background: '#fef3e2', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d4a853' }}>{i + 1}</span>
                        </div>
                        <span style={{ color: '#475569', fontSize: '0.875rem' }}>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Recent Activities</h3>
              <Link to="/caregiver/history" className="btn btn-sm btn-secondary">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {activities.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Type</th>
                      <th>Hours</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.slice(0, 5).map((activity, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activity.rawText}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                            {activity.parsedActivity?.type || 'general'}
                          </span>
                        </td>
                        <td>{activity.parsedActivity?.estimatedHours || '-'}h</td>
                        <td>{new Date(activity.activityDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${activity.validationStatus === 'validated' ? 'badge-success' : 'badge-warning'}`}>
                            {activity.validationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Heart size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>No activities logged yet</p>
                  <Link to="/caregiver/log" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                    Log Your First Activity
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CaregiverDashboard;
