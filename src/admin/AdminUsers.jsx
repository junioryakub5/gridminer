import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Power, RotateCcw, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AdminLayout from './AdminLayout';

export default function AdminUsers() {
  const { allUsers, adminUpdateUser, adminDeleteUser, adminToggleUserStatus, adminResetBalance, loadAdminUsers, showToast } = useApp();
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier]     = useState('all');
  const [loading, setLoading]       = useState(!allUsers.length);
  const [editUser, setEditUser]     = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    loadAdminUsers().finally(() => setLoading(false));
  }, []);

  const filtered = allUsers.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole   === 'all' || u.role   === filterRole;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    const matchTier   = filterTier   === 'all' || String(u.tier) === filterTier;
    return matchSearch && matchRole && matchStatus && matchTier;
  });

  const openEdit = (user) => { setEditUser(user); setForm({ name: user.name, email: user.email, tier: user.tier, balance: user.balance, walletAddress: user.walletAddress || '' }); };
  const closeEdit = () => { setEditUser(null); setForm({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await adminUpdateUser(editUser.id, { name: form.name, email: form.email, tier: Number(form.tier), balance: Number(form.balance), walletAddress: form.walletAddress });
      closeEdit();
    } catch (err) { showToast(err.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"? This also removes their transactions.`)) return;
    await adminDeleteUser(u.id);
  };

  if (loading) return (
    <AdminLayout title="User Management" breadcrumb="Admin › Users">
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Loader2 size={32} className="spin" color="#1a9e8f" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="User Management" breadcrumb="Admin › Users">
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title"><span>👥</span> All Users</span>
          <span style={{ fontSize:12, color:'#7aabcc' }}>{filtered.length} of {allUsers.length} users</span>
        </div>
        <div className="admin-toolbar">
          <Search size={15} style={{ color:'#8aabcc', flexShrink:0 }} />
          <input className="admin-search" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="admin-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option><option value="user">User</option><option value="admin">Admin</option>
          </select>
          <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <select className="admin-select" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
            <option value="all">All Tiers</option>
            {[1,2,3,4,5].map(t => <option key={t} value={t}>Tier {t}</option>)}
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>User</th><th>Tier</th><th>Balance</th><th>Wallet</th><th>Joined</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#8aabcc' }}>No users match</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="table-user-cell">
                      <div className="table-avatar">{u.name[0]?.toUpperCase()}</div>
                      <div><div className="table-user-name">{u.name}</div><div className="table-user-email">{u.email}</div></div>
                    </div>
                  </td>
                  <td><span className="badge badge-tier">Tier {u.tier}</span></td>
                  <td><span style={{ fontWeight:700, color:'#1a9e8f' }}>${u.balance.toFixed(2)}</span></td>
                  <td><span style={{ fontSize:11, color: u.walletAddress ? '#1a2a3a' : '#8aabcc', fontFamily:'monospace' }}>{u.walletAddress ? u.walletAddress.slice(0,12)+'…' : 'Not set'}</span></td>
                  <td style={{ fontSize:12, color:'#7aabcc' }}>{u.joined}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="act-btn act-edit"       onClick={() => openEdit(u)}><Edit2 size={11} /> Edit</button>
                      <button className="act-btn act-deactivate" onClick={() => adminToggleUserStatus(u.id)}><Power size={11} /> {u.status==='active'?'Deactivate':'Activate'}</button>
                      <button className="act-btn act-reset"      onClick={() => adminResetBalance(u.id)}><RotateCcw size={11} /> Reset $</button>
                      {u.role !== 'admin' && <button className="act-btn act-delete" onClick={() => handleDelete(u)}><Trash2 size={11} /> Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editUser && (
        <div className="admin-modal-overlay" onClick={closeEdit}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Edit User — {editUser.name}</span>
              <button className="admin-modal-close" onClick={closeEdit}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-field-row">
                <div className="admin-form-group"><label className="admin-form-label">Full Name</label><input className="admin-field" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
                <div className="admin-form-group"><label className="admin-form-label">Email</label><input className="admin-field" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} /></div>
              </div>
              <div className="admin-field-row">
                <div className="admin-form-group"><label className="admin-form-label">Tier</label><select className="admin-field" value={form.tier} onChange={e => setForm(p=>({...p,tier:e.target.value}))}>{[1,2,3,4,5].map(t=><option key={t} value={t}>Tier {t}</option>)}</select></div>
                <div className="admin-form-group"><label className="admin-form-label">Balance (USDT)</label><input className="admin-field" type="number" step="0.01" value={form.balance} onChange={e => setForm(p=>({...p,balance:e.target.value}))} /></div>
              </div>
              <div className="admin-form-group"><label className="admin-form-label">TRC20 Wallet Address</label><input className="admin-field" value={form.walletAddress} onChange={e => setForm(p=>({...p,walletAddress:e.target.value}))} placeholder="Not set" /></div>
              <div className="admin-info-banner">ℹ️ Changing tier here immediately updates the user. Use Transactions page to also approve payment.</div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={closeEdit}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 size={13} className="spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
