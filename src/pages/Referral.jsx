import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Link2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Referral() {
  const navigate = useNavigate();
  const { user, showToast } = useApp();
  const refLink = `https://gridminer.site/?ref=${user?.referralCode || 'GM123456'}`;

  const copy = () => {
    navigator.clipboard.writeText(refLink).then(() => showToast('Referral link copied!'));
  };

  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate('/profile')}><ChevronLeft size={20} /></button>
        <h2 className="inner-title">Referral System</h2>
        <div />
      </div>
      <div className="referral-container">
        <div className="ref-icon-big"><Link2 size={32} color="#1a9e8f" strokeWidth={2} /></div>
        <h3 className="ref-title">Invite Friends &amp; Earn</h3>
        <p className="ref-text">Share your referral link and earn bonuses when your friends join and upgrade their tier.</p>
        <div className="ref-link-box">
          <span className="ref-link-text">{refLink}</span>
          <button className="ref-copy-btn" onClick={copy}><Copy size={14} /></button>
        </div>
        <button className="btn-solid w-full" style={{marginTop:'12px'}} onClick={copy}>Copy Referral Link</button>
        <div className="ref-stats">
          <div className="rs-item"><div className="rs-val">0</div><div className="rs-label">Total Referrals</div></div>
          <div className="rs-divider" />
          <div className="rs-item"><div className="rs-val">$0.00</div><div className="rs-label">Referral Earnings</div></div>
        </div>
      </div>
    </div>
  );
}
