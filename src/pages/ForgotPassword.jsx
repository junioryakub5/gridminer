import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
          <p className="logo-sub">Password Recovery</p>
        </div>

        <div className="login-card">
          {sent ? (
            /* ── Success state ── */
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
                Check your inbox
              </h3>
              <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, marginBottom: 24 }}>
                If <strong style={{ color: '#1a2a3a' }}>{email}</strong> is registered,
                you'll receive a reset link shortly. Check your spam folder if you don't see it.
              </p>
              <button
                className="btn-grad w-full"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ marginBottom: 4 }}>
                <p style={{ fontSize: 13, color: '#7aabcc', lineHeight: 1.6, margin: 0 }}>
                  Enter your account email and we'll send you a link to reset your password.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: '#8aabcc',
                  pointerEvents: 'none',
                }} />
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
                {loading ? <Loader2 size={16} className="spin" /> : 'Send Reset Link'}
              </button>

              <button
                type="button"
                className="link-sm"
                onClick={() => navigate('/login')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <ArrowLeft size={13} /> Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
