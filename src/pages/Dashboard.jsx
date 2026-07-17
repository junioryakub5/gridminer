import { useNavigate } from 'react-router-dom';
import {
  Bell, Info, Loader2, TrendingUp, History as HistoryIcon,
  ArrowDownToLine, CreditCard, Lock, Cpu, Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

/* ── Mining countdown clock widget ── */
function MineClock({ lastMinedAt, canMine, onMine, mining }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const PERIOD = 24 * 60 * 60; // 24 hours in seconds

  useEffect(() => {
    const calc = () => {
      if (canMine || !lastMinedAt) { setTimeLeft(PERIOD); return; }
      const elapsed = (Date.now() - new Date(lastMinedAt).getTime()) / 1000;
      setTimeLeft(Math.max(0, PERIOD - elapsed));
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [lastMinedAt, canMine]);

  // Parse timeLeft into H / M / S — all update every second
  const totalSec = Math.floor(timeLeft);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const fullFmt = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;

  // SVG arc — progress grows as time elapses
  const R    = 27;
  const CIRC = 2 * Math.PI * R;

  // Arc sweeps one full revolution every 60 seconds (like a second hand).
  // This makes it visibly move each second instead of barely moving over 24h.
  // canMine → full circle (ready to tap). Counting → ss drives the sweep.
  const arcProgress = canMine ? 1 : ss / 60;   // 0 = empty, 1 = full circle
  const dashOffset  = CIRC * (1 - arcProgress);

  return (
    <div
      className={`mine-clock${canMine && !mining ? ' mine-clock-ready-state' : ''}`}
      onClick={canMine && !mining ? onMine : undefined}
      title={canMine ? 'Click to mine' : `Next mine in ${fullFmt}`}
    >
      {/* SVG ring */}
      <svg width="64" height="64" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r={R} className="mine-clock-bg" />
        <circle
          cx="31" cy="31" r={R}
          className="mine-clock-arc"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={dashOffset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '31px 31px' }}
        />
      </svg>

      {/* inner text — shows HH h above MM:SS so seconds are always visible */}
      <div className="mine-clock-inner">
        {mining ? (
          <Loader2 size={14} className="spin" color="white" />
        ) : canMine ? (
          <span className="mine-clock-tap">TAP</span>
        ) : (
          <>
            {hh > 0 && <span className="mine-clock-hh">{pad(hh)}h</span>}
            <span className="mine-clock-mmss">{pad(mm)}:{pad(ss)}</span>
            <span className="mine-clock-label">LEFT</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, mine, canMine, TIER_DATA, showToast, saveWallet } = useApp();
  const [mining, setMining]         = useState(false);
  const [walletInput, setWalletInput] = useState(user?.walletAddress || '');
  const [walletEdit, setWalletEdit]   = useState(false);

  const NGN_RATE = 1600;
  const balance  = user?.balance ?? 0;

  const handleMine = async () => {
    if (!canMine || mining) return;
    setMining(true);
    try {
      const earned = await mine();
      if (earned !== false) showToast(`Mined ${earned.toFixed(2)} USDT!`);
    } catch (err) {
      showToast(err.message || 'Mining failed');
    } finally {
      setMining(false);
    }
  };

  const handleSaveWallet = async () => {
    try {
      await saveWallet(walletInput);
      setWalletEdit(false);
      showToast('Wallet address saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save wallet');
    }
  };

  const tierInfo = TIER_DATA?.find(t => t.tier === user?.tier);

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <span className="dash-brand">Cloud Mining 2.0</span>
          <span className="dash-sub">Secure TRC20 Network</span>
        </div>
        <div className="dash-header-right">
          <button className="icon-btn" onClick={() => navigate('/notifications')}>
            <Bell size={20} />
            <span className="badge-dot" />
          </button>
          <button className="avatar-btn" onClick={() => navigate('/profile')}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </button>
        </div>
      </div>

      {/* ── Balance card ── */}
      <div className="balance-card">
        <div className="bc-label"><Info size={11} /> Available Balance</div>
        <div className="bc-row">
          <div className="bc-left">
            <div className="bc-amount">
              {balance.toFixed(2)} <span className="bc-unit">USDT</span>
            </div>
            <div className="bc-ngn-pill">
              ≈ ₦{(balance * NGN_RATE).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <MineClock
            lastMinedAt={user?.lastMinedAt}
            canMine={canMine}
            onMine={handleMine}
            mining={mining}
          />
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="quick-actions">
        <button className="qa-btn" onClick={() => navigate('/upgrade')}>
          <div className="qa-icon qa-orange"><TrendingUp size={22} strokeWidth={2} /></div>
          <span>Upgrade</span>
        </button>
        <button className="qa-btn" onClick={() => navigate('/history')}>
          <div className="qa-icon qa-purple"><HistoryIcon size={22} strokeWidth={2} /></div>
          <span>History</span>
        </button>
        <button className="qa-btn" onClick={() => navigate('/withdraw')}>
          <div className="qa-icon qa-green"><ArrowDownToLine size={22} strokeWidth={2} /></div>
          <span>Withdraw</span>
        </button>
      </div>

      {/* ── Bind wallet ── */}
      <div className="section-card">
        <div className="sc-header">
          <CreditCard size={16} color="#0d6e99" />
          <span className="sc-title">Bind Wallet Address</span>
        </div>
        <div className="form-group">
          <label className="form-label">TRC20 Address</label>
          <div className="field-wrap">
            <Lock size={14} color="#8aabcc" className="field-prefix-icon" />
            <input
              className="field field-with-icon"
              placeholder="Enter your TRC20 wallet address"
              value={walletEdit ? walletInput : (user?.walletAddress || '')}
              onChange={e => { setWalletInput(e.target.value); setWalletEdit(true); }}
              readOnly={!walletEdit && !!user?.walletAddress}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => { setWalletEdit(true); setWalletInput(user?.walletAddress || ''); }}>Edit</button>
          <button className="btn-solid" onClick={handleSaveWallet}>Save Address</button>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="section-card info-card">
        <div className="info-icon"><Cpu size={16} color="#0d6e99" /></div>
        <div>
          <span className="info-title">How it works</span>
          <p className="info-body">
            Cloud mining runs 24/7 on the <strong className="teal">TRC20 network</strong>. Tap the clock to collect your daily reward. Upgrade your tier to earn more per cycle.
          </p>
          {tierInfo && (
            <p className="info-body" style={{ marginTop: 6 }}>
              <Zap size={11} style={{ display:'inline', marginRight:3, color:'#1a9e8f' }} />
              Your Tier {user.tier} earns <strong className="teal">${tierInfo.earnPer24h?.toFixed(2)} USDT</strong> every 24 hours.
            </p>
          )}
        </div>
      </div>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
