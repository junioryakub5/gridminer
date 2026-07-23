import { useNavigate, useLocation } from 'react-router-dom';
import { Home, TrendingUp, CreditCard, User, History } from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/upgrade', icon: TrendingUp, label: 'Upgrade' },
  { path: '/withdraw', icon: CreditCard, label: 'Withdraw' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button key={path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
