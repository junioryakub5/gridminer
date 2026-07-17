import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `proof_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});

const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  tier: u.tier, balance: parseFloat(u.balance),
  walletAddress: u.wallet_address,
  status: u.status, lastMinedAt: u.last_mined_at, referralCode: u.referral_code,
  joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
});

const router = Router();
router.use(verifyToken);

/* ── GET /api/user/transactions ── */
router.get('/transactions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows.map(tx => ({
      id: tx.id, type: tx.type, label: tx.label, amount: parseFloat(tx.amount),
      status: tx.status, proofImage: tx.proof_image,
      date: new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    })));
  } catch (err) {
    console.error('GET /user/transactions:', err.message);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

/* ── POST /api/user/mine ── */
router.post('/mine', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: uRows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = uRows[0];

    // Enforce 24-hour server-side cooldown
    if (user.last_mined_at) {
      const lastMined = new Date(user.last_mined_at);
      const elapsed   = Date.now() - lastMined.getTime();
      const remaining = 24 * 60 * 60 * 1000 - elapsed;
      if (remaining > 0) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          message: 'Mining cooldown active',
          remainingMs: remaining,
          canMineAt: new Date(lastMined.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    const { rows: tRows } = await client.query('SELECT * FROM tiers WHERE tier = $1', [user.tier]);
    const tier   = tRows[0];
    const earned = tier ? parseFloat(tier.earn_per_24h) : 1.00;
    const newBalance = +(parseFloat(user.balance) + earned).toFixed(4);
    const now = new Date();

    await client.query(
      'UPDATE users SET balance = $1, last_mined_at = $2 WHERE id = $3',
      [newBalance, now, user.id]
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, label, amount, status)
       VALUES ($1, 'mining', 'Mining Reward', $2, 'completed')`,
      [user.id, earned]
    );

    await client.query('COMMIT');

    const { rows: updated } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    res.json({ earned, balance: newBalance, user: safeUser(updated[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /user/mine:', err.message);
    res.status(500).json({ message: 'Mining failed' });
  } finally {
    client.release();
  }
});

/* ── POST /api/user/upgrade ── */
router.post('/upgrade', upload.single('proof'), async (req, res) => {
  try {
    const { tier, paymentMethod } = req.body;
    const tierNum = parseInt(tier);

    if (!tierNum || tierNum < 2 || tierNum > 5) {
      return res.status(400).json({ message: 'Invalid tier' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Payment proof screenshot is required' });
    }

    const { rows } = await pool.query('SELECT * FROM tiers WHERE tier = $1', [tierNum]);
    const tierData = rows[0];
    if (!tierData) return res.status(404).json({ message: 'Tier not found' });

    await pool.query(
      `INSERT INTO transactions (user_id, type, label, amount, status, proof_image, payment_method, tier_target)
       VALUES ($1, 'upgrades', $2, $3, 'pending', $4, $5, $6)`,
      [req.user.id, `Upgrade to Tier ${tierNum}`, parseFloat(tierData.price_usd), req.file.filename, paymentMethod || 'unknown', tierNum]
    );

    res.status(201).json({ message: 'Upgrade request submitted, awaiting admin approval' });
  } catch (err) {
    console.error('POST /user/upgrade:', err.message);
    res.status(500).json({ message: 'Upgrade request failed' });
  }
});

/* ── POST /api/user/withdraw ── */
router.post('/withdraw', async (req, res) => {
  const client = await pool.connect();
  try {
    const { address, amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!address?.trim()) return res.status(400).json({ message: 'Wallet address is required' });
    if (isNaN(withdrawAmount) || withdrawAmount < 5) {
      return res.status(400).json({ message: 'Minimum withdrawal is 5 USDT' });
    }

    await client.query('BEGIN');

    const { rows: uRows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = uRows[0];

    if (user.tier === 1 && parseFloat(user.balance) < 100) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Tier 1 users need 100 USDT balance to withdraw' });
    }

    const fee = 1.00;
    const totalDeducted = +(withdrawAmount + fee).toFixed(4);

    if (parseFloat(user.balance) < totalDeducted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Insufficient balance. Need ${totalDeducted} USDT (amount + 1 USDT fee)` });
    }

    const newBalance = +(parseFloat(user.balance) - totalDeducted).toFixed(4);
    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, user.id]);
    await client.query(
      `INSERT INTO transactions (user_id, type, label, amount, status)
       VALUES ($1, 'withdrawals', $2, $3, 'pending')`,
      [user.id, `Withdrawal to ${address.slice(0, 10)}...`, withdrawAmount]
    );

    await client.query('COMMIT');

    const { rows: updated } = await pool.query('SELECT balance FROM users WHERE id = $1', [user.id]);
    res.json({ message: 'Withdrawal request submitted', balance: parseFloat(updated[0].balance) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /user/withdraw:', err.message);
    res.status(500).json({ message: 'Withdrawal failed' });
  } finally {
    client.release();
  }
});

/* ── PUT /api/user/profile ── */
router.put('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const { rows: conflict } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), req.user.id]
    );
    if (conflict.length > 0) return res.status(409).json({ message: 'Email already in use by another account' });

    const { rows } = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name.trim(), email.toLowerCase(), req.user.id]
    );
    res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    console.error('PUT /user/profile:', err.message);
    res.status(500).json({ message: 'Profile update failed' });
  }
});

/* ── PUT /api/user/password ── */
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('PUT /user/password:', err.message);
    res.status(500).json({ message: 'Password update failed' });
  }
});

/* ── PUT /api/user/wallet ── */
router.put('/wallet', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address?.trim()) return res.status(400).json({ message: 'Wallet address is required' });

    await pool.query('UPDATE users SET wallet_address = $1 WHERE id = $2', [address.trim(), req.user.id]);
    await pool.query(
      `INSERT INTO transactions (user_id, type, label, amount, status)
       VALUES ($1, 'binding', 'Wallet Address Bound', 0, 'completed')`,
      [req.user.id]
    );

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: safeUser(rows[0]), message: 'Wallet address saved' });
  } catch (err) {
    console.error('PUT /user/wallet:', err.message);
    res.status(500).json({ message: 'Wallet update failed' });
  }
});

export default router;
