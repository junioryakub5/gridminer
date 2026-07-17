import { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AdminLayout from './AdminLayout';

const TIER_COLORS = ['#7aabcc','#1a9e8f','#0d7ab5','#f59e0b','#8b5cf6'];

export default function AdminTiers() {
  const { tiers, adminUpdateTier, loadAdminTiers, allUsers, showToast } = useApp();
  const [editingTier, setEditingTier] = useState(null);
  const [form, setForm]   = useState({});
  const [loading, setLoading] = useState(!tiers.length);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { loadAdminTiers().finally(() => setLoading(false)); }, []);

  const openEdit = (tier) => { setEditingTier(tier.tier); setForm({ ...tier }); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await adminUpdateTier(editingTier, { period: Number(form.period), earnPer24h: Number(form.earnPer24h), priceUSD: Number(form.priceUSD), priceNGN: Number(form.priceNGN), priceGHS: Number(form.priceGHS) });
      setEditingTier(null);
    } catch (err) { showToast(err.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout title="Mining Tier Plans" breadcrumb="Admin › Mining Tiers">
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Loader2 size={32} className="spin" color="#1a9e8f" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Mining Tier Plans" breadcrumb="Admin › Mining Tiers">
      <div className="admin-info-banner">ℹ️ Changes to tier earnings and prices are immediately reflected in the user-facing upgrade page. Changes are persisted to the database.</div>
      <div className="admin-tiers-grid">
        {tiers.map((tier, i) => {
          const userCount = allUsers.filter(u => u.role !== 'admin' && u.tier === tier.tier).length;
          const isEditing = editingTier === tier.tier;
          return (
            <div key={tier.tier} className="admin-tier-card">
              <div className="atc-header">
                <span className="atc-name" style={{ color: TIER_COLORS[i] }}>Tier {tier.tier}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#8aabcc' }}>{userCount} users</span>
                  {!isEditing && <button style={{ background:'transparent', border:'none', color:'#0d6e99', cursor:'pointer' }} onClick={() => openEdit(tier)}><Edit2 size={14}/></button>}
                </div>
              </div>
              {isEditing ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[['Period (days)','period'],['Earn/24h (USDT)','earnPer24h'],['Price USD','priceUSD'],['Price NGN (₦)','priceNGN'],['Price GHS (₵)','priceGHS']].map(([label, key]) => (
                    <div key={key} className="admin-form-group" style={{ marginBottom:0 }}>
                      <label className="admin-form-label">{label}</label>
                      <input className="admin-field" type="number" step="0.01" value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} disabled={tier.tier===1 && key !== 'period' && key !== 'earnPer24h'} />
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:8, marginTop:6 }}>
                    <button className="admin-btn admin-btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 size={13} className="spin"/> : <><Save size={13}/> Save</>}
                    </button>
                    <button className="admin-btn admin-btn-secondary" onClick={() => setEditingTier(null)}><X size={13}/></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="atc-row"><span className="atc-key">Period</span>      <span className="atc-val">{tier.period} days</span></div>
                  <div className="atc-row"><span className="atc-key">Earn/24h</span>   <span className="atc-val teal">${tier.earnPer24h.toFixed(2)} USDT</span></div>
                  <div className="atc-row"><span className="atc-key">Price USD</span>  <span className="atc-val">{tier.priceUSD === 0 ? 'Free' : `$${tier.priceUSD}`}</span></div>
                  <div className="atc-row"><span className="atc-key">Price NGN</span>  <span className="atc-val">{tier.priceNGN === 0 ? '—' : `₦${tier.priceNGN.toLocaleString()}`}</span></div>
                  <div className="atc-row"><span className="atc-key">Price GHS</span>  <span className="atc-val">{tier.priceGHS === 0 ? '—' : `₵${tier.priceGHS.toLocaleString()}`}</span></div>
                  <button className="atc-edit-btn" onClick={() => openEdit(tier)}>Edit Tier {tier.tier}</button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
