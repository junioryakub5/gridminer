import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Play, Loader2 } from 'lucide-react';

export default function Login() {
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
      navigate(found.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
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
          <p className="logo-sub">Secure TRC20 Network</p>
        </div>
        <form className="login-card" onSubmit={handleLogin}>
          <input className="field" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-grad w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : 'Login'}
          </button>
          <button type="button" className="video-pill" onClick={() => navigate('/tutorials')}>
            <span className="pill-play"><Play size={10} fill="white" /></span>
            New here? Start with this video
          </button>
          <p className="hint-text">Start here to understand how everything works</p>
          <button type="button" className="link-sm" onClick={() => navigate('/forgot-password')}>Forgot Password?</button>
          <div className="register-row">
            <span style={{ fontSize: 13, color: '#7aabcc' }}>Don't have an account?</span>
            <button type="button" className="link-accent" onClick={() => navigate('/register')}>Create Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}
