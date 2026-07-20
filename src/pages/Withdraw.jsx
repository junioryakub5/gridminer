import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, AlertCircle, Loader2, Wallet, Building2,
  ChevronDown, ShieldCheck, CreditCard, Search, CheckCircle2, XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { userAPI } from '../services/api';

/* ── Banks list (Nigeria + Ghana) ── */
const BANKS = [
  /* ── Nigeria ── */
  { label: '🇳🇬 Nigerian Banks', disabled: true },
  { label: 'Access Bank' },
  { label: 'Citibank Nigeria' },
  { label: 'Ecobank Nigeria' },
  { label: 'Fidelity Bank' },
  { label: 'First Bank of Nigeria' },
  { label: 'First City Monument Bank (FCMB)' },
  { label: 'Globus Bank' },
  { label: 'Guaranty Trust Bank (GTB)' },
  { label: 'Heritage Bank' },
  { label: 'Keystone Bank' },
  { label: 'Kuda Bank' },
  { label: 'Lotus Bank' },
  { label: 'OPay' },
  { label: 'Parallex Bank' },
  { label: 'Palmpay' },
  { label: 'Polaris Bank' },
  { label: 'PremiumTrust Bank' },
  { label: 'Providus Bank' },
  { label: 'Rand Merchant Bank' },
  { label: 'Stanbic IBTC Bank' },
  { label: 'Standard Chartered Bank Nigeria' },
  { label: 'Sterling Bank' },
  { label: 'SunTrust Bank' },
  { label: 'Titan Trust Bank' },
  { label: 'Union Bank of Nigeria' },
  { label: 'United Bank for Africa (UBA)' },
  { label: 'Unity Bank' },
  { label: 'VFD Microfinance Bank' },
  { label: 'Wema Bank' },
  { label: 'Zenith Bank' },

  /* ── Ghana ── */
  { label: '🇬🇭 Ghanaian Banks', disabled: true },
  { label: 'Absa Bank Ghana' },
  { label: 'Access Bank Ghana' },
  { label: 'Agricultural Development Bank (ADB)' },
  { label: 'CalBank' },
  { label: 'Consolidated Bank Ghana (CBG)' },
  { label: 'Ecobank Ghana' },
  { label: 'Fidelity Bank Ghana' },
  { label: 'First Atlantic Bank' },
  { label: 'First National Bank Ghana' },
  { label: 'GCB Bank' },
  { label: 'Guaranty Trust Bank Ghana (GTB)' },
  { label: 'National Investment Bank (NIB)' },
  { label: 'OmniBank Ghana' },
  { label: 'Prudential Bank Ghana' },
  { label: 'Republic Bank Ghana' },
  { label: 'Société Générale Ghana' },
  { label: 'Stanbic Bank Ghana' },
  { label: 'Standard Chartered Bank Ghana' },
  { label: 'United Bank for Africa Ghana (UBA)' },
  { label: 'Universal Merchant Bank (UMB)' },
  { label: 'Zenith Bank Ghana' },
  /* Mobile Money */
  { label: '📱 Ghana Mobile Money', disabled: true },
  { label: 'MTN Mobile Money (MoMo)' },
  { label: 'Vodafone Cash' },
  { label: 'AirtelTigo Money' },
];

const MIN_WITHDRAWAL  = 10;
const MAX_WITHDRAWAL  = 10000;
const USD_TO_NGN_RATE = 1550;
const FEE_PERCENT     = 0;

