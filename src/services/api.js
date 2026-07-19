/* ─────────────────────────────────────────────────────────
   API Service — Gridminer
   All fetch calls to the Express backend go through here.
───────────────────────────────────────────────────────── */

const BASE = '/api';

/* ── Token helpers ── */
export const getToken  = ()    => localStorage.getItem('cm_token');
export const setToken  = (tok) => localStorage.setItem('cm_token', tok);
export const clearToken = ()   => localStorage.removeItem('cm_token');

/* ── Core fetch wrapper ── */
async function request(method, path, body, isFormData = false) {
  const token = getToken();
  const headers = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Server error ${res.status}`);
  return data;
}

const get    = (path)          => request('GET',    path);
const post   = (path, body)    => request('POST',   path, body);
const put    = (path, body)    => request('PUT',    path, body);
const patch  = (path, body)    => request('PATCH',  path, body);
const del    = (path)          => request('DELETE', path);
const upload = (path, form)    => request('POST',   path, form, true);

/* ─────────────────────────────────────────────────────────
   AUTH
───────────────────────────────────────────────────────── */
export const authAPI = {
  login:          (email, password)             => post('/auth/login',           { email, password }),
  register:       (name, email, password, referralCode) => post('/auth/register', { name, email, password, referralCode }),
  me:             ()                         => get('/auth/me'),
  forgotPassword: (email)                    => post('/auth/forgot-password', { email }),
  resetPassword:  (email, code, password)     => post('/auth/reset-password',  { email, code, password }),
};

/* ─────────────────────────────────────────────────────────
   USER
───────────────────────────────────────────────────────── */
export const userAPI = {
  getTransactions: ()                           => get('/user/transactions'),
  mine:            ()                           => post('/user/mine'),
  upgrade: (tier, file, paymentMethod) => {
    const form = new FormData();
    form.append('tier', tier);
    form.append('proof', file);
    if (paymentMethod) form.append('paymentMethod', paymentMethod);
    return upload('/user/upgrade', form);
  },
  withdraw:        (address, amount)            => post('/user/withdraw',  { address, amount }),
  updateProfile:   (name, email)                => put('/user/profile',    { name, email }),
  changePassword:  (currentPassword, newPassword) => put('/user/password', { currentPassword, newPassword }),
  saveWallet:      (address)                    => put('/user/wallet',     { address }),
};

/* ─────────────────────────────────────────────────────────
   PUBLIC (no auth)
───────────────────────────────────────────────────────── */
export const publicAPI = {
  getTiers:    () => get('/public/tiers'),
  getSettings: () => get('/public/settings'),
};

/* ─────────────────────────────────────────────────────────
   ADMIN
───────────────────────────────────────────────────────── */
export const adminAPI = {
  /* Stats */
  getStats: () => get('/admin/stats'),

  /* Users */
  getUsers:        (params = {}) => get(`/admin/users?${new URLSearchParams(params)}`),
  updateUser:      (id, data)    => put(`/admin/users/${id}`, data),
  deleteUser:      (id)          => del(`/admin/users/${id}`),
  toggleStatus:    (id)          => patch(`/admin/users/${id}/status`),
  resetBalance:    (id)          => patch(`/admin/users/${id}/balance`),

  /* Transactions */
  getTransactions:      (params = {}) => get(`/admin/transactions?${new URLSearchParams(params)}`),
  getTransactionDetail: (id)          => get(`/admin/transactions/${id}`),
  approveUpgrade:       (id)          => patch(`/admin/transactions/${id}/approve`),
  rejectUpgrade:        (id)          => patch(`/admin/transactions/${id}/reject`),
  updateTxStatus:       (id, status)  => patch(`/admin/transactions/${id}/status`, { status }),
  deleteTransaction:    (id)          => del(`/admin/transactions/${id}`),

  /* Tiers */
  getTiers:    ()           => get('/admin/tiers'),
  updateTier:  (tier, data) => put(`/admin/tiers/${tier}`, data),

  /* Settings */
  getSettings:    ()     => get('/admin/settings'),
  updateSettings: (data) => put('/admin/settings', data),

  /* Activity */
  getActivity: () => get('/admin/activity'),
};
