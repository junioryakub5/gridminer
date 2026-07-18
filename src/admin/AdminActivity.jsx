import { useEffect, useState } from 'react';
import { Loader2, Activity, ClipboardList } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AdminLayout from './AdminLayout';

export default function AdminActivity() {
  const { activityLog, loadActivityLog } = useApp();
  const [loading, setLoading] = useState(!activityLog.length);

  useEffect(() => { loadActivityLog().finally(() => setLoading(false)); }, []);

  const getDotColor = (action) => {
    if (action.includes('Approv'))  return '#22c55e';
    if (action.includes('Reject') || action.includes('Delet')) return '#ef4444';
    if (action.includes('Deactivat')) return '#f59e0b';
    if (action.includes('Activat'))   return '#22c55e';
    return '#1a9e8f';
  };

  if (loading) return (
    <AdminLayout title="Activity Log" breadcrumb="Admin › Activity Log">
      <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Loader2 size={32} className="spin" color="#1a9e8f" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Activity Log" breadcrumb="Admin › Activity Log">
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}><Activity size={15} /> Admin Activity Log</span>
          <span style={{ fontSize:12, color:'#7aabcc' }}>{activityLog.length} actions recorded</span>
        </div>
        {activityLog.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon"><ClipboardList size={32} color="#8aabcc" /></div>
            <p>No admin actions recorded yet.</p>
            <p style={{ fontSize:12, marginTop:6 }}>Actions appear after you manage users, transactions, tiers, or settings.</p>
          </div>
        ) : (
          activityLog.map(entry => (
            <div key={entry.id} className="activity-item">
              <div className="activity-dot" style={{ background: getDotColor(entry.action) }} />
              <div style={{ flex:1 }}>
                <div className="activity-action">{entry.action}</div>
                <div className="activity-target">{entry.target}</div>
                <div className="activity-meta">By {entry.actor} · {entry.timestamp}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
