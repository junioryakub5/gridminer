import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const METHODS = [
  {
    id: 'naira',
    label: 'Pay with Naira',
    sub: 'NGN — Nigerian Naira',
    featured: false,
  },
  {
    id: 'cedis',
    label: 'Pay with Cedis',
    sub: 'GHS — Ghanaian Cedis',
    featured: false,
  },
  {
    id: 'usdt',
    label: 'Pay with USDT',
    sub: 'TRC20 Network',
    featured: true,
  },
];

export default function PaymentMethod() {
  const navigate = useNavigate();

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="pm-header">
        <button className="pm-back-btn" onClick={() => navigate('/upgrade')}>
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="pm-title">Payment Method</h2>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Subtitle ── */}
      <p className="pm-subtitle">Select your preferred currency</p>

      {/* ── Option cards ── */}
      <div className="pm-list">
        {METHODS.map(m => (
          <button
            key={m.id}
            className={`pm-card${m.featured ? ' pm-card-featured' : ''}`}
            onClick={() => navigate(`/deposit/${m.id}`)}
          >
            {/* Icon bubble */}
            <div className="pm-icon-wrap">
              <Wallet size={20} strokeWidth={2} />
            </div>

            {/* Text */}
            <div className="pm-card-text">
              <div className="pm-card-name">{m.label}</div>
              <div className="pm-card-sub">{m.sub}</div>
            </div>

            {/* Arrow */}
            <ChevronRight size={20} strokeWidth={2.5} className="pm-arrow" />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
