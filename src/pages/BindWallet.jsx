import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BindWallet() {
  const { user, saveWallet, showToast } = useApp();
  const [address, setAddress] = useState(user?.walletAddress || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (!address.trim()) { showToast('Please enter a wallet address'); return; }
    setLoading(true);
    try {
      await saveWallet(address.trim());
      navigate('/profile');
    } catch (err) {
      showToast(err.message || 'Failed to save wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate('/profile')}><ChevronLeft size={20} /></button>
        <h2 className="inner-title">Bind Wallet</h2>
        <div />
      </div>
      <form className="section-card mt-16" onSubmit={handle}>
        <div className="form-group">
          <label className="form-label">TRC20 Wallet Address</label>
          <input className="field" placeholder="Enter TRC20 address" value={address} onChange={e => setAddress(e.target.value)} required />
          <p className="form-hint">Only TRC20 (USDT) addresses are supported</p>
          {address && (address[0] !== 'T' || address.length !== 34) && (
            <p style={{ color: '#d97706', fontSize: 12, marginTop: 4 }}>This doesn't look like a valid TRC20 address. Double-check before saving.</p>
          )}
        </div>
        <button type="submit" className="btn-solid w-full" disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : 'Save Wallet Address'}
        </button>
      </form>
    </div>
  );
}
