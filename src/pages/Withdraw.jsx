import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, AlertCircle, Loader2, Wallet, Building2,
  ChevronDown, ShieldCheck, CreditCard, Search, CheckCircle2, XCircle,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { userAPI } from '../services/api';

/* ── Banks list (Nigeria + Ghana banks only — no MoMo here) ── */
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
];

/* ── Mobile Money networks ── */
const MOMO_NETWORKS = [
  { label: '🇳🇬 Nigeria', disabled: true },
  { label: 'MTN Nigeria MoMo' },
  { label: 'Airtel Money Nigeria' },
  { label: '🇬🇭 Ghana', disabled: true },
  { label: 'MTN Mobile Money (MoMo)' },
  { label: 'Vodafone Cash' },
  { label: 'AirtelTigo Money' },
  { label: '🌍 Other', disabled: true },
  { label: 'M-Pesa' },
  { label: 'Orange Money' },
  { label: 'Wave' },
];

const MIN_WITHDRAWAL  = 10;
const MAX_WITHDRAWAL  = 10000;
const USD_TO_NGN_RATE = 1550;
const USD_TO_GHS_RATE = 15.2;
const FEE_PERCENT     = 0;

const GHANA_BANK_LABELS = [
  'Absa Bank Ghana', 'Access Bank Ghana', 'Agricultural Development Bank',
  'CalBank', 'Consolidated Bank Ghana', 'Ecobank Ghana', 'Fidelity Bank Ghana',
  'First Atlantic Bank', 'First National Bank Ghana', 'GCB Bank',
  'Guaranty Trust Bank Ghana', 'National Investment Bank', 'OmniBank Ghana',
  'Prudential Bank Ghana', 'Republic Bank Ghana', 'Société Générale Ghana',
  'Stanbic Bank Ghana', 'Standard Chartered Bank Ghana',
  'United Bank for Africa Ghana', 'Universal Merchant Bank', 'Zenith Bank Ghana',
  'MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money',
];
const isGhanaBank = (name) => GHANA_BANK_LABELS.some(b => name?.startsWith(b));

