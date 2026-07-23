import { Router } from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = Router();
router.use(verifyToken, adminOnly);

/* ── Helper: log admin action ── */
const logActivity = async (actorId, actorName, action, target = '') => {
  try {
    await pool.query(
      'INSERT INTO activity_log (actor_id, actor_name, action, target) VALUES ($1, $2, $3, $4)',
      [actorId, actorName, action, target]
    );
  } catch (err) {
    console.error('logActivity error:', err.message);
  }
};

const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  tier: u.tier, balance: parseFloat(u.balance),
  walletAddress: u.wallet_address,
  status: u.status, lastMinedAt: u.last_mined_at, referralCode: u.referral_code,
  avatarUrl: u.avatar_url || null,
  joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
});

const safeTx = (tx) => ({
  id: tx.id, userId: tx.user_id, type: tx.type, label: tx.label,
  amount: parseFloat(tx.amount), status: tx.status, proofImage: tx.proof_image,
  paymentMethod: tx.payment_method, tierTarget: tx.tier_target,
  date: new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  createdAt: tx.created_at,
});

/* ─────────────────────────────────────────────────────────
   STATS
───────────────────────────────────────────────────────── */
router.get('/stats', async (req, res) => {
  try {
    const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
      pool.query("SELECT COUNT(*) AS c FROM users WHERE role != 'admin'"),
      pool.query("SELECT COUNT(*) AS c FROM users WHERE role != 'admin' AND status = 'active'"),
      pool.query("SELECT COALESCE(SUM(balance),0) AS s FROM users WHERE role != 'admin'"),
      pool.query("SELECT COUNT(*) AS c FROM transactions WHERE type = 'upgrades' AND status = 'pending'"),
      pool.query("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE type = 'mining' AND status = 'completed'"),
      pool.query("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE type = 'withdrawals' AND status = 'completed'"),
      pool.query('SELECT COUNT(*) AS c FROM transactions'),
    ]);
    res.json({
      totalUsers:       parseInt(r1.rows[0].c),
      activeUsers:      parseInt(r2.rows[0].c),
      totalBalance:     parseFloat(r3.rows[0].s),
      pendingUpgrades:  parseInt(r4.rows[0].c),
      totalMiningPaid:  parseFloat(r5.rows[0].s),
      totalWithdrawals: parseFloat(r6.rows[0].s),
      totalTransactions:parseInt(r7.rows[0].c),
    });
  } catch (err) {
    console.error('GET /admin/stats:', err.message);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

/* ─────────────────────────────────────────────────────────
   USERS
───────────────────────────────────────────────────────── */
router.get('/users', async (req, res) => {
  try {
    const { search = '', role = 'all', status = 'all', tier = 'all' } = req.query;
    let query  = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    let pi = 1;

    if (search) {
      query += ` AND (name ILIKE $${pi} OR email ILIKE $${pi + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      pi += 2;
    }
    if (role !== 'all')   { query += ` AND role = $${pi++}`;         params.push(role); }
    if (status !== 'all') { query += ` AND status = $${pi++}`;       params.push(status); }
    if (tier !== 'all')   { query += ` AND tier = $${pi++}`;         params.push(parseInt(tier)); }
    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows.map(safeUser));
  } catch (err) {
    console.error('GET /admin/users:', err.message);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, tier, balance, walletAddress } = req.body;
    const userId = parseInt(req.params.id);
    const emailLower = email.toLowerCase().trim();

    const { rows: existing } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!existing[0]) return res.status(404).json({ message: 'User not found' });

    const { rows } = await pool.query(
      'UPDATE users SET name=$1, email=$2, tier=$3, balance=$4, wallet_address=$5 WHERE id=$6 RETURNING *',
      [name, emailLower, parseInt(tier), parseFloat(balance), walletAddress, userId]
    );
    await logActivity(req.user.id, req.user.name, 'Updated user', name);
    res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    console.error('PUT /admin/users/:id:', err.message);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin accounts' });

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await logActivity(req.user.id, req.user.name, 'Deleted user', user.name);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /admin/users/:id:', err.message);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [newStatus, userId]);
    await logActivity(req.user.id, req.user.name, `${newStatus === 'active' ? 'Activated' : 'Deactivated'} user`, user.name);
    res.json({ status: newStatus });
  } catch (err) {
    console.error('PATCH /admin/users/:id/status:', err.message);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

router.patch('/users/:id/balance', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    await pool.query('UPDATE users SET balance = 0 WHERE id = $1', [userId]);
    await logActivity(req.user.id, req.user.name, 'Reset balance to 0', user.name);
    res.json({ message: 'Balance reset' });
  } catch (err) {
    console.error('PATCH /admin/users/:id/balance:', err.message);
    res.status(500).json({ message: 'Failed to reset balance' });
  }
});

/* ─────────────────────────────────────────────────────────
   TRANSACTIONS
───────────────────────────────────────────────────────── */
router.get('/transactions', async (req, res) => {
  try {
    const { search = '', type = 'all', status = 'all' } = req.query;
    let query = `
      SELECT t.*, u.name AS user_name, u.email AS user_email,
             u.tier AS user_current_tier, u.wallet_address AS user_wallet
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pi = 1;

    if (search) {
      query += ` AND (t.label ILIKE $${pi} OR u.name ILIKE $${pi+1} OR u.email ILIKE $${pi+2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      pi += 3;
    }
    if (type !== 'all')   { query += ` AND t.type = $${pi++}`;   params.push(type); }
    if (status !== 'all') { query += ` AND t.status = $${pi++}`; params.push(status); }
    query += ` ORDER BY CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END, t.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows.map(tx => ({
      ...safeTx(tx), userName: tx.user_name, userEmail: tx.user_email,
      userCurrentTier: tx.user_current_tier, userWallet: tx.user_wallet,
    })));
  } catch (err) {
    console.error('GET /admin/transactions:', err.message);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

/* GET /api/admin/transactions/:id — full detail for review modal */
router.get('/transactions/:id', async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const { rows } = await pool.query(`
      SELECT t.*,
        u.name AS user_name, u.email AS user_email,
        u.tier AS user_current_tier, u.wallet_address AS user_wallet,
        u.status AS user_status, u.balance AS user_balance
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [txId]);

    const tx = rows[0];
    if (!tx) return res.status(404).json({ message: 'Not found' });

    const tierNum = tx.tier_target || (() => {
      const m = (tx.label || '').match(/Tier (\d)/);
      return m ? parseInt(m[1]) : null;
    })();

    const tierData = tierNum
      ? (await pool.query('SELECT * FROM tiers WHERE tier = $1', [tierNum])).rows[0]
      : null;

    res.json({
      ...safeTx(tx),
      tierTarget: tierNum,
      userName: tx.user_name, userEmail: tx.user_email,
      userCurrentTier: tx.user_current_tier, userWallet: tx.user_wallet,
      userStatus: tx.user_status, userBalance: parseFloat(tx.user_balance),
      tierEarn:     tierData ? parseFloat(tierData.earn_per_24h) : null,
      tierPeriod:   tierData?.period ?? null,
      tierPriceUsd: tierData ? parseFloat(tierData.price_usd) : null,
      tierPriceNgn: tierData ? parseFloat(tierData.price_ngn) : null,
      tierPriceGhs: tierData ? parseFloat(tierData.price_ghs) : null,
      withdrawalAddress: tx.user_wallet || null,
      withdrawalFee: tx.type === 'withdrawals' ? 0 : null,
      withdrawalNet: tx.type === 'withdrawals' ? parseFloat(tx.amount) : null,
      withdrawalLabel: tx.type === 'withdrawals' ? tx.label : null,
    });
  } catch (err) {
    console.error('GET /admin/transactions/:id:', err.message);
    res.status(500).json({ message: 'Failed to fetch transaction detail' });
  }
});

router.patch('/transactions/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const txId = parseInt(req.params.id);
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [txId]);
    const tx = rows[0];
    if (!tx) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only pending transactions can be approved' });
    }

    const { rows: uRows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [tx.user_id]);
    const user = uRows[0];

    if (tx.type === 'upgrades') {
      const tierMatch = (tx.label || '').match(/Tier (\d)/) || [];
      const newTier   = tx.tier_target || (tierMatch[1] ? parseInt(tierMatch[1]) : null);
      await client.query("UPDATE transactions SET status = 'completed' WHERE id = $1", [txId]);
      if (newTier) await client.query('UPDATE users SET tier = $1 WHERE id = $2', [newTier, tx.user_id]);
      await client.query('COMMIT');
      await logActivity(req.user.id, req.user.name, 'Approved upgrade', `${tx.label} → Tier ${newTier} (User: ${user?.name})`);
      return res.json({ message: 'Upgrade approved', newTier });
    }

    if (tx.type === 'withdrawals') {
      await client.query("UPDATE transactions SET status = 'completed' WHERE id = $1", [txId]);
      await client.query('COMMIT');
      await logActivity(req.user.id, req.user.name, 'Approved withdrawal', `${tx.label} — $${tx.amount} USDT (User: ${user?.name})`);
      return res.json({ message: 'Withdrawal approved', amount: parseFloat(tx.amount) });
    }

    await client.query('ROLLBACK');
    return res.status(400).json({ message: 'This transaction type cannot be approved' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PATCH /transactions/:id/approve:', err.message);
    res.status(500).json({ message: 'Approval failed' });
  } finally {
    client.release();
  }
});

router.patch('/transactions/:id/reject', async (req, res) => {
  const client = await pool.connect();
  try {
    const txId = parseInt(req.params.id);
    const { rows } = await client.query('SELECT * FROM transactions WHERE id = $1', [txId]);
    const tx = rows[0];
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status !== 'pending') return res.status(400).json({ message: 'Only pending transactions can be rejected' });

    const { rows: uRows } = await client.query('SELECT * FROM users WHERE id = $1', [tx.user_id]);
    const user = uRows[0];

    await client.query('BEGIN');

    if (tx.type === 'withdrawals') {
      const refundAmount = parseFloat(tx.amount); // 0% fee — refund exact amount
      await client.query("UPDATE transactions SET status = 'failed' WHERE id = $1", [txId]);
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [refundAmount, tx.user_id]
      );
      await client.query('COMMIT');
      await logActivity(req.user.id, req.user.name, 'Rejected withdrawal (refunded)', `${tx.label} — $${refundAmount} refunded to ${user?.name}`);
      return res.json({ message: 'Withdrawal rejected and balance refunded', refunded: refundAmount });
    }

    await client.query("UPDATE transactions SET status = 'failed' WHERE id = $1", [txId]);
    await client.query('COMMIT');
    await logActivity(req.user.id, req.user.name, 'Rejected transaction', `${tx.label} (User: ${user?.name})`);
    res.json({ message: 'Transaction rejected' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PATCH /transactions/:id/reject:', err.message);
    res.status(500).json({ message: 'Rejection failed' });
  } finally {
    client.release();
  }
});

router.patch('/transactions/:id/status', async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const { status } = req.body;
    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', [status, txId]);
    await logActivity(req.user.id, req.user.name, `Updated transaction status to "${status}"`, `TX #${txId}`);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('PATCH /transactions/:id/status:', err.message);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    await pool.query('DELETE FROM transactions WHERE id = $1', [txId]);
    await logActivity(req.user.id, req.user.name, 'Deleted transaction', `TX #${txId}`);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error('DELETE /transactions/:id:', err.message);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

/* ─────────────────────────────────────────────────────────
   TIERS
───────────────────────────────────────────────────────── */
router.get('/tiers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tiers ORDER BY tier');
    res.json(rows.map(t => ({
      tier: t.tier, period: t.period,
      earnPer24h: parseFloat(t.earn_per_24h),
      priceUSD: parseFloat(t.price_usd),
      priceNGN: parseFloat(t.price_ngn),
      priceGHS: parseFloat(t.price_ghs),
    })));
  } catch (err) {
    console.error('GET /admin/tiers:', err.message);
    res.status(500).json({ message: 'Failed to fetch tiers' });
  }
});

router.put('/tiers/:tier', async (req, res) => {
  try {
    const tierNum = parseInt(req.params.tier);
    const { period, earnPer24h, priceUSD, priceNGN, priceGHS } = req.body;

    await pool.query(
      'UPDATE tiers SET period=$1, earn_per_24h=$2, price_usd=$3, price_ngn=$4, price_ghs=$5 WHERE tier=$6',
      [period, earnPer24h, priceUSD, priceNGN, priceGHS, tierNum]
    );
    await logActivity(req.user.id, req.user.name, 'Updated tier plan', `Tier ${tierNum}`);

    const { rows } = await pool.query('SELECT * FROM tiers WHERE tier = $1', [tierNum]);
    const t = rows[0];
    res.json({ tier: t.tier, period: t.period, earnPer24h: parseFloat(t.earn_per_24h), priceUSD: parseFloat(t.price_usd), priceNGN: parseFloat(t.price_ngn), priceGHS: parseFloat(t.price_ghs) });
  } catch (err) {
    console.error('PUT /admin/tiers/:tier:', err.message);
    res.status(500).json({ message: 'Failed to update tier' });
  }
});

/* ─────────────────────────────────────────────────────────
   SETTINGS
───────────────────────────────────────────────────────── */
router.get('/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({
      usdtWallet: s.usdt_wallet || '',
      nairaBank:  { name: s.naira_bank_name || '', account: s.naira_bank_account || '', number: s.naira_bank_number || '' },
      cedisBank:  { name: s.cedis_bank_name || '', account: s.cedis_bank_account || '', number: s.cedis_bank_number || '' },
    });
  } catch (err) {
    console.error('GET /admin/settings:', err.message);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { usdtWallet, nairaBank, cedisBank } = req.body;
    const upsert = (key, value) => pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, value]
    );

    const ops = [];
    if (usdtWallet !== undefined) ops.push(upsert('usdt_wallet', usdtWallet));
    if (nairaBank) {
      ops.push(upsert('naira_bank_name',    nairaBank.name    || ''));
      ops.push(upsert('naira_bank_account', nairaBank.account || ''));
      ops.push(upsert('naira_bank_number',  nairaBank.number  || ''));
    }
    if (cedisBank) {
      ops.push(upsert('cedis_bank_name',    cedisBank.name    || ''));
      ops.push(upsert('cedis_bank_account', cedisBank.account || ''));
      ops.push(upsert('cedis_bank_number',  cedisBank.number  || ''));
    }
    await Promise.all(ops);

    await logActivity(req.user.id, req.user.name, 'Updated payment settings', 'Payment channels');
    res.json({ message: 'Settings saved' });
  } catch (err) {
    console.error('PUT /admin/settings:', err.message);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

/* ─────────────────────────────────────────────────────────
   ACTIVITY LOG
───────────────────────────────────────────────────────── */
router.get('/activity', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200');
    res.json(rows.map(entry => ({
      id: entry.id,
      actor: entry.actor_name,
      action: entry.action,
      target: entry.target,
      timestamp: new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })));
  } catch (err) {
    console.error('GET /admin/activity:', err.message);
    res.status(500).json({ message: 'Failed to fetch activity log' });
  }
});

export default router;
