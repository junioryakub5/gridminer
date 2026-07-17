import pg from 'pg';
import 'dotenv/config';

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

/* ── Test connection on startup ── */
pool.query('SELECT NOW()')
  .then(() => console.log('✅  Connected to Supabase PostgreSQL'))
  .catch((err) => {
    console.error('❌  Supabase connection failed:', err.message);
    console.error('   Check DATABASE_URL in server/.env');
    process.exit(1);
  });

export default pool;
