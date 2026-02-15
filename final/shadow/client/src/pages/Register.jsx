import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Phone, Lock, User, MapPin, AlertCircle, ArrowRight, Building } from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'caregiver',
    region: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { id: 'caregiver', label: 'Caregiver', desc: 'Log activities & build your VCS', icon: '❤️' },
    { id: 'verifier', label: 'Verifier', desc: 'Validate community caregivers', icon: '✓' },
    { id: 'lender', label: 'Lender', desc: 'Access VCS-based credit decisions', icon: '🏦' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a1628 0%, #0f1d32 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" className="landing-logo" style={{ justifyContent: 'center', fontSize: '1.5rem' }}>
            <div className="landing-logo-icon" style={{ width: 48, height: 48 }}>
              <Shield size={28} />
            </div>
            Shadow<span>Ledger</span>
          </Link>
        </div>

        {/* Register Card */}
        <div className="card">
          <div className="card-body" style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Create Account
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              {step === 1 ? 'Choose your role to get started' : 'Complete your profile'}
            </p>

            {/* Progress Steps */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              {[1, 2].map((s) => (
                <div 
                  key={s}
                  style={{ 
                    flex: 1, 
                    height: 4, 
                    borderRadius: 2, 
                    background: s <= step ? '#d4a853' : '#e2e8f0'
                  }} 
                />
              ))}
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {step === 1 ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: role.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        border: formData.role === role.id ? '2px solid #d4a853' : '1px solid #e2e8f0',
                        background: formData.role === role.id ? '#fef3e2' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '1.5rem' }}>{role.icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{role.label}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{role.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '1.5rem' }}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="form-input-icon">
                    <User size={20} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div className="form-input-icon">
                    <Phone size={20} />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Region</label>
                  <div className="form-input-icon">
                    <MapPin size={20} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Chennai Urban"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="form-input-icon">
                      <Lock size={20} />
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm</label>
                    <div className="form-input-icon">
                      <Lock size={20} />
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Confirm"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Already have an account? </span>
              <Link to="/login" style={{ color: '#d4a853', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
