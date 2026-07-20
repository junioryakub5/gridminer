import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Link2, Users, TrendingUp, Gift } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { userAPI } from '../services/api';

export default function Referral() {
  const navigate = useNavigate();
  const { user, showToast } = useApp();
  const refLink = `https://gridminer.site/?ref=${user?.referralCode || 'GM123456'}`;

  const [stats, setStats]     = useState({ totalReferrals: 0, totalEarnings: 0, friends: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.referralStats()
      .then(data => setStats(data))
      .catch(() => {/* silently keep defaults */})
      .finally(() => setLoading(false));
  }, []);

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
        {/* Hero */}
        <div className="ref-icon-big"><Link2 size={32} color="#1a9e8f" strokeWidth={2} /></div>
        <h3 className="ref-title">Invite Friends &amp; Earn</h3>
        <p className="ref-text">
          Earn <strong>10% of every mining reward</strong> your referred friends generate — automatically and forever.
        </p>

        {/* Link box */}
        <div className="ref-link-box">
          <span className="ref-link-text">{refLink}</span>
          <button className="ref-copy-btn" onClick={copy}><Copy size={14} /></button>
        </div>
        <button className="btn-solid w-full" style={{ marginTop: '12px' }} onClick={copy}>
          Copy Referral Link
        </button>

        {/* How it works */}
        <div className="ref-how-it-works">
          <h4 className="ref-how-title">How It Works</h4>
          <div className="ref-steps">
            <div className="ref-step">
              <div className="ref-step-icon"><Link2 size={18} /></div>
              <div>
                <div className="ref-step-label">Share Your Link</div>
                <div className="ref-step-desc">Send your unique referral link to friends</div>
              </div>
            </div>
            <div className="ref-step">
              <div className="ref-step-icon"><Users size={18} /></div>
              <div>
                <div className="ref-step-label">Friend Signs Up</div>
                <div className="ref-step-desc">They register using your referral link</div>
              </div>
            </div>
            <div className="ref-step">
              <div className="ref-step-icon"><TrendingUp size={18} /></div>
              <div>
                <div className="ref-step-label">They Mine</div>
                <div className="ref-step-desc">Every time they earn from mining, you get 10%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="ref-stats">
          <div className="rs-item">
            <div className="rs-val">{loading ? '—' : stats.totalReferrals}</div>
            <div className="rs-label">Total Referrals</div>
          </div>
          <div className="rs-divider" />
          <div className="rs-item">
            <div className="rs-val">{loading ? '—' : `$${stats.totalEarnings.toFixed(2)}`}</div>
            <div className="rs-label">Referral Earnings</div>
          </div>
        </div>

        {/* Friends list */}
        {!loading && stats.friends.length > 0 && (
          <div className="ref-friends-list">
            <h4 className="ref-friends-title">Your Referred Friends</h4>
            {stats.friends.map((f, i) => (
              <div key={i} className="ref-friend-row">
                <div className="ref-friend-avatar">
                  {f.name.charAt(0).toUpperCase()}
                </div>
                <div className="ref-friend-info">
                  <div className="ref-friend-name">{f.name}</div>
                  <div className="ref-friend-date">Joined {f.joinedAt}</div>
                </div>
                <div className="ref-friend-earned">
                  <Gift size={13} style={{ marginRight: 4, opacity: 0.7 }} />
                  ${f.bonusGenerated.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && stats.friends.length === 0 && (
          <p className="ref-empty">No referrals yet. Share your link and start earning!</p>
        )}
      </div>
    </div>
  );
}
