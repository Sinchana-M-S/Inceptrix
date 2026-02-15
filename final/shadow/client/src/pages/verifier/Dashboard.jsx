import { useState, useEffect } from 'react';
import { testimoniesAPI } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import { 
  Users, CheckCircle, Clock, Star, MapPin, Send
} from 'lucide-react';

const VerifierDashboard = () => {
  const [pending, setPending] = useState([]);
  const [myValidations, setMyValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [validating, setValidating] = useState(false);
  const [ratings, setRatings] = useState({
    reliability: 4,
    consistency: 4,
    quality: 4,
    communityImpact: 4
  });
  const [freeText, setFreeText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pendingRes, validationsRes] = await Promise.all([
        testimoniesAPI.getPending(),
        testimoniesAPI.getMyValidations()
      ]);
      setPending(pendingRes.data.data);
      setMyValidations(validationsRes.data.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitTestimony = async () => {
    if (!selectedCaregiver) return;
    setValidating(true);

    try {
      await testimoniesAPI.submit({
        caregiverId: selectedCaregiver.caregiver.id,
        structuredRating: ratings,
        freeText,
        relationshipToCaregiver: 'community_member',
        knownDuration: 12
      });
      
      setSelectedCaregiver(null);
      setFreeText('');
      setRatings({ reliability: 4, consistency: 4, quality: 4, communityImpact: 4 });
      loadData();
    } catch (err) {
      console.error('Error submitting testimony:', err);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar role="verifier" />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="spinner"></div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="verifier" />
      
      <main className="main-content">
        <TopHeader title="Verifier Dashboard" subtitle="Validate community caregivers" />
        
        <div className="page-content">
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-icon success">
                <CheckCircle size={24} />
              </div>
              <div className="stat-value">{myValidations.length}</div>
              <div className="stat-label">Validations Done</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon warning">
                <Clock size={24} />
              </div>
              <div className="stat-value">{pending.length}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon primary">
                <Star size={24} />
              </div>
              <div className="stat-value">92%</div>
              <div className="stat-label">Trust Level</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedCaregiver ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
            {/* Pending Verifications */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} style={{ color: '#f59e0b' }} />
                  Pending Verifications
                </h3>
                <span className="badge badge-warning">{pending.length}</span>
              </div>
              <div className="card-body" style={{ padding: pending.length > 0 ? 0 : '2rem' }}>
                {pending.length > 0 ? (
                  <div>
                    {pending.map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedCaregiver(item)}
                        style={{
                          padding: '1rem 1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          borderBottom: i < pending.length - 1 ? '1px solid #f1f5f9' : 'none',
                          background: selectedCaregiver?.caregiver.id === item.caregiver.id ? '#fef3e2' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: 44, 
                            height: 44, 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600
                          }}>
                            {item.caregiver.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.caregiver.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={12} />
                              {item.caregiver.region}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{item.pendingActivities} activities</div>
                          <div style={{ fontSize: '0.75rem', color: '#d4a853' }}>Click to validate</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No pending verifications</p>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Form */}
            {selectedCaregiver && (
              <div className="card" style={{ border: '2px solid #d4a853' }}>
                <div className="card-header" style={{ background: '#fef3e2' }}>
                  <h3 className="card-title">Validate {selectedCaregiver.caregiver.name}</h3>
                </div>
                <div className="card-body">
                  {/* Ratings */}
                  {Object.entries(ratings).map(([key, value]) => (
                    <div key={key} className="form-group">
                      <label className="form-label" style={{ textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatings({ ...ratings, [key]: star })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Star 
                              size={28} 
                              fill={star <= value ? '#d4a853' : 'transparent'}
                              style={{ color: star <= value ? '#d4a853' : '#e2e8f0' }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="form-group">
                    <label className="form-label">Additional Comments</label>
                    <textarea
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      rows={3}
                      className="form-input"
                      placeholder="Share what you know about this caregiver's work..."
                      style={{ resize: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => setSelectedCaregiver(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitTestimony}
                      disabled={validating}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {validating ? 'Submitting...' : <><Send size={18} /> Submit Validation</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Validations */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} style={{ color: '#22c55e' }} />
                My Recent Validations
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {myValidations.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Caregiver</th>
                      <th>Date</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myValidations.slice(0, 5).map((validation, i) => (
                      <tr key={i}>
                        <td>{validation.caregiverId?.name || 'Caregiver'}</td>
                        <td>{new Date(validation.timestamp).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {[...Array(5)].map((_, j) => (
                              <Star 
                                key={j} 
                                size={14}
                                fill={j < validation.structuredRating?.reliability ? '#d4a853' : 'transparent'}
                                style={{ color: j < validation.structuredRating?.reliability ? '#d4a853' : '#e2e8f0' }}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <p>You haven't validated anyone yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifierDashboard;
