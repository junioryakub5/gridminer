import { NavLink, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, CreditCard, User, History, LogOut, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV = [
  { to: '/dashboard', icon: Home,       label: 'Home'     },
  { to: '/upgrade',   icon: TrendingUp,  label: 'Upgrade'  },
  { to: '/history',   icon: History,     label: 'History'  },
  { to: '/withdraw',  icon: CreditCard,  label: 'Withdraw' },
  { to: '/profile',   icon: User,        label: 'Profile'  },
];

/**
 * SideNav — only visible on desktop (≥ 1024px via CSS).
 * Shows brand, nav links, user info, and logout.
 */
export default function SideNav() {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  return (
    <aside className="side-nav">
      {/* Brand */}
      <div className="sn-brand">
        <div className="sn-logo">Cloud Mining <span>2.0</span></div>
        <div className="sn-logo-sub">Secure TRC20 Network</div>
      </div>

      {/* Nav links */}
      <nav className="sn-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sn-link${isActive ? ' sn-active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="sn-footer">
        <div className="sn-user">
          <div className="sn-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="sn-user-info">
            <div className="sn-user-name">{user?.name}</div>
            <div className="sn-user-tier">Tier {user?.tier}</div>
          </div>
        </div>
        <button
          className="sn-logout"
          onClick={() => { logout(); navigate('/login'); }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
