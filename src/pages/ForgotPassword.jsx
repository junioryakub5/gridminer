import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();

  // step: 1 = enter email, 2 = enter code, 3 = new password, 4 = done
  const [step, setStep]           = useState(1);
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState(['', '', '', '', '', '']);
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const codeRefs = useRef([]);

  /* ── Step 1: send code ── */
  const handleSendCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: OTP input handlers ── */
  const handleCodeInput = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  };
  const handleCodeKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  };
  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
    }
  };
  const codeValue = code.join('');

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (codeValue.length < 6) { setError('Enter all 6 digits.'); return; }
    setError('');
    setStep(3);
  };

  /* ── Step 3: set new password ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)   { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(email, codeValue, password);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Reset failed. Please check your code and try again.');
      if (err.message?.includes('expired') || err.message?.includes('Invalid')) setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : password.length > 0 ? 1 : 0;
  const strengthColors = ['', '#ef4444', '#f59e0b', '#1a9e8f', '#22c55e'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="page login-page">
      <div className="login-bg">
        <div className="cloud-deco tl" />
        <div className="cloud-deco br" />
      </div>
      <div className="login-container">
        <div className="login-logo">
          <h1 className="logo-text">Gridminer</h1>
          <p className="logo-sub">
            {step === 1 && 'Password Recovery'}
            {step === 2 && 'Enter Your Code'}
            {step === 3 && 'Set New Password'}
            {step === 4 && 'All Done'}
          </p>
        </div>

        <div className="login-card">

          {/* ── Step indicator ── */}
          {step < 4 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  flex: 1, height: 3, borderRadius: 3,
                  background: s <= step ? '#1a9e8f' : '#e8f0f7',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}

          {/* ════ STEP 1: Email ════ */}
          {step === 1 && (
            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, margin: '0 0 4px' }}>
                Enter your email and we'll send you a 6-digit code.
              </p>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8aabcc', pointerEvents: 'none' }} />
                <input
                  className="field"
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40 }}
                  required
                />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button type="submit" className="btn-grad w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : 'Send Code'}
              </button>
              <button type="button" className="link-sm" onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <ArrowLeft size={13} /> Back to Login
              </button>
            </form>
          )}

          {/* ════ STEP 2: OTP Code ════ */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,158,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ShieldCheck size={22} color="#1a9e8f" />
                </div>
                <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, margin: 0 }}>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: '#1a2a3a' }}>{email}</strong>
                </p>
              </div>

              {/* OTP boxes */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => codeRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => handleCodeKey(i, e)}
                    style={{
                      width: 44, height: 54, textAlign: 'center',
                      fontSize: 22, fontWeight: 700, color: '#1a2a3a',
                      background: digit ? 'rgba(26,158,143,0.06)' : '#f4f8fc',
                      border: `2px solid ${digit ? '#1a9e8f' : '#dce8f4'}`,
                      borderRadius: 10, outline: 'none',
                      transition: 'border-color 0.15s, background 0.15s',
                      fontFamily: "'Courier New', monospace",
                    }}
                  />
                ))}
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="btn-grad w-full" disabled={codeValue.length < 6}>
                Verify Code
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="link-sm" onClick={() => { setStep(1); setCode(['','','','','','']); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ArrowLeft size={13} /> Change email
                </button>
                <button type="button" className="link-sm" onClick={handleSendCode} disabled={loading}>
                  {loading ? 'Sending…' : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* ════ STEP 3: New Password ════ */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, margin: '0 0 4px' }}>
                Choose a strong new password.
              </p>

              {/* New password */}
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8aabcc', pointerEvents: 'none' }} />
                <input
                  className="field"
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  required
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8aabcc', padding: 4 }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : '#e8f0f7', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: strengthColors[strength], margin: 0, fontWeight: 600 }}>{strengthLabels[strength]}</p>
                </div>
              )}

              {/* Confirm password */}
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8aabcc', pointerEvents: 'none' }} />
                <input
                  className="field"
                  type={showCf ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  required
                />
                <button type="button" onClick={() => setShowCf(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8aabcc', padding: 4 }}>
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="btn-grad w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : 'Update Password'}
              </button>
            </form>
          )}

          {/* ════ STEP 4: Done ════ */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(26,158,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} color="#1a9e8f" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 8 }}>Password updated!</h3>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, marginBottom: 24 }}>
                You can now log in with your new password.
              </p>
              <button className="btn-grad w-full" onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
