import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/* ── Paystack bank codes — Nigeria ── */
const NG_BANK_CODES = {
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
};

/* ── Flutterwave bank codes — Ghana banks + mobile money ── */
const GH_BANK_CODES = {
  // Banks
  'Absa Bank Ghana':                    'GH130100',
  'Access Bank Ghana':                  'GH280100',
  'Agricultural Development Bank (ADB)':'GH080100',
  'CalBank':                            'GH230100',
  'Consolidated Bank Ghana (CBG)':      'GH340100',
  'Ecobank Ghana':                      'GH030100',
  'Fidelity Bank Ghana':                'GH240100',
  'First Atlantic Bank':                'GH170100',
  'First National Bank Ghana':          'GH330100',
  'GCB Bank':                           'GH040100',
  'Guaranty Trust Bank Ghana (GTB)':    'GH270100',
  'National Investment Bank (NIB)':     'GH050100',
  'OmniBank Ghana':                     'GH260100',
  'Prudential Bank Ghana':              'GH180100',
  'Republic Bank Ghana':                'GH110100',
  'Stanbic Bank Ghana':                 'GH190100',
  'Standard Chartered Bank Ghana':      'GH020100',
  'United Bank for Africa Ghana (UBA)': 'GH300100',
  'Universal Merchant Bank (UMB)':      'GH100100',
  'Zenith Bank Ghana':                  'GH120100',
  // Mobile Money
  'MTN Mobile Money (MoMo)':            'MPS',
  'Vodafone Cash':                      'VDF',
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
  limits: { fileSize: 20 * 1024 * 1024 },
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
  avatarUrl: u.avatar_url || null,
  joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
});

const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: AVATARS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});

const router = Router();
router.use(verifyToken);

/* ── POST /api/user/avatar ── */
router.post('/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image is required' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.id]);
    res.json({ avatarUrl });
  } catch (err) {
    console.error('POST /user/avatar:', err.message);
    res.status(500).json({ message: 'Avatar upload failed' });
  }
});

/* ── GET /api/user/verify-account?bank=GTB&account=0123456789 ── */
router.get('/verify-account', async (req, res) => {
  const { bank, account } = req.query;
  if (!bank || !account) return res.status(400).json({ message: 'bank and account are required' });
  if (!/^\d{6,19}$/.test(account)) return res.status(400).json({ message: 'Account number must be between 6 and 19 digits' });

  // Paystack & Flutterwave only support exactly 10-digit account numbers
  if (account.length !== 10) return res.json({ accountName: null, skipped: true });

  const isGhana   = bank in GH_BANK_CODES;
  const isNigeria = bank in NG_BANK_CODES;

  if (!isGhana && !isNigeria) return res.json({ accountName: null, skipped: true });

  // ── Ghana: use Flutterwave ──
  if (isGhana) {
    const FLW_KEY  = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!FLW_KEY)  return res.json({ accountName: null, skipped: true });
    const bankCode = GH_BANK_CODES[bank];
    try {
      const resp = await fetch(
        `https://api.flutterwave.com/v3/accounts/resolve`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${FLW_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_number: account, account_bank: bankCode }),
        }
      );
      const data = await resp.json();
      if (data.status === 'success' && data.data?.account_name) {
        return res.json({ accountName: data.data.account_name });
      }
      // Auth error or unsupported — skip gracefully, don't surface to user
      console.warn('FLW verify skipped:', data.message);
      return res.json({ accountName: null, skipped: true });
    } catch (err) {
      console.error('verify-account (FLW) error:', err.message);
      return res.json({ accountName: null, skipped: true });
    }
  }

  // ── Nigeria: use Paystack ──
  const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_KEY) return res.json({ accountName: null, skipped: true });
  const bankCode = NG_BANK_CODES[bank];
  try {
    const resp = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
    );
    const data = await resp.json();
    if (!resp.ok || !data.status) {
      return res.status(422).json({ message: data.message || 'Could not verify account' });
    }
    return res.json({ accountName: data.data.account_name });
  } catch (err) {
    console.error('verify-account (Paystack) error:', err.message);
    return res.json({ accountName: null, skipped: true });
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
    const withdrawMethod = method || 'crypto'; // 'crypto' | 'bank' | 'momo'
    const withdrawAmount = parseFloat(amount);

    const MIN_WITHDRAWAL     = 10;
    const MAX_WITHDRAWAL     = 10000;
    const CRYPTO_FEE_PERCENT = 0;
    const BANK_FEE_PERCENT   = 0;
    const USD_TO_NGN_RATE    = 1550;
    const USD_TO_GHS_RATE    = 15.2;

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
      if (!/^\d{6,19}$/.test(accountNumber.trim())) {
        return res.status(400).json({ message: 'Account number must be between 6 and 19 digits' });
      }
    } else if (withdrawMethod === 'momo') {
      if (!bankName?.trim())      return res.status(400).json({ message: 'Mobile Money network is required' });
      if (!accountNumber?.trim()) return res.status(400).json({ message: 'Phone number is required' });
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
      label = `Withdrawal to ${address.trim()} via USDT TRC20`;
    } else if (withdrawMethod === 'momo') {
      const ngnAmount = +(withdrawAmount * USD_TO_NGN_RATE).toFixed(2);
      label = `MoMo transfer to ${bankName} ···${accountNumber.trim().slice(-4)} (${ngnAmount.toLocaleString()} NGN)`;
    } else {
      const isGhanaBank = bankName && (bankName in GH_BANK_CODES || bankName.toLowerCase().includes('ghana'));
      if (isGhanaBank) {
        const ghsAmount = +(withdrawAmount * USD_TO_GHS_RATE).toFixed(2);
        label = `Bank transfer to ${bankName} ···${accountNumber.trim().slice(-4)} (${ghsAmount.toLocaleString()} GHS)`;
      } else {
        const ngnAmount = +(withdrawAmount * USD_TO_NGN_RATE).toFixed(2);
        label = `Bank transfer to ${bankName} ···${accountNumber.trim().slice(-4)} (${ngnAmount.toLocaleString()} NGN)`;
      }
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
