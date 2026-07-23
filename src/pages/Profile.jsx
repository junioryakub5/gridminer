import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Camera, ChevronRight, Eye, EyeOff, Settings, LogOut,
  UserPen, Lock, Share2, Wallet, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { getApiBase } from '../services/api';

export default function Profile() {
  const { user, logout, uploadAvatar, showToast } = useApp();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('Image must be less than 20MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      showToast('Avatar updated!');
    } catch (err) {
      showToast(err.message || 'Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
      e.target.value = null; // reset
    }
  };

  const settingItems = [
    { label: 'Edit Profile',        Icon: UserPen, path: '/edit-profile',    color: '#0d6e99' },
    { label: 'Change Password',     Icon: Lock,    path: '/change-password', color: '#7c3aed' },
    { label: 'Referral System',     Icon: Share2,  path: '/referral',        color: '#1a9e8f' },
    { label: 'Bind Wallet Address', Icon: Wallet,  path: '/bind-wallet',     color: '#d97706' },
  ];

  return (
    <div className="page">

      {/* Title row */}
      <div className="profile-header">
        <div>
          <h2 className="profile-title">My Profile</h2>
          <p className="page-sub-sm">Manage your account</p>
        </div>
        <button className="icon-btn" onClick={() => navigate('/notifications')}>
          <Bell size={20} />
        </button>
      </div>

      {/* Avatar + name row */}
      <div className="profile-user-row">
        <div className="avatar-wrap" style={{ position: 'relative' }}>
          {user?.avatarUrl ? (
            <img src={`${getApiBase()}${user.avatarUrl}`} alt="Avatar" className="avatar-lg" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="avatar-lg">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
          )}
          {uploadingAvatar && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '50%' }}>
               <Loader2 size={24} className="spin" color="white" />
            </div>
          )}
          <div className="cam-btn" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            <Camera size={10} color="white" />
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
        <div>
          <div className="profile-name">{user?.name}</div>
          <div className="profile-email">{user?.email}</div>
          <span className="tier-badge">Tier {user?.tier}</span>
        </div>
      </div>

      {/* Balance card */}
      <div className="profile-bal-card">
        <div className="pb-top">
          <span className="pb-label">AVAILABLE BALANCE</span>
          <button className="eye-btn" onClick={() => setShowBalance(b => !b)}>
            {showBalance
              ? <Eye size={16} color="rgba(255,255,255,0.75)" />
              : <EyeOff size={16} color="rgba(255,255,255,0.75)" />}
          </button>
        </div>
        <div className="pb-amount">${showBalance ? (user?.balance || 0).toFixed(2) : '••••'}</div>
        <div className="pb-sub">USDT Equivalent</div>
      </div>

      {/* Status / Joined */}
      <div className="profile-stats-row">
        <div className="stat-item">
          <div className="stat-dot-row">
            <span className="dot-green">●</span>
            <span className="stat-label">Status</span>
          </div>
          <div className="stat-val green">Active</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-dot-row">
            <span className="dot-blue">●</span>
            <span className="stat-label">Joined</span>
          </div>
          <div className="stat-val blue">{user?.joined || 'Jul 2026'}</div>
        </div>
      </div>

      {/* Account settings */}
      <div className="settings-section">
        <div className="settings-hd">
          <Settings size={14} color="#0d6e99" /> Account Settings
        </div>
        <div className="settings-list">
          {settingItems.map(({ label, Icon, path, color }) => (
            <div key={label} className="settings-item" onClick={() => navigate(path)}>
              <div className="si-icon-wrap" style={{ background: `${color}18` }}>
                <Icon size={15} color={color} strokeWidth={2} />
              </div>
              <span className="si-label">{label}</span>
              <ChevronRight size={16} color="#c0d8e8" />
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={16} /> Logout
      </button>

      <div className="spacer" />
      <BottomNav />
    </div>
  );
}
