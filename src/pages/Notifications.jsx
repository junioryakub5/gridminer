import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, TrendingUp, ArrowDownToLine, CheckCircle,
  BellRing, CheckCheck, Info, Link2, ChevronDown, ChevronUp, Gift
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

/* Map transaction types to icon + color */
const TYPE_META = {
  mining:      { Icon: Zap,             color: '#1a9e8f', bg: 'rgba(26,158,143,0.12)',  title: 'Mining Complete'   },
  upgrades:    { Icon: TrendingUp,      color: '#d97706', bg: 'rgba(245,158,11,0.12)',  title: 'Account Upgraded'  },
  withdrawals: { Icon: ArrowDownToLine, color: '#7c3aed', bg: 'rgba(139,92,246,0.12)', title: 'Withdrawal'        },
  binding:     { Icon: Link2,           color: '#0d6e99', bg: 'rgba(13,110,160,0.12)', title: 'Wallet Bound'      },
  referral:    { Icon: Gift,            color: '#e05cc0', bg: 'rgba(224,92,192,0.12)', title: 'Referral Bonus'    },
};

const STATUS_BADGE = {
  completed: { label: 'Completed', color: '#1a9e8f',  bg: 'rgba(26,158,143,0.10)'  },
  pending:   { label: 'Pending',   color: '#d97706',  bg: 'rgba(245,158,11,0.10)'  },
  rejected:  { label: 'Rejected',  color: '#ef4444',  bg: 'rgba(239,68,68,0.10)'   },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { transactions, user } = useApp();

  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); }
    catch { return new Set(); }
  });
  const [expandedId, setExpandedId] = useState(null);

  // Build notification list from transactions + a welcome system notif
  const items = [
    {
      id: 'welcome',
      Icon: BellRing, color: '#0d6e99', bg: 'rgba(13,110,160,0.10)',
      title: 'Welcome to Gridminer!',
      msg: `Hi ${user?.name?.split(' ')[0] || 'Miner'}, your account is active and ready. Start mining to earn USDT rewards daily.`,
      detail: `Your account was created successfully. You can mine once every 24 hours. Upgrade your tier to earn more per mine session. Share your referral code to earn bonuses.`,
      time: user?.joined || 'Jul 2026',
    },
    ...[...transactions].reverse().map(tx => {
      const meta = TYPE_META[tx.type] || TYPE_META.mining;
      return {
        id: `tx-${tx.id}`,
        Icon: meta.Icon, color: meta.color, bg: meta.bg,
        title: meta.title,
        msg: tx.label,
        detail: tx.label,
        time: tx.date,
        status: tx.status,
        amount: tx.amount,
      };
    }),
  ];

  const markAllRead = () => {
    const all = new Set(items.map(i => i.id));
    setReadIds(all);
    localStorage.setItem('notif_read', JSON.stringify([...all]));
  };

  const toggleExpand = (id) => {
    // mark as read when expanded
    if (!readIds.has(id)) {
      const next = new Set(readIds).add(id);
      setReadIds(next);
      localStorage.setItem('notif_read', JSON.stringify([...next]));
    }
    setExpandedId(prev => prev === id ? null : id);
  };

  const unreadCount = items.filter(i => !readIds.has(i.id)).length;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="notif-header">
        <div>
          <h2 className="notif-page-title">Notifications</h2>
          <p className="notif-page-sub">Stay updated on your activity</p>
        </div>
        {unreadCount > 0 && (
          <button className="notif-read-all-btn" onClick={markAllRead} title="Mark all as read">
            <CheckCheck size={18} />
          </button>
        )}
      </div>

      {/* ── Notification cards ── */}
      <div className="notif-list-new">
        {items.length === 0 ? (
          <div className="notif-empty">
            <Info size={36} color="#c0d8e8" style={{ marginBottom: 10 }} />
            <p>No notifications yet</p>
          </div>
        ) : items.map(item => {
          const isUnread    = !readIds.has(item.id);
          const isExpanded  = expandedId === item.id;
          const badge       = item.status ? STATUS_BADGE[item.status] : null;

          return (
            <div
              key={item.id}
              className={`notif-card${isUnread ? ' notif-card-unread' : ''}${isExpanded ? ' notif-card-expanded' : ''}`}
              onClick={() => toggleExpand(item.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Top row */}
              <div className="notif-card-row">
                {/* Icon */}
                <div className="notif-card-icon" style={{ background: item.bg }}>
                  <item.Icon size={18} color={item.color} strokeWidth={2.2} />
                </div>

                {/* Body */}
                <div className="notif-card-body">
                  <div className="notif-card-title">{item.title}</div>
                  <div className="notif-card-msg">{item.msg}</div>
                  <div className="notif-card-time">{item.time}</div>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {isUnread && <div className="notif-unread-dot" />}
                  <div style={{ color: '#aac4d8', marginTop: isUnread ? 0 : 4 }}>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="notif-expand-body">
                  {item.amount !== undefined && (
                    <div className="notif-expand-amount" style={{ color: item.color }}>
                      {item.amount > 0 ? '+' : ''}{Number(item.amount).toFixed(2)} USDT
                    </div>
                  )}
                  {item.detail && item.detail !== item.msg && (
                    <p className="notif-expand-detail">{item.detail}</p>
                  )}
                  {badge && (
                    <span className="notif-expand-badge" style={{ color: badge.color, background: badge.bg }}>
                      {badge.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
