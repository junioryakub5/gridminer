import { useEffect, useState } from 'react';
import { Users, Wallet, Clock, TrendingUp, BarChart3, ArrowDownCircle, AlertCircle, Loader2, Pickaxe, Award, Link2, Zap, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AdminLayout from './AdminLayout';

const StatCard = ({ icon: Icon, label, value, color, sub, onClick }) => (
  <div className="admin-stat-card" style={{ '--card-color': color + '18', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <div className="asc-icon" style={{ background: color + '18' }}><Icon size={20} color={color} /></div>
    <div className="asc-val">{value}</div>
    <div className="asc-label">{label}</div>
    {sub && <div style={{ fontSize: 11, color: '#8aabcc', marginTop: 4 }}>{sub}</div>}
  </div>
);

export default function AdminDashboard() {
  const { stats, allTransactions, allUsers, loadAdminStats, loadAdminUsers, loadAdminTxs } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!stats);

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadAdminStats(), loadAdminUsers(), loadAdminTxs()]);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const pendingUpgrades = allTransactions.filter(t => t.type === 'upgrades' && t.status === 'pending');
  const recent = [...allTransactions].slice(0, 8);
  const getUserName = (userId) => allUsers.find(u => u.id === userId)?.name || 'Unknown';
  const TX_ICON_MAP = { mining: Pickaxe, upgrades: Award, withdrawals: ArrowDownCircle, binding: Link2 };

  if (loading) return (
    <AdminLayout title="Dashboard" breadcrumb="Admin › Dashboard">
      <div style={{ display:'flex', justifyContent:'center', padding: 60 }}><Loader2 size={32} className="spin" color="#1a9e8f" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Dashboard" breadcrumb="Admin › Dashboard">
      {pendingUpgrades.length > 0 && (
        <div className="admin-warn-banner" style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => navigate('/admin/transactions')}>
          <AlertCircle size={16} color="#b45309" />
          <span><strong>{pendingUpgrades.length} pending upgrade request{pendingUpgrades.length > 1 ? 's' : ''}</strong> awaiting review. Click to manage.</span>
        </div>
      )}

      <div className="admin-stats-grid">
        <StatCard icon={Users}           label="Total Users"        value={stats?.totalUsers ?? 0}                              color="#0d7ab5"  sub={`${stats?.activeUsers ?? 0} active`}  onClick={() => navigate('/admin/users')} />
        <StatCard icon={Wallet}          label="Total Balance"      value={`$${(stats?.totalBalance ?? 0).toFixed(2)}`}          color="#1a9e8f"  sub="USDT held by users" />
        <StatCard icon={Clock}           label="Pending Upgrades"   value={stats?.pendingUpgrades ?? 0}                          color="#f59e0b"  sub="Awaiting approval" onClick={() => navigate('/admin/transactions')} />
        <StatCard icon={TrendingUp}      label="Mining Paid Out"    value={`$${(stats?.totalMiningPaid ?? 0).toFixed(2)}`}       color="#22c55e"  sub="USDT in rewards" />
        <StatCard icon={ArrowDownCircle} label="Withdrawals"        value={`$${(stats?.totalWithdrawals ?? 0).toFixed(2)}`}      color="#8b5cf6"  sub="USDT withdrawn" />
        <StatCard icon={BarChart3}       label="Total Transactions" value={stats?.totalTransactions ?? 0}                        color="#ef4444"  sub="All time" />
      </div>

      <div className="admin-dashboard-grid">
        {/* Recent Transactions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}><Pickaxe size={15} /> Recent Transactions</span>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/admin/transactions')}>View All</button>
          </div>
          {recent.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon"><Inbox size={32} color="#8aabcc" /></div><p>No transactions yet</p></div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>User</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontSize:12 }}>{tx.userName || getUserName(tx.userId)}</td>
                    <td><span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>{(() => { const I = TX_ICON_MAP[tx.type] || Zap; return <I size={12} />; })()} {tx.type}</span></td>
                    <td style={{ fontWeight:600, fontSize:12, color: tx.type==='withdrawals' ? '#ef4444' : '#22c55e' }}>
                      {tx.type==='withdrawals' ? '-' : '+'}${tx.amount.toFixed(2)}
                    </td>
                    <td><span className={`badge badge-${tx.status}`}>{tx.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Users by Tier */}
        <div className="admin-card">
          <div className="admin-card-header">
            <span className="admin-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}><Users size={15} /> Users by Tier</span>
            <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/admin/users')}>Manage</button>
          </div>
          <div style={{ padding:'16px 22px' }}>
            {[1,2,3,4,5].map(tier => {
              const count = allUsers.filter(u => u.role !== 'admin' && u.tier === tier).length;
              const total = stats?.totalUsers || 1;
              const pct   = Math.round((count / total) * 100);
              return (
                <div key={tier} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#1a2a3a' }}>Tier {tier}</span>
                    <span style={{ fontSize:12, color:'#7aabcc' }}>{count} users ({pct}%)</span>
                  </div>
                  <div style={{ height:6, background:'#f0f5ff', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#1a9e8f,#0d7ab5)', borderRadius:3 }} />
                  </div>
                </div>
              );
            })}
          </div>
          {pendingUpgrades.length > 0 && (
            <>
              <div style={{ padding:'0 22px 8px', fontSize:12, fontWeight:700, color:'#b45309', display:'flex', alignItems:'center', gap:5 }}><Clock size={12} /> Pending Approvals</div>
              {pendingUpgrades.slice(0,3).map(tx => (
                <div key={tx.id} style={{ padding:'10px 22px', borderTop:'1px solid #f0f5ff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{tx.userName || getUserName(tx.userId)}</div>
                    <div style={{ fontSize:11, color:'#7aabcc' }}>{tx.label} · {tx.date}</div>
                  </div>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => navigate('/admin/transactions')}>Review</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
