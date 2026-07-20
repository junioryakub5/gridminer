import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Upload, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

export default function Deposit() {
  const { type }   = useParams();
  const navigate   = useNavigate();
  const { selectedTier, addUpgradeTransaction, showToast, settings } = useApp();

  const [preview, setPreview] = useState(null);
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const WALLET = settings?.usdtWallet || '';
  const BANK   = settings?.nairaBank  || {};
  const MOMO   = settings?.cedisBank  || {};

  const isUSDT  = type === 'usdt';
  const isNaira = type === 'naira';
  const isCedis = type === 'cedis';

  const title  = isUSDT ? 'USDT Deposit' : isNaira ? 'Naira Bank Transfer' : 'Cedis Bank Transfer';
  const amount = isUSDT
    ? `${selectedTier?.priceUSD?.toFixed(2) || '0.00'} USDT`
    : isNaira
    ? `₦${selectedTier?.priceNGN?.toLocaleString() || '0'}.00`
    : `₵${selectedTier?.priceGHS?.toLocaleString() || '0'}.00`;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!file) { showToast('Please upload a payment screenshot'); return; }
    if (!selectedTier) { showToast('No tier selected'); return; }
    setLoading(true);
    try {
      await addUpgradeTransaction(selectedTier.tier, file, type); // type = 'usdt' | 'naira' | 'cedis'
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
  };

  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate('/payment-method')}><ChevronLeft size={20} /></button>
        <h2 className="inner-title">{title}</h2>
        <div />
      </div>

      <div className="dep-tier-label">Upgrade to Tier {selectedTier?.tier || 2}</div>

      <div className="dep-amount-row">
        <span className="dep-am-label">{isUSDT ? 'USDT Amount to Pay' : 'Amount to Pay'}</span>
        <span className="dep-am-val teal">{amount}</span>
      </div>

      {isUSDT && (
        <div className="usdt-addr-card">
          <div className="uac-label">USDT TRC20 Wallet Address</div>
          <div className="uac-addr">{WALLET || 'Loading…'}</div>
          <button className="uac-copy" onClick={() => copyText(WALLET)}>
            <Copy size={14} /> Copy Address
          </button>
        </div>
      )}

      {(isNaira || isCedis) && (
        <div className="bank-card">
          <div className="bank-card-title">{isNaira ? 'Bank Transfer Details' : 'Mobile Money Details'}</div>
          {[
            { label: isNaira ? 'Bank Name' : 'Network',      val: isNaira ? BANK.name    : MOMO.name },
            { label: 'Account Name',                           val: isNaira ? BANK.account : MOMO.account },
            { label: isNaira ? 'Account Number' : 'Number',   val: isNaira ? BANK.number  : MOMO.number, copy: true },
          ].map(row => (
            <div key={row.label} className="bank-row">
              <span className="bank-label">{row.label}</span>
              <span className="bank-val">
                {row.val}
                {row.copy && <button className="copy-inline" onClick={() => copyText(row.val)}><Copy size={12} /></button>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="upload-section">
        <div className="upload-title">Upload Payment Screenshot</div>
        <div className="upload-area" onClick={() => fileRef.current.click()}>
          <Upload size={36} color="#2196F3" />
          <span className="upload-text">Tap to upload screenshot</span>
          <span className="upload-hint">PNG, JPG up to 5MB</span>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {preview && <img className="upload-preview" src={preview} alt="Payment proof" />}
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? <><Loader2 size={14} className="spin" /> Submitting…</> : '⏱ Submit Upgrade Request'}
      </button>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
