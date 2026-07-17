import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { signToken, verifyToken } from '../middleware/auth.js';

const router = Router();

/* helper — strip sensitive fields */
const safeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  tier: u.tier,
  balance: parseFloat(u.balance),
  walletAddress: u.wallet_address,
  status: u.status,
  lastMinedAt: u.last_mined_at,
  referralCode: u.referral_code,
  joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
});

/* ── POST /api/auth/register ── */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, tier, balance, wallet_address, status, referral_code)
       VALUES ($1, $2, $3, 'user', 1, 0, '', 'active', $4)
       RETURNING *`,
      [name.trim(), email.toLowerCase(), passwordHash, referralCode]
    );

    const user = rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Registration failed' });
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login failed' });
  }
});

/* ── GET /api/auth/me ── */
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

export default router;
