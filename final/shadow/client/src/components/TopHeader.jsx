import { useAuth } from '../context/AuthContext';
import { Search, Bell, ChevronDown } from 'lucide-react';

const TopHeader = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <header className="top-header">
      <div className="top-header-left">
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{subtitle}</p>}
        </div>
      </div>

      <div className="top-header-right">
        <div className="top-header-search">
          <Search size={18} />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="status-indicator">
          <span className="status-dot"></span>
          <span style={{ color: '#22c55e', fontWeight: 500 }}>Systems Synced</span>
        </div>

        <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Bell size={20} style={{ color: '#64748b' }} />
          <span style={{ 
            position: 'absolute', 
            top: -4, 
            right: -4, 
            width: 18, 
            height: 18, 
            borderRadius: '50%', 
            background: '#ef4444', 
            color: 'white', 
            fontSize: '0.7rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>3</span>
        </button>

        <div className="user-menu">
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role} User</div>
          </div>
          <ChevronDown size={16} style={{ color: '#64748b' }} />
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
