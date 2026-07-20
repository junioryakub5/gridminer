import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/* ── Paystack bank codes (Nigeria + Ghana) ── */
const BANK_CODES = {
  // Nigeria
  'Access Bank':                        '044',
  'Citibank Nigeria':                   '023',
  'Ecobank Nigeria':                    '050',
  'Fidelity Bank':                      '070',
  'First Bank of Nigeria':              '011',
  'First City Monument Bank (FCMB)':    '214',
  'Globus Bank':                        '00103',
  'Guaranty Trust Bank (GTB)':          '058',
  'Heritage Bank':                      '030',
  'Keystone Bank':                      '082',
  'Kuda Bank':                          '50211',
  'Lotus Bank':                         '303',
  'OPay':                               '999992',
  'Parallex Bank':                      '526',
  'Palmpay':                            '999991',
  'Polaris Bank':                       '076',
  'PremiumTrust Bank':                  '105',
  'Providus Bank':                      '101',
  'Rand Merchant Bank':                 '502',
  'Stanbic IBTC Bank':                  '221',
  'Standard Chartered Bank Nigeria':    '068',
  'Sterling Bank':                      '232',
  'SunTrust Bank':                      '100',
  'Titan Trust Bank':                   '102',
  'Union Bank of Nigeria':              '032',
  'United Bank for Africa (UBA)':       '033',
  'Unity Bank':                         '215',
  'VFD Microfinance Bank':              '566',
  'Wema Bank':                          '035',
  'Zenith Bank':                        '057',
  // Ghana
  'Absa Bank Ghana':                    'ABSA',
  'Access Bank Ghana':                  'ACCESS',
  'Agricultural Development Bank (ADB)':'ADB',
  'CalBank':                            'CAL',
  'Consolidated Bank Ghana (CBG)':      'CBG',
  'Ecobank Ghana':                      'ECO',
  'Fidelity Bank Ghana':                'FID',
  'First Atlantic Bank':                'FAB',
  'First National Bank Ghana':          'FNB',
  'GCB Bank':                           'GCB',
  'Guaranty Trust Bank Ghana (GTB)':    'GTB',
  'National Investment Bank (NIB)':     'NIB',
  'OmniBank Ghana':                     'OMNI',
  'Prudential Bank Ghana':              'PRU',
  'Republic Bank Ghana':                'REP',
  'Stanbic Bank Ghana':                 'STAN',
  'Standard Chartered Bank Ghana':      'SCB',
  'United Bank for Africa Ghana (UBA)': 'UBA',
  'Universal Merchant Bank (UMB)':      'UMB',
  'Zenith Bank Ghana':                  'ZEN',
  'MTN Mobile Money (MoMo)':           'MTN',
  'Vodafone Cash':                      'VOD',
  'AirtelTigo Money':                   'ATL',
};

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

/* ── GET /api/user/verify-account?bank=GTB&account=0123456789 ── */
router.get('/verify-account', async (req, res) => {
  const { bank, account } = req.query;
  if (!bank || !account) return res.status(400).json({ message: 'bank and account are required' });
  if (!/^\d{10}$/.test(account)) return res.status(400).json({ message: 'Account number must be 10 digits' });

  const bankCode = BANK_CODES[bank];
  if (!bankCode) return res.status(400).json({ message: 'Unsupported bank' });

  const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_KEY) return res.status(503).json({ message: 'Account verification not configured' });

  try {
    const url = `https://api.paystack.co/bank/resolve?account_number=${account}&bank_code=${bankCode}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_KEY}` },
    });
    const data = await resp.json();

    if (!resp.ok || !data.status) {
      return res.status(422).json({ message: data.message || 'Could not verify account' });
    }

    return res.json({ accountName: data.data.account_name });
  } catch (err) {
    console.error('verify-account error:', err.message);
    return res.status(500).json({ message: 'Verification service unavailable' });
  }
});

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