export default function Withdraw() {
  const { user, submitWithdrawal, showToast } = useApp();
  const navigate = useNavigate();

  /* ── tab: 'crypto' | 'bank' | 'momo' ── */
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

  /* ── mobile money ── */
  const [momoNetwork,   setMomoNetwork]   = useState('');
  const [momoQuery,     setMomoQuery]     = useState('');
  const [momoOpen,      setMomoOpen]      = useState(false);
  const [momoPhone,     setMomoPhone]     = useState('');

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
            setAcctSkipped(true);
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
  const isGhana     = tab === 'bank' ? isGhanaBank(selectedBank) : ['MTN Mobile Money (MoMo)', 'Vodafone Cash', 'AirtelTigo Money'].some(n => momoNetwork?.startsWith(n));
  const localRate   = isGhana ? USD_TO_GHS_RATE : USD_TO_NGN_RATE;
  const localSymbol = isGhana ? '₵' : '₦';
  const localCode   = isGhana ? 'GHS' : 'NGN';
  const localAmount  = +(parsedAmt   * localRate).toFixed(2);
  const localReceive = +(youReceive  * localRate).toFixed(2);
  const localFee     = +(feeAmt      * localRate).toFixed(2);
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

  /* ── momo search ── */
  const filteredMomo = momoQuery.trim()
    ? MOMO_NETWORKS.filter(n => !n.disabled && n.label.toLowerCase().includes(momoQuery.toLowerCase()))
    : MOMO_NETWORKS;

  /* ── reset fields when switching tab ── */
  const switchTab = (t) => {
    setTab(t);
    setAmount('');
    setBankQuery(''); setSelectedBank(''); setBankOpen(false); setAccountNumber('');
    setAcctName(''); setAcctError(''); setAcctSkipped(false);
    setMomoNetwork(''); setMomoQuery(''); setMomoOpen(false); setMomoPhone('');
  };

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
    } else if (tab === 'bank') {
      if (!selectedBank)                    return showToast('Please select a bank');
      if (!/^\d{6,19}$/.test(accountNumber)) return showToast('Account number must be between 6 and 19 digits');
      if (acctVerifying)                    return showToast('Verifying account, please wait...');
      if (!acctName && !acctSkipped)        return showToast('Please wait for account verification');
    } else if (tab === 'momo') {
      if (!momoNetwork) return showToast('Please select a Mobile Money network');
      if (!/^\+?\d{7,15}$/.test(momoPhone.replace(/\s/g, ''))) return showToast('Please enter a valid phone number');
    }

    setLoading(true);
    try {
      await submitWithdrawal(
        tab === 'crypto' ? walletAddr : '',
        parsedAmt,
        tab,
        tab === 'bank' ? selectedBank : tab === 'momo' ? momoNetwork : '',
        tab === 'bank' ? accountNumber : tab === 'momo' ? momoPhone : '',
      );
      setAmount('');
      setSelectedBank(''); setBankQuery(''); setAccountNumber('');
      setAcctName(''); setAcctError(''); setAcctSkipped(false);
      setMomoNetwork(''); setMomoQuery(''); setMomoPhone('');
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
        {/* Tabs — now 3 */}
        <div className="wd-tabs">
          <button className={`wd-tab ${tab === 'crypto' ? 'active' : ''}`} onClick={() => switchTab('crypto')}>
            Crypto
          </button>
          <button className={`wd-tab ${tab === 'bank' ? 'active' : ''}`} onClick={() => switchTab('bank')}>
            Bank Transfer
          </button>
          <button className={`wd-tab ${tab === 'momo' ? 'active' : ''}`} onClick={() => switchTab('momo')}>
            Mobile Money
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

            <div className="wd-info-box">
              <ShieldCheck size={20} className="wd-info-icon" />
              <div>
                <div className="wd-info-title">Network Information</div>
                <div className="wd-info-text">Withdrawals processed on TRC20 network. Ensure your wallet supports USDT-TRC20.</div>
              </div>
            </div>

            {parsedAmt > 0 && (
              <div className="wd-summary-card">
                <div className="wd-summary-title"><CreditCard size={15} /> Withdrawal Fees</div>
                <div className="wd-summary-row"><span>Amount</span><span>{parsedAmt.toFixed(2)} USDT</span></div>
                <div className="wd-summary-row"><span>Network Fee</span><span>{FEE_PERCENT}% = {feeAmt.toFixed(2)} USDT</span></div>
                <div className="wd-summary-row total"><span>You Receive</span><span>{youReceive.toFixed(2)} USDT</span></div>
              </div>
            )}

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
                  maxLength={19}
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
                />
                {acctVerifying && <Loader2 size={16} className="spin" style={{ color: '#8aabcc', flexShrink: 0 }} />}
                {!acctVerifying && acctName && <CheckCircle2 size={16} style={{ color: '#1a9e8f', flexShrink: 0 }} />}
                {!acctVerifying && acctError && <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />}
              </div>
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

            <div className="wd-info-box">
              <Building2 size={20} className="wd-info-icon" />
              <div>
                <div className="wd-info-title">Bank Transfer Details</div>
                <div className="wd-info-text">Funds will be transferred directly to your bank account. Processing time: 5–30 minutes during banking hours.</div>
              </div>
            </div>

            {parsedAmt > 0 && (
              <div className="wd-summary-card">
                <div className="wd-summary-title"><CreditCard size={15} /> Transaction Summary</div>
                <div className="wd-summary-row">
                  <span>Amount</span>
                  <span>{parsedAmt.toFixed(2)} USD = {localSymbol}{localAmount.toLocaleString()} {localCode}</span>
                </div>
                <div className="wd-summary-row">
                  <span>Transfer Fee</span>
                  <span>{FEE_PERCENT}% = {localSymbol}{localFee.toFixed(2)} {localCode}</span>
                </div>
                <div className="wd-summary-row total">
                  <span>Total Deduction</span>
                  <span>{localSymbol}{localReceive.toLocaleString()} {localCode}</span>
                </div>
              </div>
            )}

            <button
              className="wd-submit-btn"
              onClick={handleSubmit}
              disabled={loading || !isValid || !selectedBank || accountNumber.length < 6 || acctVerifying || (!acctName && !acctSkipped)}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Processing…</>
                : <><Building2 size={16} /> Withdraw to Bank</>
              }
            </button>

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

        {/* ─── MOBILE MONEY TAB ─── */}
        {tab === 'momo' && (
          <>
            {/* Select Network */}
            <div className="wd-section-card">
              <div className="wd-field-label">Select Network</div>
              <div className="wd-bank-dropdown" onClick={() => setMomoOpen(o => !o)}>
                <Smartphone size={15} className="wd-search-icon" />
                <input
                  className="wd-bank-search"
                  placeholder="Search network..."
                  value={momoQuery}
                  onChange={e => { setMomoQuery(e.target.value); setMomoOpen(true); }}
                  onClick={e => e.stopPropagation()}
                />
                <ChevronDown size={16} className={`wd-chevron ${momoOpen ? 'open' : ''}`} />
              </div>
              {momoOpen && (
                <div className="wd-bank-list">
                  {filteredMomo.filter(n => !n.disabled).length === 0
                    ? <div className="wd-bank-empty">No networks found</div>
                    : filteredMomo.map((n, i) =>
                        n.disabled
                          ? <div key={i} className="wd-bank-group-header">{n.label}</div>
                          : <div
                              key={n.label}
                              className={`wd-bank-item ${momoNetwork === n.label ? 'selected' : ''}`}
                              onClick={() => { setMomoNetwork(n.label); setMomoQuery(n.label); setMomoOpen(false); }}
                            >
                              {n.label}
                            </div>
                      )
                  }
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="wd-section-card">
              <div className="wd-field-label">Mobile Money Phone Number</div>
              <div className="wd-wallet-display">
                <Smartphone size={16} className="wd-shield-icon" />
                <input
                  className="wd-acct-input"
                  type="tel"
                  maxLength={16}
                  placeholder="e.g. +233 24 000 0000"
                  value={momoPhone}
                  onChange={e => setMomoPhone(e.target.value.replace(/[^\d\s+]/g, '').slice(0, 16))}
                />
              </div>
            </div>

            <div className="wd-info-box">
              <Smartphone size={20} className="wd-info-icon" />
              <div>
                <div className="wd-info-title">Mobile Money Transfer</div>
                <div className="wd-info-text">Funds will be sent directly to your mobile wallet. Ensure the phone number is registered on the selected network. Processing time: 5–15 minutes.</div>
              </div>
            </div>

            {parsedAmt > 0 && (
              <div className="wd-summary-card">
                <div className="wd-summary-title"><Smartphone size={15} /> Transaction Summary</div>
                <div className="wd-summary-row">
                  <span>Amount</span>
                  <span>{parsedAmt.toFixed(2)} USD = {localSymbol}{localAmount.toLocaleString()} {localCode}</span>
                </div>
                <div className="wd-summary-row">
                  <span>Transfer Fee</span>
                  <span>{FEE_PERCENT}% = {localSymbol}{localFee.toFixed(2)} {localCode}</span>
                </div>
                <div className="wd-summary-row total">
                  <span>You Receive</span>
                  <span>{localSymbol}{localReceive.toLocaleString()} {localCode}</span>
                </div>
              </div>
            )}

            <button
              className="wd-submit-btn"
              onClick={handleSubmit}
              disabled={loading || !isValid || !momoNetwork || momoPhone.replace(/\s/g, '').length < 7}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Processing…</>
                : <><Smartphone size={16} /> Withdraw via Mobile Money</>
              }
            </button>

            <div className="wd-notice-box">
              <div className="wd-notice-title"><AlertCircle size={14} /> Important Notice</div>
              <ul className="wd-notice-list">
                <li>Minimum withdrawal: ${MIN_WITHDRAWAL}.00 USD</li>
                <li>Maximum per transaction: ${MAX_WITHDRAWAL.toLocaleString()}.00 USD</li>
                <li>Phone number must be registered on the selected network</li>
                <li>Double-check your number before submitting</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
