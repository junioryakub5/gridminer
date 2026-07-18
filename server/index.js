import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import authRoutes   from './routes/auth.js';
import userRoutes   from './routes/user.js';
import adminRoutes  from './routes/admin.js';
import publicRoutes from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3005;

const app = express();

/* ── CORS — allow local dev + Vercel production ── */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.FRONTEND_URL_ALT ? [process.env.FRONTEND_URL_ALT] : []),
];

// Allow any *.vercel.app preview deployment
const isAllowedOrigin = (origin) =>
  !origin ||
  ALLOWED_ORIGINS.includes(origin) ||
  /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Static uploads ── */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ── Routes ── */
app.use('/api/auth',   authRoutes);
app.use('/api/user',   userRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/public', publicRoutes);

/* ── Health check ── */
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* ── Global error handler ── */
app.use((err, req, res, _next) => {
  console.error('❌ Server error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Gridminer API running on http://0.0.0.0:${PORT}`);
});
