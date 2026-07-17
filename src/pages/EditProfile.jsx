import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function EditProfile() {
  const { user, updateProfile, showToast } = useApp();
  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(name, email);
      navigate('/profile');
    } catch (err) {
      showToast(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="inner-header">
        <button className="back-btn" onClick={() => navigate('/profile')}><ChevronLeft size={20} /></button>
        <h2 className="inner-title">Edit Profile</h2>
        <div />
      </div>
      <form className="section-card mt-16" onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="field" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="btn-solid w-full" disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
