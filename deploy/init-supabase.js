#!/usr/bin/env node
/**
 * CloudMining 2.0 — Supabase Schema Initializer (via REST API)
 * Works even when PostgreSQL port 5432 is blocked by local network.
 * 
 * Usage: node --env-file=server/.env deploy/init-supabase.js
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nsoyzwgrgperirqamusy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zb3l6d2dyZ3BlcmlycWFtdXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDMwMzQzMywiZXhwIjoyMDk5ODc5NDMzfQ.AZ0Jd2VGL1eqy9WTummpS3Sn_qgG627lM6rKD2pt3bk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function init() {
  console.log('🔗 Connecting to Supabase via REST API...');

  // ── Test connection ──
  const { error: testErr } = await supabase.from('_test_connection').select('*').limit(1);
  // Expect a "table not found" error, NOT an auth error
  if (testErr && testErr.code === 'PGRST301') {
    console.error('❌ Auth failed — check your service role key');
    process.exit(1);
  }
  console.log('✅ Connected to Supabase REST API');

  // ── Create tables via SQL API ──
  // Note: supabase-js doesn't directly run DDL — use the SQL editor in the dashboard
  // OR use the pg client on the VPS. This script handles what we CAN do via REST:
  // seeding data into already-created tables.

  console.log('\n⚠️  NOTE: Tables must be created manually in Supabase SQL Editor.');
  console.log('   Copy and paste server/schema.sql into:');
  console.log('   https://supabase.com/dashboard/project/nsoyzwgrgperirqamusy/sql/new\n');

  // ── Check if tables exist ──
  const { data: tierCheck, error: tierErr } = await supabase.from('tiers').select('tier').limit(1);
  if (tierErr) {
    console.log('❌ Tables not found. Please run schema.sql in Supabase SQL Editor first.');
    console.log('   Error:', tierErr.message);
    process.exit(1);
  }

  console.log('✅ Tables exist — proceeding with seed data...\n');

  // ── Seed tiers ──
  const { error: tErr } = await supabase.from('tiers').upsert([
    { tier: 1, period: 100,  earn_per_24h: 1.00,    price_usd: 0,   price_ngn: 0,      price_ghs: 0 },
    { tier: 2, period: 14,   earn_per_24h: 50.00,   price_usd: 16,  price_ngn: 23235,  price_ghs: 300 },
    { tier: 3, period: 14,   earn_per_24h: 150.00,  price_usd: 50,  price_ngn: 72985,  price_ghs: 920 },
    { tier: 4, period: 14,   earn_per_24h: 500.00,  price_usd: 200, price_ngn: 291940, price_ghs: 3680 },
    { tier: 5, period: 14,   earn_per_24h: 1500.00, price_usd: 600, price_ngn: 875820, price_ghs: 11040 },
  ], { onConflict: 'tier' });
  if (tErr) console.error('Tiers error:', tErr.message);
  else console.log('✅ Tiers seeded');

  // ── Seed settings ──
  const { error: sErr } = await supabase.from('settings').upsert([
    { key: 'usdt_wallet',        value: 'TEMon4HWt7bc9b4ooBuhownfQuKzwSjjmm' },
    { key: 'naira_bank_name',    value: 'Opay' },
    { key: 'naira_bank_account', value: 'CloudMining Limited' },
    { key: 'naira_bank_number',  value: '8054321987' },
    { key: 'cedis_bank_name',    value: 'MTN Mobile Money' },
    { key: 'cedis_bank_account', value: 'CloudMining Limited' },
    { key: 'cedis_bank_number',  value: '0551234567' },
  ], { onConflict: 'key' });
  if (sErr) console.error('Settings error:', sErr.message);
  else console.log('✅ Settings seeded');

  // ── Seed users ──
  const SALT = 10;
  const usersData = [
    { name: 'Abdul Aziz',    email: 'junioryakub5@gmail.com', pw: 'Jacob@2001',   role: 'user',  tier: 1, balance: 1.00,   wallet_address: '',                                        status: 'active',   last_mined_at: new Date(Date.now() - 2*86400000).toISOString(), referral_code: 'REF001' },
    { name: 'Demo User',     email: 'demo@cloudmining.com',   pw: 'Demo@1234',    role: 'user',  tier: 2, balance: 142.50, wallet_address: 'TRx8nHhH9a7n5HLNbTMJnBzf9tH3sGBd7Y',  status: 'active',   last_mined_at: new Date(Date.now() - 2*86400000).toISOString(), referral_code: 'REF002' },
    { name: 'Sarah Johnson', email: 'sarah@example.com',      pw: 'Sarah@2024',   role: 'user',  tier: 3, balance: 875.00, wallet_address: 'TGj2Wq7vQ5mBkR3nP8uXwZe6Yd1Fc4As9H',  status: 'active',   last_mined_at: new Date(Date.now() - 2*86400000).toISOString(), referral_code: 'REF003' },
    { name: 'Blocked User',  email: 'blocked@example.com',    pw: 'Block@123',    role: 'user',  tier: 1, balance: 0,      wallet_address: '',                                        status: 'inactive', last_mined_at: null, referral_code: 'REF004' },
    { name: 'Administrator', email: 'admin@cloudmining.com',  pw: 'Admin@2026',   role: 'admin', tier: 1, balance: 0,      wallet_address: '',                                        status: 'active',   last_mined_at: null, referral_code: 'ADMIN1' },
  ];

  const insertedUsers = {};
  for (const u of usersData) {
    const password_hash = await bcrypt.hash(u.pw, SALT);
    const { data, error } = await supabase
      .from('users')
      .insert({ name: u.name, email: u.email, password_hash, role: u.role, tier: u.tier, balance: u.balance, wallet_address: u.wallet_address, status: u.status, last_mined_at: u.last_mined_at, referral_code: u.referral_code })
      .select('id, email')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already exists — fetch the ID
        const { data: existing } = await supabase.from('users').select('id').eq('email', u.email).single();
        if (existing) insertedUsers[u.email] = existing.id;
        console.log(`  👤 ${u.name} — already exists`);
      } else {
        console.error(`  ❌ ${u.name}:`, error.message);
      }
    } else {
      insertedUsers[u.email] = data.id;
      console.log(`  👤 ${u.name} — inserted (id: ${data.id})`);
    }
  }
  console.log('✅ Users seeded\n');

  // ── Seed transactions ──
  const u1 = insertedUsers['junioryakub5@gmail.com'];
  const u2 = insertedUsers['demo@cloudmining.com'];
  const u3 = insertedUsers['sarah@example.com'];
  const u4 = insertedUsers['blocked@example.com'];

  const txs = [
    u1 && { user_id: u1, type: 'mining',      label: 'Mining Reward',      amount: 1.00,   status: 'completed', created_at: '2026-07-17T12:43:00Z' },
    u2 && { user_id: u2, type: 'mining',      label: 'Mining Reward',      amount: 50.00,  status: 'completed', created_at: '2026-07-17T11:00:00Z' },
    u2 && { user_id: u2, type: 'upgrades',    label: 'Upgraded to Tier 2', amount: 16.00,  status: 'completed', created_at: '2026-06-20T10:00:00Z' },
    u3 && { user_id: u3, type: 'mining',      label: 'Mining Reward',      amount: 150.00, status: 'completed', created_at: '2026-07-17T09:30:00Z' },
    u3 && { user_id: u3, type: 'upgrades',    label: 'Upgraded to Tier 3', amount: 50.00,  status: 'completed', created_at: '2026-05-15T15:00:00Z' },
    u3 && { user_id: u3, type: 'withdrawals', label: 'Withdrawal Request', amount: 200.00, status: 'completed', created_at: '2026-07-10T14:00:00Z' },
    u1 && { user_id: u1, type: 'upgrades',    label: 'Upgraded to Tier 2', amount: 16.00,  status: 'pending',   created_at: '2026-07-17T13:00:00Z' },
    u4 && { user_id: u4, type: 'upgrades',    label: 'Upgraded to Tier 2', amount: 16.00,  status: 'pending',   created_at: '2026-07-16T08:00:00Z' },
  ].filter(Boolean);

  const { error: txErr } = await supabase.from('transactions').insert(txs);
  if (txErr) console.error('Transactions error:', txErr.message);
  else console.log(`✅ ${txs.length} transactions seeded`);

  console.log('\n🎉 Supabase initialization complete!');
  console.log('   Database is ready. Deploy the backend to your VPS next.');
}

init().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
