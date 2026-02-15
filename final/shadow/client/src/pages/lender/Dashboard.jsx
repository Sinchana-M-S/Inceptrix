import { useState, useEffect } from 'react';
import { lenderAPI } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import { 
  Search, Users, Eye, X, CheckCircle, AlertCircle
} from 'lucide-react';

const LenderDashboard = () => {
  const [caregivers, setCaregivers] = useState([]);
  const [riskBands, setRiskBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({ region: '', minScore: '', riskBand: '' });
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [creditDetails, setCreditDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [searchRes, bandsRes] = await Promise.all([
        lenderAPI.search({}),
        lenderAPI.getRiskBands()
      ]);
      setCaregivers(searchRes.data.data);
      setRiskBands(bandsRes.data.data.bands);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await lenderAPI.search(searchParams);
      setCaregivers(res.data.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewCreditDetails = async (caregiver) => {
    setSelectedCaregiver(caregiver);
    setDetailsLoading(true);
    try {
      const [creditRes, breakdownRes] = await Promise.all([
        lenderAPI.getCreditLimit(caregiver.caregiver.id),
        lenderAPI.getBreakdown(caregiver.caregiver.id)
      ]);
      setCreditDetails({
        credit: creditRes.data.data,
        breakdown: breakdownRes.data.data
      });
    } catch (err) {
      console.error('Error loading credit details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getBandColor = (band) => {
    const colors = { none: 'danger', emerging: 'warning', creditEligible: 'primary', lowRisk: 'success', prime: 'success' };
    return colors[band] || 'info';
  };

  if (loading && caregivers.length === 0) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar role="lender" />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="spinner"></div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="lender" />
      
      <main className="main-content">
        <TopHeader title="Lender Dashboard" subtitle="Access VCS-based credit decisions" />
        
        <div className="page-content">
          {/* Risk Bands */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Risk Band Definitions</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                {riskBands.map((band, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
                    <div className={`badge badge-${getBandColor(band.key)}`} style={{ marginBottom: '0.5rem' }}>
                      {band.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{band.range.min}-{band.range.max}</div>
                    {band.loanEligible && (
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d4a853', marginTop: '0.25rem' }}>
                        ₹{(band.maxLoanMultiplier * 5000).toLocaleString()} max
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Region</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filter by region..."
                    value={searchParams.region}
                    onChange={(e) => setSearchParams({ ...searchParams, region: e.target.value })}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <label className="form-label">Min Score</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={searchParams.minScore}
                    onChange={(e) => setSearchParams({ ...searchParams, minScore: e.target.value })}
                  />
                </div>
                <div style={{ width: 160 }}>
                  <label className="form-label">Risk Band</label>
                  <select
                    className="form-input"
                    value={searchParams.riskBand}
                    onChange={(e) => setSearchParams({ ...searchParams, riskBand: e.target.value })}
                  >
                    <option value="">All Bands</option>
                    {riskBands.map((band) => (
                      <option key={band.key} value={band.key}>{band.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleSearch} className="btn btn-primary">
                  <Search size={18} /> Search
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#22c55e' }} />
                Eligible Caregivers
              </h3>
              <span className="badge badge-info">{caregivers.length} results</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {caregivers.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Caregiver</th>
                      <th>Region</th>
                      <th>VCS Score</th>
                      <th>Risk Band</th>
                      <th>Max Loan</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caregivers.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%', 
                              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}>
                              {item.caregiver.name.charAt(0)}
                            </div>
                            {item.caregiver.name}
                          </div>
                        </td>
                        <td>{item.caregiver.region}</td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{item.vcs.score}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${item.vcs.loanEligible ? 'success' : 'danger'}`}>
                            {item.vcs.riskBandLabel}
                          </span>
                        </td>
                        <td>
                          {item.vcs.loanEligible ? (
                            <span style={{ fontWeight: 600, color: '#22c55e' }}>₹{item.vcs.maxLoanAmount?.toLocaleString()}</span>
                          ) : '-'}
                        </td>
                        <td>
                          <button 
                            onClick={() => viewCreditDetails(item)}
                            className="btn btn-sm btn-secondary"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>No caregivers found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Credit Details Modal */}
      {selectedCaregiver && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="card-header" style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h3 className="card-title">Credit Assessment</h3>
              <button 
                onClick={() => { setSelectedCaregiver(null); setCreditDetails(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} style={{ color: '#64748b' }} />
              </button>
            </div>
            <div className="card-body">
              {detailsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
              ) : creditDetails && (
                <div>
                  {/* Caregiver Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
                    <div style={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.25rem'
                    }}>
                      {selectedCaregiver.caregiver.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.125rem' }}>{selectedCaregiver.caregiver.name}</div>
                      <div style={{ color: '#64748b' }}>{selectedCaregiver.caregiver.region}</div>
                    </div>
                  </div>

                  {/* Credit Decision */}
                  {creditDetails.credit.eligible ? (
                    <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                      <CheckCircle size={24} />
                      <div>
                        <div style={{ fontWeight: 700 }}>Loan Eligible</div>
                        <div style={{ fontSize: '0.875rem' }}>VCS Score: {creditDetails.credit.vcsScore}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                      <AlertCircle size={24} />
                      <div>
                        <div style={{ fontWeight: 700 }}>Not Eligible</div>
                        <div style={{ fontSize: '0.875rem' }}>{creditDetails.credit.reason}</div>
                      </div>
                    </div>
                  )}

                  {creditDetails.credit.eligible && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ background: '#f0fdf4', borderRadius: '0.75rem', padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Recommended Credit Limit</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>
                          ₹{creditDetails.credit.suggestedCreditLimit?.recommended?.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: '#fef3e2', borderRadius: '0.75rem', padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Interest Band</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b8943f', textTransform: 'capitalize' }}>
                          {creditDetails.credit.interestBand}
                        </div>
                      </div>
                    </div>
                  )}

                  {creditDetails.credit.eligible && (
                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                      Initiate Loan Application
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LenderDashboard;
