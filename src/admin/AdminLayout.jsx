import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings,
  Activity, LogOut, Shield, ListOrdered, Layers,
  Menu, X, ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import './admin.css';

const NAV = [
  { section: 'Overview' },
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard'     },
  { section: 'Data Management' },
  { to: '/admin/users',         icon: Users,           label: 'Users'         },
  { to: '/admin/transactions',  icon: ListOrdered,     label: 'Transactions'  },
  { section: 'Configuration' },
  { to: '/admin/tiers',         icon: Layers,          label: 'Mining Tiers'  },
  { to: '/admin/settings',      icon: Settings,        label: 'Payment Setup' },
  { section: 'System' },
  { to: '/admin/activity',      icon: Activity,        label: 'Activity Log'  },
];

export default function AdminLayout({ children, title, breadcrumb }) {
  const { user, logout, stats } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="admin-logo">
        <div className="admin-logo-text">Grid<span>miner</span></div>
        <div className="admin-logo-sub">Admin Panel</div>
      </div>

      {/* Nav */}
      <nav className="admin-nav">
        {NAV.map((item, i) => {
          if (item.section) return <div key={i} className="admin-nav-section">{item.section}</div>;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span className="admin-nav-label">{item.label}</span>
              {item.to === '/admin/transactions' && (stats?.pendingUpgrades ?? 0) > 0 && (
                <span className="admin-nav-badge">{stats.pendingUpgrades}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={15} /> <span className="admin-nav-label">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-shell">

      {/* ── Overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="admin-sidebar-close"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">

        {/* Topbar */}
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            {/* Hamburger — visible on mobile/tablet */}
            <button
              className="admin-hamburger"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <div className="admin-topbar-titles">
              <span className="admin-page-title">{title || 'Admin Panel'}</span>
              <span className="admin-breadcrumb">{breadcrumb || 'Cloud Mining 2.0 › Admin'}</span>
            </div>
          </div>
          <div className="admin-topbar-right">
            <div className="admin-admin-badge">
              <div className="admin-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
              <span className="admin-topbar-name">{user?.name}</span>
              <Shield size={12} style={{ marginLeft: 4, color: '#1a9e8f' }} />
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
