import { useNavigate } from 'react-router-dom';
import {
  Bell, Info, Loader2, TrendingUp, History as HistoryIcon,
  ArrowDownToLine, CreditCard, Lock, Cpu, Zap
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { getApiBase } from '../services/api';

/* ── Local-currency pill that alternates NGN ↔ GHS every 4 s ── */
function LocalCurrencyPill({ balance }) {
  const NGN_RATE = 1600;
  const GHS_RATE = 15.2; // ~1 USD = 15.2 GHS (update as needed)
  const [showGHS, setShowGHS] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setShowGHS(v => !v), 4000);
    return () => clearInterval(t);
  }, []);

  return showGHS ? (
    <div className="bc-ngn-pill bc-ghs-pill" key="ghs">
      ≈ ₵{(balance * GHS_RATE).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  ) : (
    <div className="bc-ngn-pill" key="ngn">
      ≈ ₦{(balance * NGN_RATE).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  );
}

/* ── Coin sound via Web Audio API (no file needed) ── */
function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, startTime, duration, gainVal) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.3);
      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const t = ctx.currentTime;
    play(880,  t,        0.15, 0.4);
    play(1320, t + 0.05, 0.18, 0.3);
    play(1760, t + 0.10, 0.22, 0.25);
  } catch (_) { /* audio not supported */ }
}

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
  const { user, mine, canMine, TIER_DATA, showToast, saveWallet, transactions = [] } = useApp();
  const [mining, setMining]         = useState(false);
  const [walletInput, setWalletInput] = useState(user?.walletAddress || '');
  const [walletEdit, setWalletEdit]   = useState(false);

  const balance  = user?.balance ?? 0;

  const notifLastSeen = localStorage.getItem('notif_last_seen') || 0;
  const unreadCount = transactions.filter(t => new Date(t.date).getTime() > new Date(notifLastSeen).getTime()).length;

  const handleBellClick = () => {
    localStorage.setItem('notif_last_seen', new Date().toISOString());
    navigate('/notifications');
  };

  const handleMine = async () => {
    if (!canMine || mining) return;
    playCoinSound();
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
          <button className="icon-btn" onClick={handleBellClick} style={{ position: 'relative' }}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="badge-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, width: 14, height: 14, padding: 0 }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button className="avatar-btn" onClick={() => navigate('/profile')} style={{ padding: user?.avatarUrl ? 0 : undefined, overflow: 'hidden' }}>
            {user?.avatarUrl ? (
              <img src={`${getApiBase()}${user.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.name?.[0]?.toUpperCase() || 'U'
            )}
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
            <LocalCurrencyPill balance={balance} />
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

        {!walletEdit ? (
          <>
            <div className="form-group">
              <label className="form-label">TRC20 Address</label>
              <div className="field-wrap">
                <Lock size={14} color="#8aabcc" className="field-prefix-icon" />
                <div className="field field-with-icon" style={{ display:'flex', alignItems:'center', color: user?.walletAddress ? '#e0edf6' : '#8aabcc', fontSize: 13, wordBreak:'break-all' }}>
                  {user?.walletAddress || 'No wallet address bound yet'}
                </div>
              </div>
            </div>
            <button className="btn-solid" onClick={() => { setWalletInput(user?.walletAddress || ''); setWalletEdit(true); }}>
              {user?.walletAddress ? 'Edit Address' : 'Bind Wallet'}
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">TRC20 Address</label>
              <div className="field-wrap">
                <Lock size={14} color="#1a9e8f" className="field-prefix-icon" />
                <input
                  className="field field-with-icon"
                  placeholder="Enter your TRC20 wallet address"
                  value={walletInput}
                  onChange={e => setWalletInput(e.target.value)}
                  autoFocus
                />
              </div>
              {walletInput && (walletInput[0] !== 'T' || walletInput.length !== 34) && (
                <p style={{ color: '#d97706', fontSize: 12, marginTop: 4 }}>This doesn't look like a valid TRC20 address. Double-check before saving.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" onClick={() => setWalletEdit(false)}>Cancel</button>
              <button className="btn-solid" onClick={handleSaveWallet}>Save Address</button>
            </div>
          </>
        )}
      </div>

      {/* ── How it works ── */}
      <div className="section-card info-card">
        <div className="info-icon"><Cpu size={16} color="#0d6e99" /></div>
        <div>
          <span className="info-title">How it works</span>
          <p className="info-body">
            Gridminer runs 24/7 on the <strong className="teal">TRC20 network</strong>. Tap the clock to collect your daily reward. Upgrade your tier to earn more per cycle.
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
