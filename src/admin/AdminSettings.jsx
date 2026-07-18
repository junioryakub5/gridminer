import { useState, useEffect } from 'react';
import { Save, Copy, Loader2, Info, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AdminLayout from './AdminLayout';

export default function AdminSettings() {
  const { settings, adminUpdateSettings, loadAdminSettings, showToast } = useApp();
  const [form, setForm]   = useState(settings || { usdtWallet:'', nairaBank:{name:'',account:'',number:''}, cedisBank:{name:'',account:'',number:''} });
  const [loading, setLoading] = useState(!settings);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!settings) loadAdminSettings().then(s => setForm(s)).finally(() => setLoading(false));
    else { setForm(settings); setLoading(false); }
  }, []);

  const copy = (text) => navigator.clipboard.writeText(text).then(() => showToast('Copied!'));

  const save = async () => {
    setSaving(true);
    try { await adminUpdateSettings(form); }
    catch (err) { showToast(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout title="Payment Channel Settings" breadcrumb="Admin › Payment Setup">
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Loader2 size={32} className="spin" color="#1a9e8f" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Payment Channel Settings" breadcrumb="Admin › Payment Setup">
      <div className="admin-info-banner" style={{ display:'flex', alignItems:'center', gap:8 }}><Info size={14} /> These details are shown to users when upgrading their tier. Changes take effect immediately and are persisted to the database.</div>
      <div className="admin-settings-grid">
        {/* USDT */}
        <div className="admin-card" style={{ overflow:'visible' }}>
          <div className="admin-card-header"><span className="admin-card-title">₮ USDT TRC20 Wallet</span></div>
          <div style={{ padding:'20px 22px' }}>
            <div className="admin-form-group">
              <label className="admin-form-label">TRC20 Wallet Address</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="admin-field" value={form.usdtWallet} onChange={e => setForm(p=>({...p,usdtWallet:e.target.value}))} style={{ fontFamily:'monospace', fontSize:12 }} />
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => copy(form.usdtWallet)}><Copy size={13}/></button>
              </div>
            </div>
            <div style={{ background:'#f0f7ff', borderRadius:12, padding:'12px 16px', fontFamily:'monospace', fontSize:12, color:'#0d6e99', wordBreak:'break-all' }}>{form.usdtWallet || <span style={{color:'#8aabcc'}}>No address set</span>}</div>
          </div>
        </div>
        {/* Naira */}
        <div className="admin-card" style={{ overflow:'visible' }}>
          <div className="admin-card-header"><span className="admin-card-title">₦ Naira Bank Details</span></div>
          <div style={{ padding:'20px 22px' }}>
            {[['Bank Name','name'],['Account Name','account'],['Account Number','number']].map(([label,key]) => (
              <div key={key} className="admin-form-group">
                <label className="admin-form-label">{label}</label>
                <input className="admin-field" value={form.nairaBank?.[key] || ''} onChange={e => setForm(p=>({...p,nairaBank:{...p.nairaBank,[key]:e.target.value}}))} />
              </div>
            ))}
          </div>
        </div>
        {/* Cedis */}
        <div className="admin-card" style={{ overflow:'visible' }}>
          <div className="admin-card-header"><span className="admin-card-title">₵ Cedis Mobile Money</span></div>
          <div style={{ padding:'20px 22px' }}>
            {[['MoMo Network','name'],['Account Name','account'],['Mobile Number','number']].map(([label,key]) => (
              <div key={key} className="admin-form-group">
                <label className="admin-form-label">{label}</label>
                <input className="admin-field" value={form.cedisBank?.[key] || ''} onChange={e => setForm(p=>({...p,cedisBank:{...p.cedisBank,[key]:e.target.value}}))} />
              </div>
            ))}
          </div>
        </div>
        {/* Preview */}
        <div className="admin-card">
          <div className="admin-card-header"><span className="admin-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}><Eye size={15} /> Live Preview</span></div>
          <div style={{ padding:'16px 22px', display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { label:'USDT Wallet', val: form.usdtWallet || '—', mono:true },
              { label:'Naira Bank',  val: `${form.nairaBank?.name} · ${form.nairaBank?.account} · ${form.nairaBank?.number}` },
              { label:'Cedis MoMo', val: `${form.cedisBank?.name} · ${form.cedisBank?.account} · ${form.cedisBank?.number}` },
            ].map(r => (
              <div key={r.label} style={{ padding:'12px 14px', background:'#f8fbff', borderRadius:10, border:'1px solid #e0eaf2' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#7aabcc', textTransform:'uppercase', marginBottom:5 }}>{r.label}</div>
                <div style={{ fontSize:12, color:'#1a2a3a', fontFamily: r.mono ? 'monospace' : 'inherit', wordBreak:'break-all' }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
        <button className="admin-btn admin-btn-primary" onClick={save} style={{ minWidth:160, justifyContent:'center' }} disabled={saving}>
          {saving ? <><Loader2 size={13} className="spin"/> Saving…</> : <><Save size={14}/> Save All Settings</>}
        </button>
      </div>
    </AdminLayout>
  );
}
