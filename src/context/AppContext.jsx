import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, userAPI, adminAPI, publicAPI, setToken, clearToken, getToken } from '../services/api.js';
import { scheduleMineNotifications, cancelMineNotifications, checkAndNotifyStatusChanges } from '../hooks/useNotifications.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  /* ── Core state ── */
  const [user,         setUser]         = useState(null);
  const [authLoading,  setAuthLoading]  = useState(true);   // true while JWT is being validated
  const [toast,        setToast]        = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tiers,        setTiers]        = useState([]);
  const [settings,     setSettings]     = useState(null);
  const [canMine,      setCanMine]      = useState(true);

  /* ── Admin state ── */
  const [allUsers,      setAllUsers]      = useState([]);
  const [allTransactions,setAllTransactions]= useState([]);
  const [activityLog,  setActivityLog]   = useState([]);
  const [stats,        setStats]         = useState(null);

  /* ─────────────────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────────────────── */
  const showToast = (msg, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  const updateMineAvailability = useCallback((lastMinedAt) => {
    if (!lastMinedAt) { setCanMine(true); return; }
    const elapsed   = Date.now() - new Date(lastMinedAt).getTime();
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    if (remaining <= 0) {
      setCanMine(true);
    } else {
      setCanMine(false);
      setTimeout(() => setCanMine(true), remaining);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────
     BOOT — validate stored JWT on page load
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) { setAuthLoading(false); return; }

      try {
        const { user: me } = await authAPI.me();
        setUser(me);
        updateMineAvailability(me.lastMinedAt);
        scheduleMineNotifications(me.lastMinedAt);

        // Load user's own transactions
        const txs = await userAPI.getTransactions();
        setTransactions(txs);
        checkAndNotifyStatusChanges(txs);
      } catch {
        clearToken(); // expired or invalid
      } finally {
        setAuthLoading(false);
      }
    };

    // Always load public data (tiers + settings for upgrade/deposit pages)
    const loadPublic = async () => {
      try {
        const [t, s] = await Promise.all([publicAPI.getTiers(), publicAPI.getSettings()]);
        setTiers(t);
        setSettings(s);
      } catch { /* silently fail */ }
    };

    init();
    loadPublic();
  }, [updateMineAvailability]);

  /* ─────────────────────────────────────────────────────────
     AUTH
  ───────────────────────────────────────────────────────── */
  const login = async (email, password) => {
    const data = await authAPI.login(email, password); // throws on error
    setToken(data.token);
    setUser(data.user);
    updateMineAvailability(data.user.lastMinedAt);
    scheduleMineNotifications(data.user.lastMinedAt);

    // Eagerly load transactions
    try {
      const txs = await userAPI.getTransactions();
      setTransactions(txs);
      checkAndNotifyStatusChanges(txs);
    } catch { /* non-fatal */ }

    return data.user;
  };

  const logout = () => {
    clearToken();
    cancelMineNotifications();
    setUser(null);
    setTransactions([]);
    setAllUsers([]);
    setAllTransactions([]);
    setActivityLog([]);
    setStats(null);
  };

  const register = async (name, email, password, referralCode) => {
    const data = await authAPI.register(name, email, password, referralCode);
    setToken(data.token);
    setUser(data.user);
    setTransactions([]);
    return data.user;
  };

  /* ─────────────────────────────────────────────────────────
     USER ACTIONS
  ───────────────────────────────────────────────────────── */
  const mine = async () => {
    const data = await userAPI.mine();
    setUser(prev => ({ ...prev, balance: data.balance, lastMinedAt: new Date().toISOString() }));
    setCanMine(false);
    setTimeout(() => setCanMine(true), 24 * 60 * 60 * 1000);
    scheduleMineNotifications(new Date().toISOString());
    // Reload transactions so the new mining entry appears
    try {
      const txs = await userAPI.getTransactions();
      setTransactions(txs);
      checkAndNotifyStatusChanges(txs);
    } catch { /* non-fatal */ }
    return data.earned;
  };

  const saveWallet = async (address) => {
    const data = await userAPI.saveWallet(address);
    setUser(data.user);
    showToast('Wallet address saved successfully!');
    const txs = await userAPI.getTransactions().catch(() => transactions);
    setTransactions(txs);
  };

  const updateProfile = async (name, email) => {
    const data = await userAPI.updateProfile(name, email);
    setUser(data.user);
    showToast('Profile updated successfully!');
  };

  const changePassword = async (currentPassword, newPassword) => {
    await userAPI.changePassword(currentPassword, newPassword);
    showToast('Password changed successfully!');
  };

  const addUpgradeTransaction = async (tierNum, file, paymentMethod) => {
    await userAPI.upgrade(tierNum, file, paymentMethod);
    showToast('Upgrade request submitted! Pending admin verification.');
    try {
      const txs = await userAPI.getTransactions();
      setTransactions(txs);
      checkAndNotifyStatusChanges(txs);
    } catch { /* non-fatal */ }
  };

  const submitWithdrawal = async (address, amount, method, bankName, accountNumber) => {
    const data = await userAPI.withdraw(address, amount, method, bankName, accountNumber);
    setUser(prev => ({ ...prev, balance: data.balance }));
    showToast('Withdrawal request submitted!');
    try {
      const txs = await userAPI.getTransactions();
      setTransactions(txs);
      checkAndNotifyStatusChanges(txs);
    } catch { /* non-fatal */ }
  };

  /* ─────────────────────────────────────────────────────────
     ADMIN LOADERS (called by admin pages on mount)
  ───────────────────────────────────────────────────────── */
  const loadAdminStats  = async () => { const s = await adminAPI.getStats(); setStats(s); return s; };
  const loadAdminUsers  = async (params) => { const u = await adminAPI.getUsers(params); setAllUsers(u); return u; };
  const loadAdminTxs    = async (params) => { const t = await adminAPI.getTransactions(params); setAllTransactions(t); return t; };
  const loadAdminTiers  = async () => { const t = await adminAPI.getTiers(); setTiers(t); return t; };
  const loadAdminSettings=async () => { const s = await adminAPI.getSettings(); setSettings(s); return s; };
  const loadActivityLog  = async () => { const a = await adminAPI.getActivity(); setActivityLog(a); return a; };

  /* ─────────────────────────────────────────────────────────
     ADMIN MUTATIONS
  ───────────────────────────────────────────────────────── */
  const adminUpdateUser = async (id, changes) => {
    await adminAPI.updateUser(id, changes);
    await loadAdminUsers();
    showToast('User updated successfully!');
  };

  const adminDeleteUser = async (id) => {
    await adminAPI.deleteUser(id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    setAllTransactions(prev => prev.filter(t => t.userId !== id));
    showToast('User deleted.');
  };

  const adminToggleUserStatus = async (id) => {
    const data = await adminAPI.toggleStatus(id);
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, status: data.status } : u));
    showToast(`User ${data.status === 'active' ? 'activated' : 'deactivated'}.`);
  };

  const adminResetBalance = async (id) => {
    await adminAPI.resetBalance(id);
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, balance: 0 } : u));
    showToast('Balance reset to $0.');
  };

  const adminApproveUpgrade = async (txId) => {
    const data = await adminAPI.approveUpgrade(txId);
    setAllTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'completed' } : t));
    if (data.newTier) {
      const tx = allTransactions.find(t => t.id === txId);
      if (tx) setAllUsers(prev => prev.map(u => u.id === tx.userId ? { ...u, tier: data.newTier } : u));
    }
    await Promise.all([loadAdminStats(), loadAdminUsers()]);
    showToast('Upgrade approved & user tier updated!');
  };

  const adminRejectUpgrade = async (txId) => {
    await adminAPI.rejectUpgrade(txId);
    setAllTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'failed' } : t));
    await loadAdminStats();
    showToast('Upgrade request rejected.');
  };

  const adminDeleteTransaction = async (txId) => {
    await adminAPI.deleteTransaction(txId);
    setAllTransactions(prev => prev.filter(t => t.id !== txId));
    await loadAdminStats();
    showToast('Transaction deleted.');
  };

  const adminUpdateTransactionStatus = async (txId, status) => {
    await adminAPI.updateTxStatus(txId, status);
    setAllTransactions(prev => prev.map(t => t.id === txId ? { ...t, status } : t));
    await loadAdminStats();
  };

  const adminUpdateTier = async (tierNum, changes) => {
    await adminAPI.updateTier(tierNum, changes);
    setTiers(prev => prev.map(t => t.tier === tierNum ? { ...t, ...changes } : t));
    showToast(`Tier ${tierNum} updated!`);
  };

  const adminUpdateSettings = async (changes) => {
    await adminAPI.updateSettings(changes);
    setSettings(changes);
    showToast('Payment settings saved!');
  };

  /* ─────────────────────────────────────────────────────────
     CONTEXT VALUE
  ───────────────────────────────────────────────────────── */
  return (
    <AppContext.Provider value={{
      /* auth */
      user, authLoading, login, logout, register,

      /* user actions */
      mine, canMine, saveWallet, updateProfile, changePassword,
      addUpgradeTransaction, submitWithdrawal,

      /* user data */
      transactions, toast, showToast,
      selectedTier, setSelectedTier,
      TIER_DATA: tiers, settings,

      /* admin data */
      allUsers, allTransactions, tiers, activityLog, stats,

      /* admin loaders */
      loadAdminStats, loadAdminUsers, loadAdminTxs,
      loadAdminTiers, loadAdminSettings, loadActivityLog,

      /* admin mutations */
      adminUpdateUser, adminDeleteUser, adminToggleUserStatus, adminResetBalance,
      adminApproveUpgrade, adminRejectUpgrade, adminDeleteTransaction, adminUpdateTransactionStatus,
      adminUpdateTier, adminUpdateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
