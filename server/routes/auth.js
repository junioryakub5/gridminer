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
    const { name, email, password, referralCode: usedCode } = req.body;

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

    // Look up referrer (optional)
    let referredBy = null;
    if (usedCode?.trim()) {
      const { rows: refRows } = await pool.query(
        'SELECT id FROM users WHERE UPPER(referral_code) = $1',
        [usedCode.trim().toUpperCase()]
      );
      if (refRows.length) referredBy = refRows[0].id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, tier, balance, wallet_address, status, referral_code, referred_by)
       VALUES ($1, $2, $3, 'user', 1, 0, '', 'active', $4, $5)
       RETURNING *`,
      [name.trim(), email.toLowerCase(), passwordHash, referralCode, referredBy]
    );

    const user = rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user: safeUser(user) });

    // ── Send welcome email (fire-and-forget) ──
    const sendWelcome = async () => {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
        });
        await transporter.sendMail({
          from: `"Gridminer" <${process.env.GMAIL_USER}>`,
          to: user.email,
          subject: `Welcome to Gridminer, ${user.name.split(' ')[0]}! 🎉`,
          text: `Hi ${user.name},\n\nWelcome to Gridminer — your TRC20 mining journey starts now.\n\nYour referral code: ${user.referral_code}\n\nLogin at https://gridminer.site\n\n— The Gridminer Team`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f4f8fc;padding:32px 16px;">
              <div style="background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 4px 24px rgba(0,50,80,0.08);">

                <!-- Logo -->
                <div style="text-align:center;margin-bottom:28px;">
                  <span style="font-size:26px;font-weight:800;color:#1a2a3a;letter-spacing:-0.5px;">Grid<span style="color:#1a9e8f;">miner</span></span>
                </div>

                <!-- Hero -->
                <div style="background:linear-gradient(135deg,#1a9e8f,#0d7ab5);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                  <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0 0 4px;">Welcome aboard</p>
                  <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;">${user.name.split(' ')[0]}! 🎉</h1>
                </div>

                <p style="color:#4a7a9b;font-size:14px;line-height:1.7;margin:0 0 20px;">
                  Your Gridminer account is ready. You're now part of our TRC20 mining network — start mining and watch your balance grow every day.
                </p>

                <!-- Steps -->
                <div style="margin-bottom:24px;">
                  ${[
                    ['1', 'Start Mining', 'Hit the Mine button on your dashboard daily to earn TRC20 rewards.'],
                    ['2', 'Upgrade Your Tier', 'Higher tiers unlock bigger daily mining rewards.'],
                    ['3', 'Invite Friends', `Your referral code is <strong style="color:#1a2a3a;font-family:'Courier New',monospace;">${user.referral_code}</strong> — share it to earn bonuses.`],
                  ].map(([n, title, desc]) => `
                    <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start;">
                      <div style="min-width:28px;height:28px;border-radius:50%;background:#1a9e8f;color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;line-height:28px;">${n}</div>
                      <div>
                        <p style="color:#1a2a3a;font-size:13px;font-weight:700;margin:0 0 2px;">${title}</p>
                        <p style="color:#7aabcc;font-size:12px;line-height:1.5;margin:0;">${desc}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- CTA -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;width:100%;">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,#1a9e8f,#0d7ab5);text-align:center;">
                      <a href="https://gridminer.site/dashboard"
                         target="_blank"
                         style="display:block;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">
                        Go to Dashboard →
                      </a>
                    </td>
                  </tr>
                </table>

                <hr style="border:none;border-top:1px solid #f0f5ff;margin:20px 0;">
                <p style="color:#c0d0e0;font-size:11px;text-align:center;margin:0;">Gridminer &middot; Secure TRC20 Mining Network</p>
              </div>
            </div>
          `,
        });
        console.log(`✉️  Welcome email sent to ${user.email}`);
      } catch (e) {
        console.error('Welcome email error:', e.message);
      }
    };
    sendWelcome();
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
    if (!rows.length) return res.json({ message: 'ok' });

    const user = rows[0];

    // Generate a 6-digit OTP code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate old codes for this user
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

    // Store new code
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, code, expiresAt]
    );

    // Send email
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Gridminer" <${process.env.GMAIL_USER}>`,
      to: email.toLowerCase(),
      subject: `${code} is your Gridminer reset code`,
      text: `Hi ${user.name},\n\nYour Gridminer password reset code is:\n\n${code}\n\nThis code expires in 15 minutes. If you didn't request this, ignore this email.\n\n— Gridminer`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f4f8fc;padding:32px 16px;">
          <div style="background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 4px 24px rgba(0,50,80,0.10);">
            <div style="text-align:center;margin-bottom:20px;">
              <span style="font-size:24px;font-weight:800;color:#1a2a3a;">Grid<span style="color:#1a9e8f;">miner</span></span>
            </div>
            <h2 style="font-size:17px;font-weight:700;color:#1a2a3a;margin:0 0 8px;text-align:center;">Password Reset Code</h2>
            <p style="color:#4a7a9b;font-size:13px;line-height:1.6;margin:0 0 24px;text-align:center;">Hi ${user.name}, use the code below to reset your password.</p>
            <div style="background:#f0f9f8;border:2px solid #1a9e8f;border-radius:14px;padding:20px;text-align:center;margin-bottom:24px;">
              <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#1a2a3a;font-family:'Courier New',monospace;">${code}</span>
            </div>
            <p style="color:#8aabcc;font-size:12px;text-align:center;margin:0 0 16px;">This code expires in <strong>15 minutes</strong>.</p>
            <hr style="border:none;border-top:1px solid #f0f5ff;margin:16px 0;">
            <p style="color:#c0d0e0;font-size:11px;text-align:center;margin:0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });
    console.log(`✉️  Reset code sent to ${email} — messageId: ${info.messageId}`);

    res.json({ message: 'ok' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
  }
});

/* ── POST /api/auth/reset-password ── */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) return res.status(400).json({ message: 'Email, code and new password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const { rows } = await pool.query(
      `SELECT pr.id, pr.user_id FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE u.email = $1 AND pr.token = $2 AND pr.used = false AND pr.expires_at > NOW()`,
      [email.toLowerCase(), code.trim()]
    );

    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired code. Please request a new one.' });

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
