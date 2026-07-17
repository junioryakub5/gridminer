import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, TrendingUp, ArrowDownToLine, CheckCircle,
  BellRing, CheckCheck, Info, Link2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

/* Map transaction types to icon + color */
const TYPE_META = {
  mining:      { Icon: Zap,             color: '#1a9e8f', bg: 'rgba(26,158,143,0.12)',  title: 'Mining Complete'   },
  upgrades:    { Icon: TrendingUp,      color: '#d97706', bg: 'rgba(245,158,11,0.12)',  title: 'Account Upgraded'  },
  withdrawals: { Icon: ArrowDownToLine, color: '#7c3aed', bg: 'rgba(139,92,246,0.12)', title: 'Withdrawal'        },
  binding:     { Icon: Link2,           color: '#0d6e99', bg: 'rgba(13,110,160,0.12)', title: 'Wallet Bound'      },
};

const SYSTEM_NOTIF = {
  Icon: BellRing, color: '#0d6e99', bg: 'rgba(13,110,160,0.10)', title: 'Welcome!',
  msg: 'Welcome to Cloud Mining 2.0! Your account is now active.',
};

export default function Notifications() {
  const navigate = useNavigate();
  const { transactions, user } = useApp();
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read') || '[]')); }
    catch { return new Set(); }
  });

  // Build notification list from transactions + a welcome system notif
  const items = [
    // Welcome (always first, id: 'welcome')
    {
      id: 'welcome',
      Icon: SYSTEM_NOTIF.Icon, color: SYSTEM_NOTIF.color, bg: SYSTEM_NOTIF.bg,
      title: SYSTEM_NOTIF.title,
      msg: `Welcome to Cloud Mining 2.0, ${user?.name?.split(' ')[0] || 'Miner'}! Your account is active.`,
      time: user?.joined || 'Jul 2026',
    },
    // One notif per transaction (newest first)
    ...[...transactions].reverse().map(tx => {
      const meta = TYPE_META[tx.type] || TYPE_META.mining;
      return {
        id: `tx-${tx.id}`,
        Icon: meta.Icon, color: meta.color, bg: meta.bg,
        title: meta.title,
        msg: tx.label,
        time: tx.date,
        status: tx.status,
      };
    }),
  ];

  const markAllRead = () => {
    const all = new Set(items.map(i => i.id));
    setReadIds(all);
    localStorage.setItem('notif_read', JSON.stringify([...all]));
  };

  const markRead = (id) => {
    const next = new Set(readIds).add(id);
    setReadIds(next);
    localStorage.setItem('notif_read', JSON.stringify([...next]));
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
          const isUnread = !readIds.has(item.id);
          return (
            <div
              key={item.id}
              className={`notif-card${isUnread ? ' notif-card-unread' : ''}`}
              onClick={() => markRead(item.id)}
            >
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

              {/* Unread dot */}
              {isUnread && <div className="notif-unread-dot" />}
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
