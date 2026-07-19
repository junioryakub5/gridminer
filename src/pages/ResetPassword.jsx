import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new reset link.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.');                 return; }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="login-bg">
        <div className="cloud-deco tl" />
        <div className="cloud-deco br" />
      </div>
      <div className="login-container">
        <div className="login-logo">
          <h1 className="logo-text">Gridminer</h1>
          <p className="logo-sub">Set New Password</p>
        </div>

        <div className="login-card">
          {success ? (
            /* ── Success ── */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(26,158,143,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle size={28} color="#1a9e8f" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 8 }}>
                Password updated!
              </h3>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, marginBottom: 24 }}>
                Your password has been changed successfully. You can now log in with your new password.
              </p>
              <button className="btn-grad w-full" onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          ) : !token ? (
            /* ── Invalid token ── */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <XCircle size={28} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 8 }}>
                Invalid Reset Link
              </h3>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, marginBottom: 24 }}>
                This link is invalid or has already been used. Please request a new one.
              </p>
              <button className="btn-grad w-full" onClick={() => navigate('/forgot-password')}>
                Request New Link
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, margin: '0 0 4px' }}>
                Choose a strong password with at least 6 characters.
              </p>

              {/* New password */}
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: '#8aabcc', pointerEvents: 'none',
                }} />
                <input
                  className="field"
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#8aabcc', padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Confirm password */}
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: '#8aabcc', pointerEvents: 'none',
                }} />
                <input
                  className="field"
                  type={showCf ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCf(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#8aabcc', padding: 4,
                  }}
                >
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div style={{ display: 'flex', gap: 4, marginTop: -4 }}>
                  {[...Array(4)].map((_, i) => {
                    const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : 1;
                    const colors = ['#ef4444', '#f59e0b', '#1a9e8f', '#22c55e'];
                    return (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i < strength ? colors[strength - 1] : '#e8f0f7',
                        transition: 'background 0.2s',
                      }} />
                    );
                  })}
                </div>
              )}

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="btn-grad w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
