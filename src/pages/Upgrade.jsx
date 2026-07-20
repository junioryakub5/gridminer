import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { publicAPI } from '../services/api.js';

export default function Upgrade() {
  const navigate = useNavigate();
  const { user, TIER_DATA, setSelectedTier } = useApp();
  const [localTiers, setLocalTiers] = useState(TIER_DATA || []);
  const [loading, setLoading] = useState(false);

  // Re-fetch tiers if the context didn't load them (e.g. backend was unreachable on boot)
  useEffect(() => {
    if (localTiers.length > 0) return;
    setLoading(true);
    publicAPI.getTiers()
      .then(t => setLocalTiers(t))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sync if context loads them later
  useEffect(() => {
    if (TIER_DATA?.length > 0) setLocalTiers(TIER_DATA);
  }, [TIER_DATA]);

  const tiers = localTiers;

  const handleUpgrade = (tier) => {
    setSelectedTier(tier);
    navigate('/payment-method');
  };


  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}><ChevronLeft size={22} /></button>
        <h2 className="inner-title">Choose Your Tier</h2>
        <div />
      </div>

      <div className="upgrade-list">
        {loading && <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>Loading tiers…</p>}
        {!loading && tiers.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No tiers available. Please try again later.</p>}
        {tiers.map(t => {
          const isCurrent = user?.tier === t.tier;
          return (
            <div key={t.tier} className="tier-row">
              {/* Tier heading */}
              <div className="tier-row-header">
                <span className="tier-row-name">Tier {t.tier}</span>
                {isCurrent && <span className="tier-badge-curr">Current</span>}
              </div>

              {/* Details */}
              <div className="tier-detail-row">
                <span className="tier-detail-label">Period</span>
                <span className="tier-detail-val">{t.period} Days</span>
              </div>
              <div className="tier-detail-row">
                <span className="tier-detail-label">Earn per 24hrs</span>
                <span className="tier-detail-earn">${t.earnPer24h?.toFixed(2)} USDT</span>
              </div>
              <div className="tier-detail-row" style={{ alignItems: 'flex-start' }}>
                <span className="tier-detail-label">Price</span>
                <div className="tier-price-block">
                  <span className="tier-price-usd">${t.priceUSD?.toFixed(2)} USD</span>
                  {t.priceNGN > 0 && <span className="tier-price-ngn">≈ ₦{t.priceNGN?.toLocaleString()}.00</span>}
                  {t.priceGHS > 0 && <span className="tier-price-ghs">≈ ₵{t.priceGHS?.toLocaleString()}.00</span>}
                </div>
              </div>

              {/* Action button */}
              {isCurrent
                ? <button className="tier-upgrade-btn" disabled>Current Plan</button>
                : t.tier < (user?.tier || 1)
                  ? <button className="tier-upgrade-btn" style={{ background: '#f0f5f9', color: '#8aabcc' }} disabled>Already Upgraded Past This</button>
                  : <button className="tier-upgrade-btn" onClick={() => handleUpgrade(t)}>Upgrade</button>
              }
            </div>
          );
        })}
      </div>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
