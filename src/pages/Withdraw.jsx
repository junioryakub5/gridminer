import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

export default function Withdraw() {
  const { user, submitWithdrawal, showToast } = useApp();
  const navigate = useNavigate();
  const [address, setAddress] = useState(user?.walletAddress || '');
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);
  const isTier1 = user?.tier === 1 && (user?.balance || 0) < 100;
  const fee = 1.00;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) { showToast('Please enter a wallet address'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) { showToast('Minimum withdrawal is 5 USDT'); return; }
    setLoading(true);
    try {
      await submitWithdrawal(address, amt);
      setAmount('');
      showToast('Withdrawal submitted!');
    } catch (err) {
      showToast(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Header — centered title like reference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 8px' }}>
        <button className="back-btn" onClick={() => navigate('/dashboard')}><ChevronLeft size={22} /></button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0d6e99' }}>Withdrawal</h2>
        <div style={{ width: 30 }} />
      </div>

      {isTier1 ? (
        /* ── Tier 1 restriction card (matches reference exactly) ── */
        <div className="restrict-card">
          <div className="restrict-top">
            <div className="restrict-warn">
              <AlertCircle size={18} color="#ef4444" />
            </div>
            <div>
              <h3 className="restrict-title">Withdrawal Not Available for Tier 1</h3>
              <p className="restrict-sub">To start withdrawing your earnings, you have two options:</p>
            </div>
          </div>

          <div className="restrict-list">
            <div className="restrict-item">
              <span className="ri-num">1</span>
              <span>Accumulate <strong style={{ color: '#0d6e99' }}>100 USDT</strong> in your balance and maintain Tier 1 status</span>
            </div>
            <div className="restrict-item">
              <span className="ri-num">2</span>
              <span>Upgrade to a higher tier for <span style={{ color: '#0d6e99', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/upgrade')}>instant withdrawal</span></span>
            </div>
          </div>

          <button className="btn-upgrade-now" onClick={() => navigate('/upgrade')}>
            → Upgrade Account Now
          </button>

          <p style={{ fontSize: 12, color: '#8aabcc', marginTop: 14, fontStyle: 'italic' }}>
            Upgrading your account unlocks better withdrawal options and rewards.
          </p>
        </div>
      ) : (
        /* ── Withdrawal form ── */
        <form className="section-card mt-16" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Wallet Address (TRC20)</label>
            <input
              className="field"
              type="text"
              placeholder="Your TRC20 wallet address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (USDT)</label>
            <input
              className="field"
              type="number"
              placeholder="Min: 5.00 USDT"
              min="5"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
            <p className="form-hint">
              Balance: ${(user?.balance || 0).toFixed(2)} &nbsp;|&nbsp; Fee: {fee.toFixed(2)} USDT &nbsp;|&nbsp; Min: 5.00 USDT
            </p>
          </div>
          {amount && parseFloat(amount) >= 5 && (
            <div style={{ background: 'rgba(13,110,160,0.07)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0d5a7a', marginBottom: 12 }}>
              You receive: <strong>${(parseFloat(amount) - fee).toFixed(2)} USDT</strong> (after {fee} USDT fee)
            </div>
          )}
          <button type="submit" className="btn-solid w-full" disabled={loading}>
            {loading ? <><Loader2 size={14} className="spin" /> Processing…</> : 'Submit Withdrawal'}
          </button>
        </form>
      )}

      <BottomNav />
    </div>
  );
}
