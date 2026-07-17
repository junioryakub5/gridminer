import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ChangePassword() {
  const { changePassword, showToast } = useApp();
  const [form, setForm]   = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) { showToast('New passwords do not match'); return; }
    if (form.next.length < 6)       { showToast('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await changePassword(form.current, form.next);
      navigate('/profile');
    } catch (err) {
      showToast(err.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate('/profile')}><ChevronLeft size={20} /></button>
        <h2 className="inner-title">Change Password</h2>
        <div />
      </div>
      <form className="section-card mt-16" onSubmit={handle}>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input className="field" type="password" value={form.current} onChange={f('current')} required />
        </div>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input className="field" type="password" value={form.next} onChange={f('next')} required />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input className="field" type="password" value={form.confirm} onChange={f('confirm')} required />
        </div>
        <button type="submit" className="btn-solid w-full" disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
