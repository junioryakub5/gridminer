import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, XCircle, Trash2, Search, AlertCircle, Loader2,
  X, User, CreditCard, Image, Award, Calendar, Clock,
  TrendingUp, Wallet, ExternalLink, Shield, RefreshCw,
  Pickaxe, Link2, ArrowDownCircle, Zap, ListOrdered, Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getApiBase } from '../services/api';
import AdminLayout from './AdminLayout';
import { adminAPI } from '../services/api';

const TX_ICON_MAP = { mining: Pickaxe, upgrades: Award, withdrawals: ArrowDownCircle, binding: Link2 };

const PM_LABELS = {
  usdt:    { label: 'USDT (TRC20)',       color: '#26a17b' },
  naira:   { label: 'Naira (Bank)',        color: '#22c55e' },
  cedis:   { label: 'GHS (Mobile Money)', color: '#f59e0b' },
  unknown: { label: 'Unknown',             color: '#8aabcc' },
};

/* ─── Review Drawer ────────────────────────────────────── */
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
    try { await action(txId); onClose(); }
    catch (e) { setError(e.message || 'Action failed'); }
    finally { setActing(false); }
  };

  const pm      = PM_LABELS[detail?.paymentMethod] || PM_LABELS.unknown;
  const tierNum = detail?.tierTarget;
  const proofUrl = detail?.proofImage ? `${getApiBase()}/uploads/${detail.proofImage}` : null;
  const initials = (detail?.userName || '?')[0]?.toUpperCase();
  const isPending   = detail?.status === 'pending';
  const isWithdraw  = detail?.type === 'withdrawals';

  /* status colour */
  const statusMeta = {
    pending:   { bg: 'rgba(245,158,11,0.10)',  color: '#b45309',  label: 'Pending Review' },
    completed: { bg: 'rgba(34,197,94,0.10)',   color: '#16a34a',  label: 'Approved' },
    failed:    { bg: 'rgba(239,68,68,0.10)',   color: '#dc2626',  label: 'Rejected' },
  }[detail?.status] || { bg: '#f0f5ff', color: '#8aabcc', label: detail?.status };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(10,20,35,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer */}
      <div className="admin-review-panel" style={{ display: 'flex', flexDirection: 'column', background: '#f4f8fc' }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 20px', height: 56, flexShrink: 0,
          background: '#0c1e2e',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(26,158,143,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {isWithdraw ? <Wallet size={15} color="#1a9e8f" /> : <Award size={15} color="#1a9e8f" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {isWithdraw ? 'Withdrawal Request' : 'Upgrade Request'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
              ID #{txId}
            </div>
          </div>
          {/* Status pill */}
          {detail && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50,
              background: statusMeta.bg, color: statusMeta.color, whiteSpace: 'nowrap',
            }}>
              {statusMeta.label}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7,
              width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 12, color: '#8aabcc', minHeight: 200 }}>
              <Loader2 size={26} className="spin" color="#1a9e8f" />
              <span style={{ fontSize: 12, fontWeight: 500 }}>Loading details…</span>
            </div>

          ) : error ? (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: 16, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>

          ) : (
            <>
              {/* ── User card ── */}
              <div style={{
                background: 'white', borderRadius: 14,
                border: '1px solid #e4edf6',
                boxShadow: '0 1px 6px rgba(0,40,80,0.06)',
                overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg,#0d7ab510,#1a9e8f08)',
                  borderBottom: '1px solid #e8f0f7',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#1a9e8f,#0d7ab5)',
                    color: 'white', fontSize: 16, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(26,158,143,0.35)',
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {detail.userName || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#7aabcc', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {detail.userEmail || '—'}
                    </div>
                  </div>
                  {/* Status chip */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 50, flexShrink: 0,
                    background: detail.userStatus === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                    color: detail.userStatus === 'active' ? '#16a34a' : '#dc2626',
                  }}>
                    {detail.userStatus === 'active' ? '● Active' : '● Inactive'}
                  </span>
                </div>

                {/* Stat pills */}
                <div style={{ display: 'flex', padding: '10px 16px', gap: 8 }}>
                  {[
                    { label: 'Tier', value: `Tier ${detail.userCurrentTier ?? '—'}`, color: '#1a9e8f' },
                    { label: 'Balance', value: `$${(detail.userBalance ?? 0).toFixed(2)}`, color: '#0d7ab5' },
                  ].map(p => (
                    <div key={p.label} style={{
                      flex: 1, background: '#f4f8fc', border: '1px solid #e0eaf2',
                      borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: '#9ab8cc', fontWeight: 500, marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.value}</div>
                    </div>
                  ))}
                  {detail.userWallet && (
                    <div style={{
                      flex: 2, background: '#f4f8fc', border: '1px solid #e0eaf2',
                      borderRadius: 10, padding: '8px 10px',
                    }}>
                      <div style={{ fontSize: 10, color: '#9ab8cc', fontWeight: 500, marginBottom: 2 }}>Wallet</div>
                      <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#4a7a9b', wordBreak: 'break-all', lineHeight: 1.4 }}>
                        {detail.userWallet}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Transaction details card ── */}
              <InfoCard
                icon={isWithdraw ? <Wallet size={13} color="#ef4444" /> : <TrendingUp size={13} color="#1a9e8f" />}
                title={isWithdraw ? 'Withdrawal Details' : 'Upgrade Details'}
                accentColor={isWithdraw ? '#ef4444' : '#1a9e8f'}
                rows={isWithdraw ? [
                  { label: 'Amount',      value: `$${parseFloat(detail.amount).toFixed(2)} USD`, highlight: true },
                  { label: 'Fee',         value: '$0.00 (0%)' },
                  { label: 'Net Payout',  value: `$${parseFloat(detail.amount).toFixed(2)} USD`, chip: true, chipColor: '#ef4444' },
                  { label: 'Destination', value: detail.withdrawalLabel || detail.withdrawalAddress || detail.userWallet || '—', mono: true },
                  { label: 'Submitted',   value: detail.date || '—', muted: true },
                ] : [
                  { label: 'Target Tier',    value: `Tier ${tierNum ?? '—'}`, chip: true, chipColor: '#f59e0b' },
                  { label: 'Mining Reward',  value: detail.tierEarn ? `$${detail.tierEarn}/24 h` : '—', highlight: true },
                  { label: 'Mining Period',  value: detail.tierPeriod ? `${detail.tierPeriod} days` : '—' },
                  { label: 'Label',          value: detail.label || '—', muted: true },
                  { label: 'Submitted',      value: detail.date || '—', muted: true },
                ]}
              />

              {/* ── Payment details card ── */}
              {!isWithdraw && (
                <InfoCard
                  icon={<CreditCard size={13} color={pm.color} />}
                  title="Payment Details"
                  accentColor={pm.color}
                  rows={[
                    { label: 'Method',     value: pm.label, chip: true, chipColor: pm.color },
                    { label: 'USD Amount', value: detail.tierPriceUsd ? `$${detail.tierPriceUsd.toFixed(2)}` : '—', highlight: true },
                    ...(detail.tierPriceNgn > 0 ? [{ label: 'NGN Amount', value: `₦${detail.tierPriceNgn.toLocaleString()}` }] : []),
                    ...(detail.tierPriceGhs > 0 ? [{ label: 'GHS Amount', value: `₵${detail.tierPriceGhs.toLocaleString()}` }] : []),
                  ]}
                />
              )}

              {/* ── Payment proof card ── */}
              {!isWithdraw && (
                <div style={{
                  background: 'white', borderRadius: 14,
                  border: '1px solid #e4edf6',
                  boxShadow: '0 1px 6px rgba(0,40,80,0.06)',
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    borderBottom: '1px solid #edf2f8',
                    background: 'rgba(139,92,246,0.04)',
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image size={12} color="#8b5cf6" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2a3a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Payment Proof
                    </span>
                  </div>

                  {/* Image area */}
                  <div style={{ padding: 14 }}>
                    {proofUrl ? (
                      <>
                        <div
                          onClick={() => setImgOpen(true)}
                          style={{
                            borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in',
                            border: '1.5px solid #e0eaf2', position: 'relative',
                            background: '#f8fbff',
                          }}
                        >
                          <img
                            src={proofUrl}
                            alt="Payment proof"
                            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                          <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, padding: 32, color: '#8aabcc' }}>
                            <Image size={24} />
                            <span style={{ fontSize: 12 }}>Image not found</span>
                          </div>
                          {/* Zoom badge */}
                          <div style={{
                            position: 'absolute', bottom: 8, right: 8,
                            background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(4px)',
                            borderRadius: 6, padding: '3px 8px',
                            fontSize: 10, color: 'white',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <ExternalLink size={9} /> Zoom
                          </div>
                        </div>
                        <a
                          href={proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            marginTop: 9, fontSize: 11, color: '#0d7ab5', fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={11} /> Open in new tab
                        </a>
                      </>
                    ) : (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 8, padding: '28px 0', color: '#b0c8de',
                      }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f5fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Image size={20} />
                        </div>
                        <span style={{ fontSize: 12, color: '#8aabcc' }}>No screenshot uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inline error */}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 12 }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Action footer ── */}
        {!loading && detail && (
          isPending ? (
            <div style={{
              display: 'flex', gap: 10, padding: '14px 20px',
              borderTop: '1px solid #e4edf6',
              background: 'white',
              flexShrink: 0,
            }}>
              <button
                onClick={() => handle(onReject)}
                disabled={acting}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  background: 'transparent',
                  border: '1.5px solid rgba(239,68,68,0.25)',
                  color: '#dc2626', fontSize: 13, fontWeight: 700,
                  cursor: acting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: acting ? 0.55 : 1, fontFamily: 'inherit',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (!acting) e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {acting ? <Loader2 size={13} className="spin" /> : <XCircle size={14} />}
                Reject
              </button>
              <button
                onClick={() => handle(onApprove)}
                disabled={acting}
                style={{
                  flex: 2, padding: '11px 0', borderRadius: 10,
                  background: 'linear-gradient(135deg,#1a9e8f,#0d7ab5)',
                  border: 'none', color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: acting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: acting ? 0.55 : 1, fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(26,158,143,0.32)',
                  transition: 'transform 0.12s, opacity 0.15s',
                }}
                onMouseEnter={e => { if (!acting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {acting ? <Loader2 size={13} className="spin" /> : <CheckCircle size={14} />}
                Approve & Upgrade
              </button>
            </div>
          ) : (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #e4edf6',
              background: 'white', textAlign: 'center', flexShrink: 0,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 50,
                background: statusMeta.bg, color: statusMeta.color,
              }}>
                {detail.status === 'completed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {statusMeta.label}
              </span>
            </div>
          )
        )}
      </div>

      {/* Full-screen image lightbox */}
      {imgOpen && proofUrl && (
        <div
          onClick={() => setImgOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 900,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={proofUrl}
            alt="Proof"
            style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
          />
          <button
            onClick={() => setImgOpen(false)}
            style={{
              position: 'fixed', top: 18, right: 18,
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%',
              width: 38, height: 38, cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

/* ─── InfoCard: grouped detail rows ─── */
function InfoCard({ icon, title, accentColor = '#1a9e8f', rows = [] }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: '1px solid #e4edf6',
      boxShadow: '0 1px 6px rgba(0,40,80,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid #edf2f8',
        background: accentColor + '08',
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2a3a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
      </div>

      {/* Rows */}
      <div>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px',
              borderBottom: i < rows.length - 1 ? '1px solid #f4f8fc' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: '#9ab8cc', flexShrink: 0, marginRight: 8, fontWeight: 500 }}>
              {row.label}
            </span>
            {row.chip ? (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50,
                background: (row.chipColor || accentColor) + '15',
                color: row.chipColor || accentColor,
              }}>
                {row.value}
              </span>
            ) : row.mono ? (
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4a7a9b', textAlign: 'right', wordBreak: 'break-all', maxWidth: '65%' }}>
                {row.value}
              </span>
            ) : (
              <span style={{
                fontSize: 12, fontWeight: row.highlight ? 700 : row.muted ? 400 : 600,
                color: row.muted ? '#9ab8cc' : '#1a2a3a',
                textAlign: 'right',
              }}>
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>
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
  };

  const handleReject = async (id) => {
    await adminRejectUpgrade(id);
    await loadAdminTxs();
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
          <span className="admin-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}><ListOrdered size={15} /> All Transactions</span>
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
                  <td><span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>{(() => { const I = TX_ICON_MAP[tx.type] || Zap; return <I size={12} />; })()} {tx.type}</span></td>
                  <td>
                    {tx.paymentMethod ? (
                      <span style={{ fontSize: 11, color: PM_LABELS[tx.paymentMethod]?.color || '#8aabcc', fontWeight: 600, display:'flex', alignItems:'center', gap:4 }}>
                        <CreditCard size={10} /> {PM_LABELS[tx.paymentMethod]?.label || tx.paymentMethod}
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
                      {/* Upgrades & withdrawals → Review / Details button */}
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
                      {/* Mining, binding, etc. → status dropdown (always shown) */}
                      {tx.type !== 'upgrades' && tx.type !== 'withdrawals' && (
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
