import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const { Pool } = pg;

/* ── Connection pool → Supabase PostgreSQL ── */
// Use individual params to avoid URL encoding issues with special chars in password
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'postgres',
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      { rejectUnauthorized: false },
      }
);

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

/* ── Test connection + auto-migrate on startup ── */
pool.query('SELECT NOW()')
  .then(async () => {
    console.log('✅  Connected to Supabase PostgreSQL');
    // Auto-create tables that may be missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used       BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  })
  .catch((err) => {
    console.error('❌  Supabase connection failed:', err.message);
    console.error('   Check DATABASE_URL in server/.env');
    process.exit(1);
  });

export default pool;
