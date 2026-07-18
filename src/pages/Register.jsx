import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
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
      await register(form.name, form.email, form.password);
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
          <input className="field" placeholder="Full name"        value={form.name}     onChange={f('name')}     required />
          <input className="field" type="email" placeholder="Email address" value={form.email} onChange={f('email')}    required />
          <input className="field" type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={f('password')} required />
          <input className="field" type="password" placeholder="Confirm password" value={form.confirm}  onChange={f('confirm')}  required />
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-grad w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Create Account'}
          </button>
          <p className="link-sm">Already have an account? <button type="button" className="link-accent" onClick={() => navigate('/login')}>Login</button></p>
        </form>
      </div>
    </div>
  );
}
