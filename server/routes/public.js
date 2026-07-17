import { Router } from 'express';
import pool from '../db.js';

const router = Router();

/* ── GET /api/public/tiers ── */
router.get('/tiers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tiers ORDER BY tier');
    res.json(rows.map(t => ({
      tier: t.tier, period: t.period, earnPer24h: parseFloat(t.earn_per_24h),
      priceUSD: parseFloat(t.price_usd),
      priceNGN: parseFloat(t.price_ngn),
      priceGHS: parseFloat(t.price_ghs),
    })));
  } catch (err) {
    console.error('GET /public/tiers:', err.message);
    res.status(500).json({ message: 'Failed to fetch tiers' });
  }
});

/* ── GET /api/public/settings ── */
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
    console.error('GET /public/settings:', err.message);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

export default router;
