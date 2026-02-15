import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, LayoutDashboard, Heart, TrendingUp, Users, Bell, Settings, LogOut,
  History, Wallet, BarChart3, AlertTriangle, Eye, Activity, ClipboardCheck
} from 'lucide-react';

const Sidebar = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = {
    caregiver: [
      { section: 'Main', items: [
        { to: '/caregiver', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/caregiver/log', icon: Heart, label: 'Log Activity', badge: null },
        { to: '/caregiver/score', icon: TrendingUp, label: 'My Score' },
        { to: '/caregiver/history', icon: History, label: 'Activity History' },
      ]},
    ],
    verifier: [
      { section: 'Verification', items: [
        { to: '/verifier', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/verifier/pending', icon: ClipboardCheck, label: 'Pending', badge: 3 },
        { to: '/verifier/history', icon: History, label: 'My Validations' },
      ]},
    ],
    lender: [
      { section: 'Credit', items: [
        { to: '/lender', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/lender/search', icon: Users, label: 'Search Caregivers' },
        { to: '/lender/applications', icon: Wallet, label: 'Loan Applications' },
      ]},
    ],
    admin: [
      { section: 'Monitoring', items: [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/bias', icon: Eye, label: 'Bias Audit', badge: 2 },
        { to: '/admin/fraud', icon: AlertTriangle, label: 'Fraud Alerts' },
        { to: '/admin/drift', icon: Activity, label: 'Model Drift' },
      ]},
    ],
  };

  const roleLabels = {
    caregiver: 'Caregiver Portal',
    verifier: 'Verifier Portal',
    lender: 'Lender Portal',
    admin: 'Admin Console'
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1>
          <Shield size={24} style={{ color: '#d4a853' }} />
          Shadow<span>Ledger</span>
        </h1>
        <p>{roleLabels[role]}</p>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {navItems[role]?.map((section, i) => (
          <div key={i} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            <nav className="sidebar-nav">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === `/${role}`}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  {item.label}
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        <NavLink to="/notifications" className="sidebar-nav-item">
          <Bell size={20} />
          Notifications
          <span className="sidebar-badge">5</span>
        </NavLink>
        <NavLink to="/settings" className="sidebar-nav-item">
          <Settings size={20} />
          Settings
        </NavLink>
      </div>

      {/* User & Logout */}
      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            background: '#d4a853', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#0a1628',
            fontWeight: 600
          }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem',
            color: '#f87171',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