export default function Withdraw() {
  const { user, submitWithdrawal, showToast } = useApp();
  const navigate = useNavigate();

  /* ── tab: 'crypto' | 'bank' ── */
  const [tab, setTab] = useState('crypto');

  /* ── shared ── */
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);

  /* ── crypto ── */
  const walletBound = !!user?.walletAddress;
  const walletAddr  = user?.walletAddress || '';

  /* ── bank ── */
  const [bankQuery,     setBankQuery]     = useState('');
  const [selectedBank,  setSelectedBank]  = useState('');
  const [bankOpen,      setBankOpen]      = useState(false);
  const [accountNumber, setAccountNumber] = useState('');

  /* ── account name lookup ── */
  const [acctName,      setAcctName]      = useState('');
  const [acctSkipped,   setAcctSkipped]   = useState(false);
  const [acctVerifying, setAcctVerifying] = useState(false);
  const [acctError,     setAcctError]     = useState('');
  const verifyTimer = useRef(null);

  useEffect(() => {
    setAcctName('');
    setAcctError('');
    setAcctSkipped(false);
    if (selectedBank && /^\d{10}$/.test(accountNumber)) {
      setAcctVerifying(true);
      clearTimeout(verifyTimer.current);
      verifyTimer.current = setTimeout(async () => {
        try {
          const data = await userAPI.verifyAccount(selectedBank, accountNumber);
          if (data.skipped) {
            setAcctSkipped(true);   // verification not available for this bank
          } else {
            setAcctName(data.accountName);
          }
          setAcctError('');
        } catch (err) {
          setAcctError(err.message || 'Could not verify account');
        } finally {
          setAcctVerifying(false);
        }
      }, 600);
    } else {
      setAcctVerifying(false);
    }
    return () => clearTimeout(verifyTimer.current);
  }, [selectedBank, accountNumber]);

  /* ── computed ── */
  const balance     = parseFloat(user?.balance || 0);
  const parsedAmt   = parseFloat(amount) || 0;
  const feeAmt      = +(parsedAmt * FEE_PERCENT / 100).toFixed(2);
  const youReceive  = +(parsedAmt - feeAmt).toFixed(2);
  const ngnAmount   = +(parsedAmt * USD_TO_NGN_RATE).toFixed(2);
  const ngnReceive  = +(youReceive * USD_TO_NGN_RATE).toFixed(2);
  const isValid     = parsedAmt >= MIN_WITHDRAWAL && parsedAmt <= MAX_WITHDRAWAL && parsedAmt <= balance;

  /* ── tier restriction ── */
  const isTier1Restricted = user?.tier === 1 && balance < 100;

  /* ── quick % buttons ── */
  const applyPct = (pct) => {
    const v = pct === 'MAX' ? balance : +(balance * pct / 100).toFixed(2);
    setAmount(String(Math.min(v, MAX_WITHDRAWAL)));
  };

  /* ── bank search ── */
  const filteredBanks = bankQuery.trim()
    ? BANKS.filter(b => !b.disabled && b.label.toLowerCase().includes(bankQuery.toLowerCase()))
    : BANKS;

  /* ── submit ── */
  const handleSubmit = async () => {
    if (isNaN(parsedAmt) || parsedAmt < MIN_WITHDRAWAL) {
      return showToast(`Minimum withdrawal is $${MIN_WITHDRAWAL}.00`);
    }
    if (parsedAmt > MAX_WITHDRAWAL) {
      return showToast(`Maximum is $${MAX_WITHDRAWAL.toLocaleString()}.00 per transaction`);
    }
    if (parsedAmt > balance) {
      return showToast('Insufficient balance');
    }

    if (tab === 'crypto') {
      if (!walletBound) return showToast('Please bind your TRC20 wallet address first');
    } else {
      if (!selectedBank)                   return showToast('Please select a bank');
      if (!/^\d{10}$/.test(accountNumber)) return showToast('Account number must be 10 digits');
      if (acctVerifying)                   return showToast('Verifying account, please wait...');
      // only block if verification ran AND failed (not skipped)
      if (!acctName && !acctSkipped)       return showToast('Please wait for account verification');
    }

    setLoading(true);
    try {
      await submitWithdrawal(
        tab === 'crypto' ? walletAddr : '',
        parsedAmt,
        tab,
        tab === 'bank' ? selectedBank : '',
        tab === 'bank' ? accountNumber : '',
      );
      setAmount('');
      setSelectedBank('');
      setBankQuery('');
      setAccountNumber('');
      setAcctName('');
      setAcctError('');
      setAcctSkipped(false);
    } catch (err) {
      showToast(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Tier 1 restriction ── */
  if (isTier1Restricted) {
    return (
      <div className="page">
        <div className="wd-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}><ChevronLeft size={22} /></button>
          <h2 className="wd-title">Withdrawal</h2>
          <div style={{ width: 30 }} />
        </div>
        <div className="restrict-card">
          <div className="restrict-top">
            <div className="restrict-warn"><AlertCircle size={18} color="#ef4444" /></div>
            <div>
              <h3 className="restrict-title">Withdrawal Not Available for Tier 1</h3>
              <p className="restrict-sub">To start withdrawing, you have two options:</p>
            </div>
          </div>
          <div className="restrict-list">
            <div className="restrict-item">
              <span className="ri-num">1</span>
              <span>Accumulate <strong style={{ color: '#0d6e99' }}>100 USDT</strong> in your balance</span>
            </div>
            <div className="restrict-item">
              <span className="ri-num">2</span>
              <span>Upgrade to a higher tier for <span style={{ color: '#0d6e99', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/upgrade')}>instant withdrawal</span></span>
            </div>
          </div>
          <button className="btn-upgrade-now" onClick={() => navigate('/upgrade')}>→ Upgrade Account Now</button>
          <p style={{ fontSize: 12, color: '#8aabcc', marginTop: 14, fontStyle: 'italic' }}>
            Upgrading unlocks better withdrawal options and rewards.
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="wd-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}><ChevronLeft size={22} /></button>
        <h2 className="wd-title">Withdrawal</h2>
        <div style={{ width: 30 }} />
      </div>

      <div className="wd-body">
        {/* Tabs */}
        <div className="wd-tabs">
          <button className={`wd-tab ${tab === 'crypto' ? 'active' : ''}`} onClick={() => setTab('crypto')}>
            Crypto Withdrawal
          </button>
          <button className={`wd-tab ${tab === 'bank' ? 'active' : ''}`} onClick={() => setTab('bank')}>
            Bank Transfer
          </button>
        </div>

        {/* Amount card */}
        <div className="wd-amount-card">
          <div className="wd-amount-label">Withdrawal Amount</div>
          <div className="wd-amount-row">
            <Wallet size={22} className="wd-wallet-icon" />
            <input
              className="wd-amount-input"
              type="number"
              placeholder="0.00"
              min={MIN_WITHDRAWAL}
              max={MAX_WITHDRAWAL}
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <span className="wd-currency">{tab === 'crypto' ? 'USDT' : 'USD'}</span>
          </div>
          <div className="wd-available">
            Available: <strong>${balance.toFixed(2)} {tab === 'crypto' ? 'USDT' : 'USD'}</strong>
          </div>
        </div>

        {/* Quick % buttons */}
        <div className="wd-pct-row">
          {[25, 50, 75].map(p => (
            <button key={p} className="wd-pct-btn" onClick={() => applyPct(p)}>{p}%</button>
          ))}
          <button className="wd-pct-btn max" onClick={() => applyPct('MAX')}>MAX</button>
        </div>

        {/* ─── CRYPTO TAB ─── */}
        {tab === 'crypto' && (
          <>
            {/* Wallet address */}
            <div className="wd-section-card">
              <div className="wd-field-label">
                TRC20 Wallet Address
                {walletBound && <span className="wd-bound-badge">Bound</span>}
              </div>
              <div className="wd-wallet-display">
                <ShieldCheck size={16} className="wd-shield-icon" />
                {walletBound
                  ? <span className="wd-wallet-addr">{walletAddr}</span>
                  : <span className="wd-wallet-placeholder" onClick={() => navigate('/bind-wallet')}>
                      Tap to bind your TRC20 wallet →
                    </span>
                }
              </div>
            </div>

            {/* Network info */}
            <div className="wd-info-box">
              <ShieldCheck size={20} className="wd-info-icon" />
              <div>
                <div className="wd-info-title">Network Information</div>
                <div className="wd-info-text">Withdrawals processed on TRC20 network. Ensure your wallet supports USDT-TRC20.</div>
              </div>
            </div>

            {/* Fee summary */}
            {parsedAmt > 0 && (
              <div className="wd-summary-card">
                <div className="wd-summary-title"><CreditCard size={15} /> Withdrawal Fees</div>
                <div className="wd-summary-row"><span>Amount</span><span>{parsedAmt.toFixed(2)} USDT</span></div>
                <div className="wd-summary-row"><span>Network Fee</span><span>{FEE_PERCENT}% = {feeAmt.toFixed(2)} USDT</span></div>
                <div className="wd-summary-row total"><span>You Receive</span><span>{youReceive.toFixed(2)} USDT</span></div>
              </div>
            )}

            {/* Submit */}
            <button
              className="wd-submit-btn"
              onClick={handleSubmit}
              disabled={loading || !isValid || !walletBound}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Processing…</>
                : <><Wallet size={16} /> Withdraw Crypto</>
              }
            </button>
          </>
        )}

        {/* ─── BANK TAB ─── */}
        {tab === 'bank' && (
          <>
            {/* Select Bank */}
            <div className="wd-section-card">
              <div className="wd-field-label">Select Bank</div>
              <div className="wd-bank-dropdown" onClick={() => setBankOpen(o => !o)}>
                <Search size={15} className="wd-search-icon" />
                <input
                  className="wd-bank-search"
                  placeholder="Search bank..."
                  value={bankQuery}
                  onChange={e => { setBankQuery(e.target.value); setBankOpen(true); }}
                  onClick={e => e.stopPropagation()}
                />
                <ChevronDown size={16} className={`wd-chevron ${bankOpen ? 'open' : ''}`} />
              </div>
              {bankOpen && (
                <div className="wd-bank-list">
                  {filteredBanks.filter(b => !b.disabled).length === 0
                    ? <div className="wd-bank-empty">No banks found</div>
                    : filteredBanks.map((b, i) =>
                        b.disabled
                          ? <div key={i} className="wd-bank-group-header">{b.label}</div>
                          : <div
                              key={b.label}
                              className={`wd-bank-item ${selectedBank === b.label ? 'selected' : ''}`}
                              onClick={() => { setSelectedBank(b.label); setBankQuery(b.label); setBankOpen(false); }}
                            >
                              {b.label}
                            </div>
                      )
                  }
                </div>
              )}
            </div>

            {/* Account Number */}
            <div className="wd-section-card">
              <div className="wd-field-label">Account Number</div>
              <div className="wd-wallet-display">
                <CreditCard size={16} className="wd-shield-icon" />
                <input
                  className="wd-acct-input"
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit account number"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
                {acctVerifying && <Loader2 size={16} className="spin" style={{ color: '#8aabcc', flexShrink: 0 }} />}
                {!acctVerifying && acctName && <CheckCircle2 size={16} style={{ color: '#1a9e8f', flexShrink: 0 }} />}
                {!acctVerifying && acctError && <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />}
              </div>
              {/* Resolved account name */}
              {acctName && (
                <div className="wd-acct-name">
                  <CheckCircle2 size={13} />
                  {acctName}
                </div>
              )}
              {acctSkipped && (
                <div className="wd-acct-skipped">
                  ℹ️ Auto-verify not available for this bank — please double-check your details
                </div>
              )}
              {acctError && (
                <div className="wd-acct-error">
                  <XCircle size={13} />
                  {acctError}
                </div>
              )}
            </div>

            {/* Bank transfer info */}
            <div className="wd-info-box">
              <Building2 size={20} className="wd-info-icon" />
              <div>
                <div className="wd-info-title">Bank Transfer Details</div>
                <div className="wd-info-text">Funds will be transferred directly to your bank account. Processing time: 5–30 minutes during banking hours.</div>
              </div>
            </div>

            {/* Transaction summary */}
            {parsedAmt > 0 && (
              <div className="wd-summary-card">
                <div className="wd-summary-title"><CreditCard size={15} /> Transaction Summary</div>
                <div className="wd-summary-row">
                  <span>Amount</span>
                  <span>{parsedAmt.toFixed(2)} USD = {ngnAmount.toLocaleString()} NGN</span>
                </div>
                <div className="wd-summary-row">
                  <span>Transfer Fee</span>
                  <span>{FEE_PERCENT}% = {(feeAmt * USD_TO_NGN_RATE).toFixed(2)} NGN</span>
                </div>
                <div className="wd-summary-row total">
                  <span>Total Deduction</span>
                  <span>{ngnReceive.toLocaleString()} NGN</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              className="wd-submit-btn"
              onClick={handleSubmit}
              disabled={loading || !isValid || !selectedBank || accountNumber.length !== 10 || acctVerifying || (!acctName && !acctSkipped)}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Processing…</>
                : <><Building2 size={16} /> Withdraw to Bank</>
              }
            </button>

            {/* Important notice */}
            <div className="wd-notice-box">
              <div className="wd-notice-title"><AlertCircle size={14} /> Important Notice</div>
              <ul className="wd-notice-list">
                <li>Minimum withdrawal: ${MIN_WITHDRAWAL}.00 USD</li>
                <li>Maximum per transaction: ${MAX_WITHDRAWAL.toLocaleString()}.00 USD</li>
                <li>Verify account details before confirming</li>
                <li>Transfers outside banking hours processed next business day</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
