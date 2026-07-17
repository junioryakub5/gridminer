import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cloudmining_jwt_secret_2026_change_in_production';

export const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Re-fetch user from DB on every request (catches deactivated accounts)
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive or not found' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const signToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};
