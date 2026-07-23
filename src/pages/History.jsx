import { useState } from 'react';
import { Search, Inbox, Zap, TrendingUp, ArrowDownToLine, Link2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

const TABS = [
  { key: 'all',         label: 'All' },
  { key: 'mining',      label: 'Mining' },
  { key: 'upgrades',    label: 'Upgrades' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'binding',     label: 'Wallet Binding' },
];

// Coloured background + Lucide icon per transaction type
const ICON_BG = {
  mining:      'rgba(26,158,143,0.14)',
  upgrades:    'rgba(245,158,11,0.14)',
  withdrawals: 'rgba(139,92,246,0.14)',
  binding:     'rgba(13,110,160,0.14)',
};
const ICON_COLOR = {
  mining:      '#1a9e8f',
  upgrades:    '#d97706',
  withdrawals: '#7c3aed',
  binding:     '#0d6e99',
};
const ICON_COMPONENT = {
  mining:      Zap,
  upgrades:    TrendingUp,
  withdrawals: ArrowDownToLine,
  binding:     Link2,
};

export default function History() {
  const [active, setActive] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { transactions } = useApp();

  const filtered = transactions.filter(t => {
    if (active !== 'all' && t.type !== active) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const labelMatch = t.label?.toLowerCase().includes(s);
      const typeMatch = t.type?.toLowerCase().includes(s);
      const statusMatch = t.status?.toLowerCase().includes(s);
      return labelMatch || typeMatch || statusMatch;
    }
    return true;
  });

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 14px 6px' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0d6e99' }}>
            Transaction <span style={{ color: '#1a9e8f' }}>History</span>
          </h2>
          <p style={{ fontSize: 12, color: '#8aabcc', marginTop: 2 }}>Track all your activities</p>
        </div>
        <button className="icon-btn" style={{ marginTop: 4 }} onClick={() => setShowSearch(!showSearch)}><Search size={18} /></button>
      </div>

      {showSearch && (
        <div style={{ padding: '0 14px 10px' }}>
          <input 
            type="text" 
            placeholder="Search history..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field"
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="history-tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`tab-btn ${active === key ? 'active' : ''}`}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="tx-list">
        {filtered.length === 0 ? (
          <div className="tx-empty">
            <Inbox size={44} color="#c0d8e8" style={{ marginBottom: 12 }} />
            <p>No transactions found</p>
          </div>
        ) : filtered.map(tx => {
          const TxIcon = ICON_COMPONENT[tx.type] || Zap;
          return (
            <div key={tx.id} className="tx-item">
              <div className="tx-icon" style={{ background: ICON_BG[tx.type] || 'rgba(0,0,0,0.07)' }}>
                <TxIcon size={16} color={ICON_COLOR[tx.type] || '#1a2a3a'} strokeWidth={2.2} />
              </div>
              <div className="tx-meta">
                <div className="tx-label">{tx.label}</div>
                <div className="tx-date">{tx.date}</div>
              </div>
              <div className="tx-right">
                <span className={`tx-amount ${tx.type === 'withdrawals' ? 'tx-amount-neg' : 'tx-amount-pos'}`}>
                  {tx.type === 'withdrawals' ? '-' : '+'}{tx.amount?.toFixed(2)} USDT
                </span>
                <span className={`tx-status tx-status-${tx.status}`}>
                  {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
