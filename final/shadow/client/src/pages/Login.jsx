import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Phone, Lock, AlertCircle, ArrowRight, User } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(formData.phone, formData.password);
      // Redirect based on role
      const roleRoutes = {
        caregiver: '/caregiver',
        verifier: '/verifier',
        lender: '/lender',
        admin: '/admin'
      };
      navigate(roleRoutes[userData.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Caregiver', phone: '9876543210', password: 'password123', color: 'success' },
    { role: 'Verifier', phone: '9876543220', password: 'password123', color: 'info' },
    { role: 'Lender', phone: '9876543230', password: 'password123', color: 'warning' },
    { role: 'Admin', phone: '9876543240', password: 'admin123', color: 'danger' }
  ];

  const fillDemo = (account) => {
    setFormData({ phone: account.phone, password: account.password });
    setError('');
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
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" className="landing-logo" style={{ justifyContent: 'center', fontSize: '1.5rem' }}>
            <div className="landing-logo-icon" style={{ width: 48, height: 48 }}>
              <Shield size={28} />
            </div>
            Shadow<span>Ledger</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card">
          <div className="card-body" style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Sign in to access your dashboard
            </p>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                <label className="form-label">Password</label>
                <div className="form-input-icon">
                  <Lock size={20} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Don't have an account? </span>
              <Link to="/register" style={{ color: '#d4a853', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                Register
              </Link>
            </div>
          </div>
        </div>

        {/* Demo Accounts */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '1rem' }}>
              Demo Accounts
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  onClick={() => fillDemo(account)}
                  className={`btn btn-sm`}
                  style={{ 
                    width: '100%',
                    justifyContent: 'flex-start',
                    background: '#f1f5f9',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <User size={14} />
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
