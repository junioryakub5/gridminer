import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Loader2 } from 'lucide-react';
import './admin.css';

export default function AdminLogin() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }             = useApp();
  const navigate              = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const found = await login(email, password);
      if (found.role !== 'admin') {
        setError('This account does not have admin access.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="alp-box">
        <div className="alp-logo">
          <span className="alp-logo-text">Cloud Mining <span>2.0</span></span>
          <span className="alp-logo-sub">Administration Panel</span>
        </div>
        <div className="alp-badge"><ShieldCheck size={14} /> Admin Access Only</div>
        <form className="alp-form" onSubmit={handleLogin}>
          <div className="admin-form-group">
            <label className="admin-form-label">Email Address</label>
            <input className="admin-field" type="email" placeholder="admin@cloudmining.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Password</label>
            <input className="admin-field" type="password" placeholder="Enter admin password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alp-error">{error}</div>}
          <button type="submit" className="alp-submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
            {loading ? 'Authenticating…' : 'Sign In to Admin Panel'}
          </button>
          <p className="alp-hint">For user access, go to the <a href="/login" className="alp-link">main app</a></p>
        </form>
      </div>
    </div>
  );
}