/* ── GET /api/user/referral-stats ── */
router.get('/referral-stats', async (req, res) => {
  try {
    // Total friends referred
    const { rows: friends } = await pool.query(
      `SELECT u.id, u.name, u.created_at,
              COALESCE(SUM(t.amount), 0) AS bonus_generated
       FROM users u
       LEFT JOIN transactions t
         ON t.user_id = $1 AND t.type = 'referral'
         AND t.label LIKE '%' || u.name || '%'
       WHERE u.referred_by = $1
       GROUP BY u.id, u.name, u.created_at
       ORDER BY u.created_at DESC`,
      [req.user.id]
    );

    // Total referral earnings (all referral-type transactions for this user)
    const { rows: earningsRow } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions WHERE user_id = $1 AND type = 'referral'`,
      [req.user.id]
    );

    res.json({
      totalReferrals: friends.length,
      totalEarnings:  parseFloat(earningsRow[0].total),
      friends: friends.map(f => ({
        name:           f.name,
        joinedAt:       new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        bonusGenerated: parseFloat(f.bonus_generated),
      })),
    });
  } catch (err) {
    console.error('GET /user/referral-stats:', err.message);
    res.status(500).json({ message: 'Failed to fetch referral stats' });
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

    // ── 10% referral bonus to whoever referred this user ──
    if (user.referred_by) {
      const bonus = +(earned * 0.10).toFixed(4);
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [bonus, user.referred_by]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, label, amount, status)
         VALUES ($1, 'referral', $2, $3, 'completed')`,
        [user.referred_by, `Referral bonus from ${user.name}`, bonus]
      );
    }

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
    const { address, amount, method, bankName, accountNumber } = req.body;
    const withdrawMethod = method || 'crypto'; // 'crypto' | 'bank'
    const withdrawAmount = parseFloat(amount);

    const MIN_WITHDRAWAL = 10;
    const MAX_WITHDRAWAL = 10000;
    const CRYPTO_FEE_PERCENT = 0;   // 0% fee for crypto
    const BANK_FEE_PERCENT   = 0;   // 0% fee for bank transfer (adjust if needed)
    const USD_TO_NGN_RATE    = 1550; // exchange rate

    // Shared validations
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({ message: `Minimum withdrawal is $${MIN_WITHDRAWAL}.00 USD` });
    }
    if (withdrawAmount > MAX_WITHDRAWAL) {
      return res.status(400).json({ message: `Maximum withdrawal is $${MAX_WITHDRAWAL.toLocaleString()}.00 USD per transaction` });
    }

    // Method-specific validations
    if (withdrawMethod === 'crypto') {
      if (!address?.trim()) return res.status(400).json({ message: 'TRC20 wallet address is required' });
    } else if (withdrawMethod === 'bank') {
      if (!bankName?.trim())      return res.status(400).json({ message: 'Bank name is required' });
      if (!accountNumber?.trim()) return res.status(400).json({ message: 'Account number is required' });
      if (!/^\d{10}$/.test(accountNumber.trim())) {
        return res.status(400).json({ message: 'Account number must be exactly 10 digits' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid withdrawal method' });
    }

    await client.query('BEGIN');

    const { rows: uRows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = uRows[0];

    if (user.tier === 1 && parseFloat(user.balance) < 100) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Tier 1 users need 100 USDT balance to withdraw' });
    }

    // Fee calculation
    const feePercent = withdrawMethod === 'crypto' ? CRYPTO_FEE_PERCENT : BANK_FEE_PERCENT;
    const feeAmount  = +(withdrawAmount * feePercent / 100).toFixed(4);
    const totalDeducted = +(withdrawAmount + feeAmount).toFixed(4);

    if (parseFloat(user.balance) < totalDeducted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Insufficient balance. You need $${totalDeducted.toFixed(2)} USD` });
    }

    const newBalance = +(parseFloat(user.balance) - totalDeducted).toFixed(4);
    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, user.id]);

    let label;
    if (withdrawMethod === 'crypto') {
      label = `Crypto withdrawal to ${address.trim().slice(0, 10)}...`;
    } else {
      const ngnAmount = +(withdrawAmount * USD_TO_NGN_RATE).toFixed(2);
      label = `Bank transfer to ${bankName} ···${accountNumber.trim().slice(-4)} (${ngnAmount.toLocaleString()} NGN)`;
    }

    await client.query(
      `INSERT INTO transactions (user_id, type, label, amount, status)
       VALUES ($1, 'withdrawals', $2, $3, 'pending')`,
      [user.id, label, withdrawAmount]
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
