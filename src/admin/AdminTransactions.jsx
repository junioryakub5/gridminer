import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, XCircle, Trash2, Search, AlertCircle, Loader2,
  X, User, CreditCard, Image, Award, Calendar, Clock,
  TrendingUp, Wallet, ExternalLink, Shield, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AdminLayout from './AdminLayout';
import { adminAPI } from '../services/api';

const TX_ICONS = { mining: '⛏', upgrades: '🏆', withdrawals: '💸', binding: '🔗' };

const PM_LABELS = {
  usdt:    { label: 'USDT (TRC20)',       icon: '🔵', color: '#26a17b' },
  naira:   { label: 'Naira (Bank)',        icon: '🟢', color: '#22c55e' },
  cedis:   { label: 'GHS (Mobile Money)', icon: '🟡', color: '#f59e0b' },
  unknown: { label: 'Unknown',             icon: '❓', color: '#8aabcc' },
};

/* ─── Review Modal ─────────────────────────────────────── */
function ReviewModal({ txId, onClose, onApprove, onReject }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    adminAPI.getTransactionDetail(txId)
      .then(setDetail)
      .catch(() => setError('Failed to load transaction details'))
      .finally(() => setLoading(false));
  }, [txId]);

  const handle = async (action) => {
    setActing(true);
    try {
      await action(txId);
      onClose();
    } catch (e) {
      setError(e.message || 'Action failed');
    } finally { setActing(false); }
  };

  const pm = PM_LABELS[detail?.paymentMethod] || PM_LABELS.unknown;
  const tierNum = detail?.tierTarget;
  const proofUrl = detail?.proofImage ? `/uploads/${detail.proofImage}` : null;

  return (
    <>
      {/* Backdrop */}
      <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 600 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 540,
        background: 'white', zIndex: 700, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        fontFamily: "'Inter', -apple-system, sans-serif",
        animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #f0f5ff',
          background: 'linear-gradient(135deg,#0c1e2e,#0f2d40)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,158,143,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color="#1a9e8f" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
                Review Upgrade Request
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                #{txId} · Pending manual approval
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
            width: 30, height: 30, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 12, color: '#8aabcc' }}>
              <Loader2 size={28} className="spin" color="#1a9e8f" />
              <span style={{ fontSize: 13 }}>Loading details…</span>
            </div>
          ) : error ? (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '16px', color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          ) : (
            <>
              {/* User Info */}
              <Section icon={<User size={15} color="#0d7ab5" />} title="User Information" color="#0d7ab510">
                <Row label="Name"          value={detail.userName || '—'} bold />
                <Row label="Email"         value={detail.userEmail || '—'} />
                <Row label="Current Tier"  value={`Tier ${detail.userCurrentTier ?? '—'}`} chip chipColor="#1a9e8f" />
                <Row label="Balance"       value={`$${(detail.userBalance ?? 0).toFixed(2)} USDT`} />
                <Row label="Account"       value={detail.userStatus === 'active' ? 'Active ✓' : 'Inactive ✗'}
                     chipColor={detail.userStatus === 'active' ? '#22c55e' : '#ef4444'} chip />
                {detail.userWallet && (
                  <Row label="Wallet" value={
                    <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                      {detail.userWallet}
                    </span>
                  } />
                )}
              </Section>

              {/* Upgrade or Withdrawal Details */}
              {detail.type === 'withdrawals' ? (
                <Section icon={<Wallet size={15} color="#ef4444" />} title="Withdrawal Details" color="#ef444410">
                  <Row label="Amount Requested" value={`$${parseFloat(detail.amount).toFixed(2)} USDT`} bold />
                  <Row label="Fee"              value="$1.00 USDT" />
                  <Row label="Net to Send"      value={detail.withdrawalNet != null ? `$${detail.withdrawalNet.toFixed(2)} USDT` : '—'} bold chip chipColor="#ef4444" />
                  <Row label="Destination"      value={
                    <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                      {detail.withdrawalAddress || detail.userWallet || '—'}
                    </span>
                  } />
                  <Row label="Submitted" value={detail.date || '—'} />
                </Section>
              ) : (
                <Section icon={<TrendingUp size={15} color="#1a9e8f" />} title="Upgrade Details" color="#1a9e8f10">
                  <Row label="Requested Tier" value={`Tier ${tierNum ?? '—'}`} bold chip chipColor="#f59e0b" />
                  <Row label="Mining Reward"  value={detail.tierEarn ? `$${detail.tierEarn}/24h` : '—'} />
                  <Row label="Mining Period"  value={detail.tierPeriod ? `${detail.tierPeriod} days` : '—'} />
                  <Row label="Submitted"      value={detail.date || '—'} />
                  <Row label="Label"          value={detail.label || '—'} />
                </Section>
              )}

              {/* Payment Details — only for upgrades */}
              {detail.type !== 'withdrawals' && (
                <Section icon={<CreditCard size={15} color={pm.color} />} title="Payment Details" color={pm.color + '10'}>
                  <Row label="Method" value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{pm.icon}</span>
                      <span style={{ fontWeight: 700 }}>{pm.label}</span>
                    </span>
                  } />
                  <Row label="USD Amount"  value={detail.tierPriceUsd  ? `$${detail.tierPriceUsd.toFixed(2)}`  : '—'} bold />
                  {detail.tierPriceNgn > 0 && <Row label="NGN Amount"  value={`₦${detail.tierPriceNgn.toLocaleString()}`} />}
                  {detail.tierPriceGhs > 0 && <Row label="GHS Amount"  value={`₵${detail.tierPriceGhs.toLocaleString()}`} />}
                </Section>
              )}

              {/* Payment Proof — only for upgrades */}
              {detail.type !== 'withdrawals' && (
              <Section icon={<Image size={15} color="#8b5cf6" />} title="Payment Proof Screenshot" color="#8b5cf610">
                {proofUrl ? (
                  <div>
                    <div
                      onClick={() => setImgOpen(true)}
                      style={{
                        borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in',
                        border: '2px solid #e0eaf2', position: 'relative',
                        background: '#f8fbff',
                      }}
                    >
                      <img
                        src={proofUrl}
                        alt="Payment proof"
                        style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, padding: 32, color: '#8aabcc' }}>
                        <Image size={28} />
                        <span style={{ fontSize: 12 }}>Image not found or still loading</span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ExternalLink size={10} /> Click to zoom
                      </div>
                    </div>
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#0d7ab5', fontWeight: 600 }}
                    >
                      <ExternalLink size={12} /> Open in new tab
                    </a>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#8aabcc', fontSize: 13 }}>
                    <Image size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <div>No proof screenshot uploaded</div>
                  </div>
                )}
              </Section>
              )}

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 12 }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — action buttons */}
        {!loading && !error && detail?.status === 'pending' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f5ff', display: 'flex', gap: 10, background: '#fafcff' }}>
            <button
              onClick={() => handle(onReject)}
              disabled={acting}
              style={{
                flex: 1, padding: '13px', borderRadius: 12,
                background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.2)',
                color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: acting ? 0.6 : 1, fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              {acting ? <Loader2 size={14} className="spin" /> : <XCircle size={15} />}
              Reject Request
            </button>
            <button
              onClick={() => handle(onApprove)}
              disabled={acting}
              style={{
                flex: 1, padding: '13px', borderRadius: 12,
                background: 'linear-gradient(135deg,#1a9e8f,#0d7ab5)',
                border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: acting ? 0.6 : 1, fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(26,158,143,0.35)',
                transition: 'transform 0.1s, opacity 0.15s',
              }}
            >
              {acting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={15} />}
              Approve & Upgrade
            </button>
          </div>
        )}

        {/* Already actioned footer */}
        {!loading && !error && detail?.status !== 'pending' && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f5ff', background: '#fafcff', textAlign: 'center' }}>
            <span className={`badge badge-${detail.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>
              {detail.status === 'completed' ? '✓ Approved' : '✗ Rejected'}
            </span>
          </div>
        )}
      </div>

      {/* Full-screen image overlay */}
      {imgOpen && proofUrl && (
        <div
          onClick={() => setImgOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 900,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img src={proofUrl} alt="Proof full" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }} />
          <button
            onClick={() => setImgOpen(false)}
            style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}

/* ─── Helper: Section block ─── */
function Section({ icon, title, children, color = '#f8fbff' }) {
  return (
    <div style={{ border: '1.5px solid #e8f0f7', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: color, borderBottom: '1px solid #e8f0f7' }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2a3a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{title}</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Helper: Info row ─── */
function Row({ label, value, bold, chip, chipColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid #f8fbff' }}>
      <span style={{ fontSize: 12, color: '#7aabcc', flexShrink: 0, marginRight: 8 }}>{label}</span>
      {chip ? (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, background: (chipColor || '#1a9e8f') + '15', color: chipColor || '#1a9e8f' }}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: '#1a2a3a', textAlign: 'right' }}>{value}</span>
      )}
    </div>
  );
}

/* ─── Main AdminTransactions page ─────────────────────────── */
export default function AdminTransactions() {
  const { allTransactions, adminApproveUpgrade, adminRejectUpgrade, adminDeleteTransaction, adminUpdateTransactionStatus, loadAdminTxs, stats, showToast } = useApp();
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [reviewId, setReviewId]         = useState(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    loadAdminTxs({}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Skip the very first run — the mount effect above handles it
    if (initialLoad.current) { initialLoad.current = false; return; }
    const t = setTimeout(() => {
      loadAdminTxs({ search, type: filterType !== 'all' ? filterType : '', status: filterStatus !== 'all' ? filterStatus : '' });
    }, 300);
    return () => clearTimeout(t);
  }, [search, filterType, filterStatus]);

  const pendingCount = stats?.pendingUpgrades || allTransactions.filter(t => t.type === 'upgrades' && t.status === 'pending').length;

  const handleDelete = async (tx) => {
    if (!window.confirm(`Delete transaction "${tx.label}"?`)) return;
    await adminDeleteTransaction(tx.id);
  };

  const handleApprove = async (id) => {
    await adminApproveUpgrade(id);
    await loadAdminTxs();
    showToast('✅ Upgrade approved successfully');
  };

  const handleReject = async (id) => {
    await adminRejectUpgrade(id);
    await loadAdminTxs();
    showToast('❌ Upgrade request rejected');
  };

  if (loading) return (
    <AdminLayout title="Transaction Management" breadcrumb="Admin › Transactions">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} className="spin" color="#1a9e8f" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Transaction Management" breadcrumb="Admin › Transactions">
      {/* Review modal */}
      {reviewId && (
        <ReviewModal
          txId={reviewId}
          onClose={() => setReviewId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {pendingCount > 0 && (
        <div className="admin-warn-banner" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#b45309" />
          <strong>{pendingCount} upgrade request{pendingCount > 1 ? 's' : ''}</strong>&nbsp;pending manual payment approval — click <strong>Review</strong> to view details.
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">⛏ All Transactions</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#7aabcc' }}>{allTransactions.length} records</span>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => loadAdminTxs()}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        <div className="admin-toolbar">
          <Search size={15} style={{ color: '#8aabcc', flexShrink: 0 }} />
          <input className="admin-search" placeholder="Search by label, user name, or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="admin-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="mining">Mining</option>
            <option value="upgrades">Upgrades</option>
            <option value="withdrawals">Withdrawals</option>
            <option value="binding">Binding</option>
          </select>
          <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Label</th>
                <th>Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#8aabcc' }}>No transactions match</td></tr>
              ) : allTransactions.map(tx => (
                <tr
                  key={tx.id}
                  style={{ background: tx.type === 'upgrades' && tx.status === 'pending' ? 'rgba(245,158,11,0.04)' : '' }}
                >
                  <td>
                    <div className="table-user-cell">
                      <div className="table-avatar">{(tx.userName || '?')[0]?.toUpperCase()}</div>
                      <div>
                        <div className="table-user-name">{tx.userName || 'Unknown'}</div>
                        <div className="table-user-email">{tx.userEmail || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{tx.label}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      {TX_ICONS[tx.type] || '💫'} {tx.type}
                    </span>
                  </td>
                  <td>
                    {tx.paymentMethod ? (
                      <span style={{ fontSize: 11, color: PM_LABELS[tx.paymentMethod]?.color || '#8aabcc', fontWeight: 600 }}>
                        {PM_LABELS[tx.paymentMethod]?.icon} {PM_LABELS[tx.paymentMethod]?.label || tx.paymentMethod}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#8aabcc' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, color: tx.type === 'withdrawals' ? '#ef4444' : '#1a9e8f' }}>
                    {tx.type === 'withdrawals' ? '-' : '+'}${tx.amount.toFixed(2)}
                  </td>
                  <td style={{ fontSize: 12, color: '#7aabcc' }}>{tx.date}</td>
                  <td><span className={`badge badge-${tx.status}`}>{tx.status}</span></td>
                  <td>
                    <div className="action-btns">
                      {(tx.type === 'upgrades' || tx.type === 'withdrawals') && (
                        <button
                          className="act-btn"
                          style={{
                            background: tx.status === 'pending'
                              ? tx.type === 'withdrawals'
                                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                                : 'linear-gradient(135deg,#f59e0b,#d97706)'
                              : '#f0f7ff',
                            color: tx.status === 'pending' ? 'white' : '#0d6e99',
                            fontWeight: 700,
                          }}
                          onClick={() => setReviewId(tx.id)}
                        >
                          <Shield size={11} />
                          {tx.status === 'pending' ? 'Review' : 'Details'}
                        </button>
                      )}
                      {tx.type !== 'upgrades' && tx.type !== 'withdrawals' && tx.status !== 'pending' && (
                        <select
                          className="admin-select"
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                          value={tx.status}
                          onChange={e => { adminUpdateTransactionStatus(tx.id, e.target.value); showToast('Status updated'); }}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                        </select>
                      )}
                      <button className="act-btn act-delete" onClick={() => handleDelete(tx)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
