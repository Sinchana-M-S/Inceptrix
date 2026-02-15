import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Users, Heart, TrendingUp, ArrowRight, Wallet, Clock } from 'lucide-react';

const Landing = () => {
  return (
    <div className="landing-hero">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <Shield size={24} />
          </div>
          Shadow<span>Ledger</span>
        </div>
        
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">
            Open Account <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="landing-hero-content">
        <div>
          <div className="landing-trust-badge">
            <Shield size={16} />
            Trusted by over 2 million caregivers
          </div>
          
          <h1 className="landing-title">
            Secure. Simple.<br />
            <span className="landing-title-accent">Smarter Credit.</span>
          </h1>
          
          <p className="landing-subtitle">
            Transform your caregiving work into economic power. Our AI-powered VCS scoring 
            converts your unpaid labor into verifiable credit — opening doors to micro-loans 
            and financial inclusion.
          </p>
          
          <div className="landing-cta">
            <Link to="/register" className="btn btn-primary btn-lg">
              Open an Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-dark btn-lg">
              Login to Dashboard
            </Link>
          </div>
          
          <div className="landing-features">
            <div className="landing-feature">
              <CheckCircle />
              Bank-grade security
            </div>
            <div className="landing-feature">
              <CheckCircle />
              24/7 AI monitoring
            </div>
            <div className="landing-feature">
              <CheckCircle />
              No credit history needed
            </div>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-card-stack">
            <div className="landing-credit-card secondary"></div>
            <div className="landing-credit-card primary">
              <div className="landing-card-label">VCS PLATINUM</div>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>
                  Your VCS Score
                </div>
                <div className="landing-card-number">
                  <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>742</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>/ 1000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" style={{ background: '#f8fafc', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
              How Shadow Ledger Works
            </h2>
            <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              We turn your invisible caregiving work into a visible, verifiable economic identity.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="stat-icon primary" style={{ margin: '0 auto 1rem' }}>
                  <Heart size={24} />
                </div>
                <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Log Daily Activities</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Record your caregiving work in your own words. Our AI understands and classifies it.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="stat-icon success" style={{ margin: '0 auto 1rem' }}>
                  <Users size={24} />
                </div>
                <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Community Validation</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Your neighbors and community vouch for your work, building social trust.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="stat-icon info" style={{ margin: '0 auto 1rem' }}>
                  <TrendingUp size={24} />
                </div>
                <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Build Your VCS</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Your Validated Contribution Score grows with consistent activity and trust.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="stat-icon warning" style={{ margin: '0 auto 1rem' }}>
                  <Wallet size={24} />
                </div>
                <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Access Credit</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  Use your VCS to access micro-loans without traditional credit history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ background: '#0f1d32', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#d4a853' }}>2M+</div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Caregivers Registered</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#d4a853' }}>₹50Cr+</div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loans Disbursed</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#d4a853' }}>98%</div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Repayment Rate</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#d4a853' }}>500+</div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Partner Lenders</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: '#f8fafc', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
            Ready to Build Your Credit Identity?
          </h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Join thousands of caregivers who have already transformed their work into economic power.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0a1628', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="landing-logo" style={{ fontSize: '1rem' }}>
            <div className="landing-logo-icon" style={{ width: 32, height: 32 }}>
              <Shield size={18} />
            </div>
            Shadow<span>Ledger</span>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
            © 2025 Shadow-Labor Ledger. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
