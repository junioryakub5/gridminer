import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
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

/* ── POST /api/auth/forgot-password ── */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });

    const { rows } = await pool.query(
      'SELECT id, name FROM users WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );

    // Always return success to avoid email enumeration
    if (!rows.length) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens for this user
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

    // Store new token
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'https://gridminer.site'}/reset-password?token=${token}`;

    // Send email via Gmail SMTP port 587 (STARTTLS)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Gridminer" <${process.env.GMAIL_USER}>`,
      to: email.toLowerCase(),
      subject: 'Reset your Gridminer password',
      html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f4f8fc;padding:32px 16px;">
          <div style="background:white;border-radius:16px;padding:36px 32px;box-shadow:0 4px 24px rgba(0,50,80,0.10);">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:26px;font-weight:800;color:#1a2a3a;letter-spacing:-0.5px;">Grid<span style="color:#1a9e8f;">miner</span></span>
            </div>
            <h2 style="font-size:18px;font-weight:700;color:#1a2a3a;margin:0 0 8px;">Password Reset Request</h2>
            <p style="color:#4a7a9b;font-size:14px;line-height:1.6;margin:0 0 24px;">Hi ${user.name}, we received a request to reset your password. Click the button below to choose a new one.</p>
            <a href="${resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#1a9e8f,#0d7ab5);color:white;text-decoration:none;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:24px;">Reset Password</a>
            <p style="color:#8aabcc;font-size:12px;line-height:1.6;margin:0;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email — your password won't change.</p>
            <hr style="border:none;border-top:1px solid #f0f5ff;margin:24px 0;">
            <p style="color:#c0d0e0;font-size:11px;text-align:center;margin:0;">Gridminer · Secure TRC20 Mining Network</p>
          </div>
        </div>
      `,
    });
    console.log(`✉️  Reset email sent to ${email} — messageId: ${info.messageId}`);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
});

/* ── POST /api/auth/reset-password ── */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const { rows } = await pool.query(
      `SELECT pr.*, u.id AS uid FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1 AND pr.used = false AND pr.expires_at > NOW()`,
      [token]
    );

    if (!rows.length) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });

    const reset = rows[0];
    const hash = await bcrypt.hash(password, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [reset.id]);

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('reset-password error:', err.message);
    res.status(500).json({ message: 'Password reset failed. Please try again.' });
  }
});

export default router;
