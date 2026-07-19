import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2, Gift } from 'lucide-react';

export default function Register() {
  const [searchParams]    = useSearchParams();
  const [form, setForm]   = useState({
    name: '', email: '', password: '', confirm: '',
    referralCode: searchParams.get('ref') || '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { register }          = useApp();
  const navigate              = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.referralCode.trim() || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page login-page">
      <div className="login-bg"><div className="cloud-deco tl" /><div className="cloud-deco br" /></div>
      <div className="login-container">
        <div className="login-logo">
          <h1 className="logo-text">Gridminer</h1>
          <p className="logo-sub">Create your account</p>
        </div>
        <form className="login-card" onSubmit={handle}>
          <input className="field" placeholder="Full name"                    value={form.name}     onChange={f('name')}     required />
          <input className="field" type="email" placeholder="Email address"   value={form.email}    onChange={f('email')}    required />
          <input className="field" type="password" placeholder="Password (min 6 chars)"    value={form.password} onChange={f('password')} required />
          <input className="field" type="password" placeholder="Confirm password"          value={form.confirm}  onChange={f('confirm')}  required />

          {/* Referral code field */}
          <div style={{ position: 'relative' }}>
            <Gift size={15} style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: '#1a9e8f', pointerEvents: 'none',
            }} />
            <input
              className="field"
              placeholder="Referral code (optional)"
              value={form.referralCode}
              onChange={f('referralCode')}
              style={{ paddingLeft: 38, fontFamily: "'Courier New', monospace", letterSpacing: 1 }}
            />
          </div>
          {form.referralCode.trim() && (
            <p style={{ fontSize: 11.5, color: '#1a9e8f', textAlign: 'center', margin: '-4px 0 0' }}>
              🎉 Referral code applied — your referrer earns 10% of your mining rewards!
            </p>
          )}

          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-grad w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Create Account'}
          </button>
          <div className="register-row">
            <span style={{ fontSize: 13, color: '#7aabcc' }}>Already have an account?</span>
            <button type="button" className="link-accent" onClick={() => navigate('/login')}>Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}
